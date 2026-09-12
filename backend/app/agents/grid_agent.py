from __future__ import annotations
from typing import Dict, Any, List
from .base_agent import BaseAgent
from ..simulation.models import GridStatus

class GridAgent(BaseAgent):
    """
    Autonomous Grid Health Agent:
    Monitors transformer capacity, voltage, frequency, and upcoming overload risks.
    Interprets forecast warnings, raises alerts, and coordinates mitigation with MarketAgent.
    """
    def __init__(self, memory, bus):
        super().__init__(name="GridAgent", role="Distribution Grid Guardian", memory=memory, bus=bus)

    def perceive_and_act(
        self,
        current_step: int,
        time_str: str,
        sim_state: Any,
        forecast_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        sim = sim_state
        trans_cap = sim.scenario.transformer_capacity_kw

        # Read latest step from sim history or current preliminary estimate
        latest_history = sim.history[-1] if sim.history else None
        current_load_pct = latest_history.transformer_load_pct if latest_history else 50.0

        # Process forecasts to predict future transformer loading
        deficit_30m = forecast_data.get("deficit_forecasts", {}).get("+30min", 0.0)
        predicted_transformer_kw = deficit_30m
        predicted_load_pct = (predicted_transformer_kw / trans_cap) * 100.0

        # Assess condition
        status = GridStatus.NORMAL
        stress_flag = False
        reasoning = ""
        action_requested = None

        if current_load_pct >= 95.0 or predicted_load_pct >= 95.0:
            status = GridStatus.CRITICAL
            stress_flag = True
            needed_reduction = max(0.0, predicted_transformer_kw - (trans_cap * 0.82))
            reasoning = (
                f"CRITICAL OVERLOAD RISK: Projected transformer loading {predicted_load_pct:.1f}% "
                f"exceeds safe threshold (limit {trans_cap:.0f} kW). Immediate dispatch of {needed_reduction:.1f} kW flexibility required."
            )
            action_requested = "EMERGENCY_PEAK_SHAVING"
            # Send message to MarketAgent
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="GRID_STRESS_ALERT",
                priority="EMERGENCY",
                content=f"Grid in CRITICAL stress. Urgent load reduction needed: {needed_reduction:.1f} kW.",
                action_requested=action_requested,
                reasoning=reasoning
            )

        elif current_load_pct >= 80.0 or predicted_load_pct >= 80.0:
            status = GridStatus.WARNING
            stress_flag = True
            needed_reduction = max(0.0, predicted_transformer_kw - (trans_cap * 0.78))
            reasoning = (
                f"WARNING: Transformer loading elevated at {predicted_load_pct:.1f}%. "
                f"Pre-emptive peak shaving of {needed_reduction:.1f} kW requested to avoid violation."
            )
            action_requested = "PREEMPTIVE_PEAK_SHAVING"
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="GRID_WARNING",
                priority="HIGH",
                content=f"Grid approaching capacity. Shave {needed_reduction:.1f} kW.",
                action_requested=action_requested,
                reasoning=reasoning
            )
        else:
            status = GridStatus.NORMAL
            needed_reduction = 0.0
            reasoning = f"Grid within normal operating limits (Transformer loading {predicted_load_pct:.1f}%)."

        # Decision log
        self.log_decision(
            step=current_step,
            time_str=time_str,
            observation=f"Current Load {current_load_pct:.1f}%, Predicted +30m Deficit {deficit_30m:.1f} kW ({predicted_load_pct:.1f}%)",
            decision=f"Status -> {status.value}" + (f", Request {needed_reduction:.1f} kW cut" if stress_flag else ""),
            reason=reasoning,
            state={
                "status": status.value,
                "current_load_pct": current_load_pct,
                "predicted_load_pct": round(predicted_load_pct, 1),
                "needed_reduction_kw": round(needed_reduction, 1)
            },
            constraints=[f"transformer_max_kw={trans_cap}", "safe_threshold_pct=80%"]
        )

        return {
            "status": status,
            "stress_flag": stress_flag,
            "needed_reduction_kw": round(needed_reduction, 1),
            "predicted_load_pct": round(predicted_load_pct, 1),
            "reasoning": reasoning
        }
