from __future__ import annotations
from typing import Dict, Any, List
from .base_agent import BaseAgent
from ..simulation.models import HouseholdState

class ConsumerAgent(BaseAgent):
    """
    Autonomous Consumer Aggregator Agent:
    Represents household prosumers and consumers. Offers flexible load shifting
    (e.g., HVAC setback, delayed dishwashers/dryers) in exchange for tariff savings
    or during grid alerts, while strictly protecting critical loads (clinic, refrigeration).
    """
    def __init__(self, memory, bus):
        super().__init__(name="ConsumerAgent", role="Residential Consumer Aggregator", memory=memory, bus=bus)

    def perceive_and_act(
        self,
        current_step: int,
        time_str: str,
        sim_state: Any,
        grid_status_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        sim = sim_state
        grid_stressed = grid_status_data.get("stress_flag", False)
        needed_reduction = grid_status_data.get("needed_reduction_kw", 0.0)
        load_mult = sim.calculate_household_base_profile(current_step)

        # Evaluate available flexible capacity
        total_flexible_kw = 0.0
        household_offers: Dict[str, float] = {}

        for h in sim.households:
            current_flex = h.flexible_load_kw * load_mult
            household_offers[h.house_id] = round(current_flex, 2)
            total_flexible_kw += current_flex

        # If grid is stressed or electricity price is peak, offer flexible reduction
        proposed_reductions: Dict[str, float] = {}
        reasoning = ""

        if grid_stressed and needed_reduction > 0:
            # Shift up to 80% of flexible loads, preserving critical loads 100%
            shift_ratio = min(0.85, (needed_reduction * 0.4) / max(0.1, total_flexible_kw))
            for h_id, flex_kw in household_offers.items():
                reduction = round(flex_kw * shift_ratio, 2)
                if reduction > 0.05:
                    proposed_reductions[h_id] = reduction

            total_reduced = sum(proposed_reductions.values())
            reasoning = (
                f"Grid stress response: Shifting {total_reduced:.1f} kW of non-critical residential loads "
                f"(HVAC cycle, laundry). All medical and refrigeration critical loads safeguarded."
            )
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="DEMAND_RESPONSE_OFFER",
                priority="HIGH",
                content=f"Demand Response: {total_reduced:.1f} kW flexible load shed available.",
                action_requested="CONFIRM_DEMAND_RESPONSE",
                reasoning=reasoning
            )
        else:
            reasoning = f"Normal grid conditions. Full residential appliance convenience maintained (Flexible load: {total_flexible_kw:.1f} kW)."
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="DEMAND_STATUS",
                priority="NORMAL",
                content=f"10 households active. 0 kW shifted. Total flexible load: {total_flexible_kw:.1f} kW.",
                reasoning=reasoning
            )

        self.log_decision(
            step=current_step,
            time_str=time_str,
            observation=f"Grid Stressed: {grid_stressed}, Total Flexible Load Available: {total_flexible_kw:.1f} kW",
            decision=f"Shift {sum(proposed_reductions.values()):.1f} kW" if proposed_reductions else "Full Normal Comfort",
            reason=reasoning,
            state={
                "total_flexible_available_kw": round(total_flexible_kw, 2),
                "proposed_reductions": proposed_reductions
            },
            constraints=["critical_loads_immutable=True", "max_curtailment_pct=85%"]
        )

        return {
            "total_flexible_kw": round(total_flexible_kw, 2),
            "proposed_reductions": proposed_reductions,
            "reasoning": reasoning
        }
