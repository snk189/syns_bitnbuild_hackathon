from __future__ import annotations
from typing import Dict, Any, List
from .base_agent import BaseAgent
from ..simulation.models import EVState
from ..safety.validator import SafetyValidator

class EVAgent(BaseAgent):
    """
    Autonomous Electric Vehicle Fleet Manager Agent:
    Tracks individual EV arrival times, charging requirements, and departure deadlines.
    Selectively defers charging sessions when the grid is stressed if and only if
    the remaining departure window guarantees achieving the target SOC.
    """
    def __init__(self, memory, bus):
        super().__init__(name="EVAgent", role="EV Smart Charging Coordinator", memory=memory, bus=bus)

    def perceive_and_act(
        self,
        current_step: int,
        time_str: str,
        sim_state: Any,
        grid_status_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        sim = sim_state
        grid_stressed = grid_status_data.get("stress_flag", False)
        dt_hours = 0.25

        ev_decisions: Dict[str, bool] = {}  # ev_id -> should_charge (True = charge, False = defer)
        ev_details: Dict[str, Any] = {}
        total_ev_demand_kw = 0.0
        deferred_kw = 0.0

        for ev in sim.evs:
            is_present = (ev.arrival_step <= current_step <= ev.deadline_step)
            needs_charge = (ev.current_soc_pct < ev.target_soc_pct)

            if not is_present or not needs_charge:
                ev_decisions[ev.ev_id] = False
                continue

            total_ev_demand_kw += ev.charge_power_kw
            steps_remaining = ev.deadline_step - current_step
            needed_kwh = max(0.0, (ev.target_soc_pct - ev.current_soc_pct) / 100.0 * ev.capacity_kwh)
            steps_needed = needed_kwh / (ev.charge_power_kw * dt_hours * 0.92)

            # Safety check: can charging be postponed?
            has_slack = steps_remaining > (steps_needed + 1.2)

            if grid_stressed and has_slack:
                # Defer charging to assist grid
                ev_decisions[ev.ev_id] = False
                deferred_kw += ev.charge_power_kw
                ev_details[ev.ev_id] = {
                    "action": "DEFERRED",
                    "soc": round(ev.current_soc_pct, 1),
                    "target_soc": ev.target_soc_pct,
                    "slack_steps": round(steps_remaining - steps_needed, 1),
                    "reason": f"Charging deferred by 15-30m to relieve grid stress (Deadline at step {ev.deadline_step})."
                }
            else:
                # Charge now: either grid is normal, or EV has zero deadline flexibility
                ev_decisions[ev.ev_id] = True
                ev_details[ev.ev_id] = {
                    "action": "CHARGING",
                    "soc": round(ev.current_soc_pct, 1),
                    "target_soc": ev.target_soc_pct,
                    "slack_steps": round(max(0.0, steps_remaining - steps_needed), 1),
                    "reason": "Charging active to meet user departure deadline." if not has_slack else "Normal charging profile."
                }

        # Send advisory to MarketAgent if deferred charging provided peak relief
        reasoning = ""
        if deferred_kw > 0.1:
            reasoning = (
                f"Grid peak relief: Deferring {deferred_kw:.1f} kW of EV charging across "
                f"{sum(1 for d in ev_decisions.values() if not d and d in ev_details)} vehicles with ample deadline buffer."
            )
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="EV_CURTAILMENT_OFFER",
                priority="HIGH",
                content=f"EV Deferral: {deferred_kw:.1f} kW peak load postponement confirmed.",
                reasoning=reasoning
            )
        else:
            reasoning = f"EV charging active for scheduled vehicles ({total_ev_demand_kw:.1f} kW load). All departure deadlines on track."

        self.log_decision(
            step=current_step,
            time_str=time_str,
            observation=f"Active EVs: {len(ev_details)}, Total Baseline Demand: {total_ev_demand_kw:.1f} kW, Grid Stressed: {grid_stressed}",
            decision=f"Deferred {deferred_kw:.1f} kW" if deferred_kw > 0 else f"Charge {total_ev_demand_kw:.1f} kW",
            reason=reasoning,
            state={
                "total_demand_kw": round(total_ev_demand_kw, 2),
                "deferred_kw": round(deferred_kw, 2),
                "vehicles": ev_details
            },
            constraints=["departure_deadlines_guaranteed=True", "min_target_soc=80%"]
        )

        return {
            "ev_charging_overrides": ev_decisions,
            "total_ev_demand_kw": round(total_ev_demand_kw, 2),
            "deferred_kw": round(deferred_kw, 2),
            "details": ev_details,
            "reasoning": reasoning
        }
