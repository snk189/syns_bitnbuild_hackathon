from __future__ import annotations
from typing import Dict, Any, List, Optional
from .base_agent import BaseAgent
from ..simulation.models import BatteryState

class BatteryAgent(BaseAgent):
    """
    Autonomous Central Battery Storage Agent:
    Preserves reserve thresholds, absorbs solar surplus during cheap midday hours,
    and supplies emergency dispatch to prevent grid transformer violations.
    """
    def __init__(self, memory, bus):
        super().__init__(name="BatteryAgent", role="Energy Storage Operator", memory=memory, bus=bus)

    def perceive_and_act(
        self,
        current_step: int,
        time_str: str,
        sim_state: Any,
        grid_status_data: Dict[str, Any],
        solar_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        sim = sim_state
        batt: BatteryState = sim.battery
        dt_hours = 0.25

        surplus_kw = solar_data.get("surplus_kw", 0.0)
        grid_stressed = grid_status_data.get("stress_flag", False)
        needed_reduction_kw = grid_status_data.get("needed_reduction_kw", 0.0)

        # 1. Evaluate usable capacity and reserve margin
        headroom_kwh = max(0.0, (100.0 - batt.soc_pct) / 100.0 * batt.capacity_kwh)
        max_possible_charge_kw = min(batt.max_charge_kw, headroom_kwh / dt_hours)

        usable_energy_kwh = max(0.0, (batt.soc_pct - batt.min_reserve_soc_pct) / 100.0 * batt.capacity_kwh)
        max_possible_discharge_kw = min(batt.max_discharge_kw, usable_energy_kwh / dt_hours)

        # 2. Autonomous Decision Logic
        action_type = "IDLE"
        proposed_kw = 0.0
        reasoning = ""

        # Case A: Low SOC near or below reserve
        if batt.soc_pct <= batt.min_reserve_soc_pct + 1.0:
            action_type = "PRESERVE_RESERVE"
            proposed_kw = 0.0
            reasoning = (
                f"Battery SOC is {batt.soc_pct:.1f}% (near or below minimum reserve limit {batt.min_reserve_soc_pct}%). "
                f"Strictly refusing discharge to protect battery longevity and emergency reserve."
            )
            # Notify MarketAgent that battery cannot discharge
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="STORAGE_UNAVAILABLE",
                priority="HIGH",
                content=f"Battery SOC at {batt.soc_pct:.1f}%. Reserve lock engaged. 0 kW discharge available.",
                reasoning=reasoning
            )

        # Case B: Grid is under stress and needs reduction
        elif grid_stressed and needed_reduction_kw > 0:
            action_type = "DISCHARGE"
            discharge_target = min(max_possible_discharge_kw, needed_reduction_kw)
            proposed_kw = discharge_target
            reasoning = (
                f"Grid stress alert active! SOC is healthy at {batt.soc_pct:.1f}%. "
                f"Offering {discharge_target:.1f} kW discharge (headroom above reserve: {usable_energy_kwh:.1f} kWh)."
            )
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="DISPATCH_OFFER",
                priority="HIGH",
                content=f"Battery dispatch ready: {discharge_target:.1f} kW available.",
                action_requested="ALLOCATE_DISPATCH",
                reasoning=reasoning
            )

        # Case C: Solar Surplus available and battery has headroom to charge
        elif surplus_kw > 5.0 and batt.soc_pct < 95.0:
            action_type = "CHARGE"
            charge_target = min(max_possible_charge_kw, surplus_kw)
            proposed_kw = -charge_target  # negative means charging
            reasoning = (
                f"Local solar surplus detected ({surplus_kw:.1f} kW). "
                f"Absorbing {charge_target:.1f} kW green energy at SOC {batt.soc_pct:.1f}%."
            )
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="P2P_BID",
                priority="NORMAL",
                content=f"Battery Bid: Absorbing {charge_target:.1f} kW surplus @ ₹6.50/kWh.",
                action_requested="REGISTER_BID",
                reasoning=reasoning
            )

        # Case D: Normal baseline state
        else:
            action_type = "STANDBY"
            proposed_kw = 0.0
            reasoning = f"SOC at {batt.soc_pct:.1f}%. Grid normal, no surplus. Maintaining standby to avoid idle degradation."
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="BATTERY_STANDBY",
                priority="NORMAL",
                content=f"Battery SOC {batt.soc_pct:.1f}%. Usable: {usable_energy_kwh:.1f} kWh. Inverter headroom: {max_possible_discharge_kw:.1f} kW.",
                reasoning=reasoning
            )

        # Decision log
        self.log_decision(
            step=current_step,
            time_str=time_str,
            observation=f"SOC {batt.soc_pct:.1f}%, Grid Stressed: {grid_stressed}, Needed Reduction: {needed_reduction_kw:.1f} kW, Surplus: {surplus_kw:.1f} kW",
            decision=f"{action_type}: {abs(proposed_kw):.1f} kW",
            reason=reasoning,
            state={
                "soc_pct": round(batt.soc_pct, 1),
                "min_reserve_soc_pct": batt.min_reserve_soc_pct,
                "proposed_kw": round(proposed_kw, 2),
                "cycles": round(batt.cycles, 3)
            },
            constraints=[f"min_reserve={batt.min_reserve_soc_pct}%", f"max_discharge={batt.max_discharge_kw}kW", f"max_charge={batt.max_charge_kw}kW"]
        )

        return {
            "action_type": action_type,
            "proposed_kw": round(proposed_kw, 2),
            "max_possible_discharge_kw": round(max_possible_discharge_kw, 2),
            "reasoning": reasoning
        }
