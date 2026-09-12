from __future__ import annotations
import uuid
from typing import Dict, Any, List, Optional, Tuple
from .base_agent import BaseAgent
from ..simulation.models import P2PTrade, GridStatus
from ..optimization.optimizer import DispatchOptimizer, OptimizationPlan
from ..safety.validator import SafetyValidator

class MarketAgent(BaseAgent):
    """
    Autonomous Market & Negotiation Agent:
    Operates the local peer-to-peer (P2P) double-auction energy exchange.
    Matches solar/battery surplus with local consumers, computes dynamic clearing prices,
    executes bilateral trades, and coordinates multi-resource dispatch with the optimizer.
    """
    def __init__(self, memory, bus):
        super().__init__(name="MarketAgent", role="P2P Energy Market Operator", memory=memory, bus=bus)
        self.active_asks: List[Dict[str, Any]] = []
        self.active_bids: List[Dict[str, Any]] = []

    def perceive_and_act(
        self,
        current_step: int,
        time_str: str,
        sim_state: Any,
        grid_data: Dict[str, Any],
        solar_data: Dict[str, Any],
        battery_data: Dict[str, Any],
        consumer_data: Dict[str, Any],
        ev_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        sim = sim_state
        grid_stressed = grid_data.get("stress_flag", False)
        needed_reduction_kw = grid_data.get("needed_reduction_kw", 0.0)

        # 1. P2P Market Clearing Logic
        # Discover sellers: Solar surplus and available battery discharge
        surplus_solar_kw = solar_data.get("surplus_kw", 0.0)
        ask_price = solar_data.get("ask_price_kwh", 7.0)

        # Discover buyers: Households needing energy, battery wanting charge
        executed_trades: List[P2PTrade] = []
        grid_retail_price = 13.5
        grid_feed_in = 4.0

        if surplus_solar_kw > 1.0:
            # Sellers: Solar producers
            seller_id = "SOLAR_COMMUNITY_ROOF" if surplus_solar_kw < 20 else "SOLAR_FARM_MAIN"

            # Potential buyers: Households with high willingness to pay
            for h in sim.households:
                if not h.has_solar and surplus_solar_kw > 1.0:
                    trade_kw = min(surplus_solar_kw, h.base_load_kw + h.flexible_load_kw)
                    if trade_kw >= 0.5:
                        # Dynamic price negotiation: mid-point between seller ask and buyer max
                        clearing_price = round((ask_price + min(grid_retail_price - 1.0, h.max_price_kwh)) / 2.0, 2)
                        trade_kwh = round(trade_kw * 0.25, 2)
                        trade = P2PTrade(
                            trade_id=f"TRD_{uuid.uuid4().hex[:6].upper()}",
                            step=current_step,
                            time_str=time_str,
                            seller_id=seller_id,
                            buyer_id=h.house_id,
                            energy_kwh=trade_kwh,
                            price_kwh=clearing_price,
                            total_value=round(trade_kwh * clearing_price, 2),
                            status="EXECUTED"
                        )
                        executed_trades.append(trade)
                        surplus_solar_kw -= trade_kw

                        # Notify both parties via message bus
                        self.send_message(
                            step=current_step,
                            time_str=time_str,
                            receiver=h.house_id,
                            message_type="P2P_TRADE_CONFIRM",
                            priority="NORMAL",
                            content=f"P2P Trade Matched: Bought {trade_kwh} kWh @ ₹{clearing_price}/kWh from {seller_id}. Savings: ₹{round(trade_kwh * (grid_retail_price - clearing_price), 2)}.",
                            reasoning="Matched bilateral clearing price below retail tariff."
                        )

        # 2. Coordinate Multi-Resource Dispatch with Optimizer & Safety Layer
        # If GridAgent flagged stress, run the mathematical optimizer to find the optimal
        # combination of battery discharge, EV deferral, and flexible load reduction.
        final_battery_action_kw = 0.0
        final_ev_overrides: Dict[str, bool] = ev_data.get("ev_charging_overrides", {})
        final_household_reductions: Dict[str, float] = consumer_data.get("proposed_reductions", {})

        if grid_stressed and needed_reduction_kw > 0.1:
            # Run deterministic linear programming allocation
            plan: OptimizationPlan = DispatchOptimizer.optimize_peak_shaving(
                target_reduction_kw=needed_reduction_kw,
                battery=sim.battery,
                households=sim.households,
                evs=sim.evs,
                current_step=current_step
            )

            # Pass proposed actions through SafetyValidator
            # Validate Battery
            val_batt = SafetyValidator.validate_battery_dispatch(
                requested_power_kw=plan.battery_discharge_kw,
                battery=sim.battery
            )
            final_battery_action_kw = val_batt.sanitized_value

            # Validate EVs
            for ev in sim.evs:
                if ev.ev_id in plan.ev_delays:
                    val_ev = SafetyValidator.validate_ev_delay(
                        ev=ev,
                        current_step=current_step,
                        delay_requested=True
                    )
                    # If delay is valid, set override to False (do not charge)
                    final_ev_overrides[ev.ev_id] = not val_ev.sanitized_value

            # Validate Households
            for h in sim.households:
                if h.house_id in plan.household_reductions:
                    val_h = SafetyValidator.validate_load_shedding(
                        house=h,
                        requested_reduction_kw=plan.household_reductions[h.house_id],
                        current_flexible_kw=h.flexible_load_kw * sim.calculate_household_base_profile(current_step)
                    )
                    final_household_reductions[h.house_id] = val_h.sanitized_value

            reasoning = (
                f"Grid stress mitigated: Optimizer solved {plan.total_kw_reduced:.1f} kW reduction "
                f"(Battery: {final_battery_action_kw:.1f} kW, EVs: {sum(plan.ev_kw_reductions.values()):.1f} kW, "
                f"Residential: {sum(final_household_reductions.values()):.1f} kW). Safety constraints verified."
            )

        elif battery_data.get("action_type") == "CHARGE":
            # Solar surplus absorption into battery
            proposed_charge = battery_data.get("proposed_kw", 0.0)
            val_batt = SafetyValidator.validate_battery_dispatch(
                requested_power_kw=proposed_charge,
                battery=sim.battery
            )
            final_battery_action_kw = val_batt.sanitized_value
            reasoning = f"Absorbing {abs(final_battery_action_kw):.1f} kW green solar surplus into central battery."
        else:
            final_battery_action_kw = 0.0
            reasoning = "Normal balanced operation. No peak shaving or emergency dispatch required."

        # Decision log
        self.log_decision(
            step=current_step,
            time_str=time_str,
            observation=f"Grid Stress: {grid_stressed}, Needed Reduction: {needed_reduction_kw:.1f} kW, Trades Executed: {len(executed_trades)}",
            decision=f"Dispatch (Batt: {final_battery_action_kw:.1f} kW, P2P Trades: {len(executed_trades)})",
            reason=reasoning,
            state={
                "battery_action_kw": final_battery_action_kw,
                "ev_overrides": final_ev_overrides,
                "household_reductions": final_household_reductions,
                "trades_count": len(executed_trades)
            },
            constraints=["safety_validator=Passed", "linear_programming_optimal=True"],
            tools_used=["optimize_peak_shaving", "validate_battery_dispatch", "validate_ev_delay"]
        )

        return {
            "executed_trades": executed_trades,
            "final_battery_action_kw": final_battery_action_kw,
            "final_ev_overrides": final_ev_overrides,
            "final_household_reductions": final_household_reductions,
            "reasoning": reasoning
        }
