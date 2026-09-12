from __future__ import annotations
from typing import Dict, Any, List, Tuple
from .base_agent import BaseAgent
from ..simulation.models import GridState, WeatherCondition
from ..tools.tool_registry import tools

class ForecastAgent(BaseAgent):
    """
    Autonomous Forecast Agent:
    Predicts solar generation, household consumption, and EV load over 15, 30, and 60 minute horizons.
    Detects impending deficits and issues early-warning alerts across the agent network.
    """
    def __init__(self, memory, bus):
        super().__init__(name="ForecastAgent", role="Grid & Weather Forecaster", memory=memory, bus=bus)

    def perceive_and_act(self, current_step: int, time_str: str, sim_state: Any) -> Dict[str, Any]:
        sim = sim_state  # MicrogridSimulator reference

        # 1. Gather current observations via tools
        current_irradiance, weather = sim.calculate_solar_irradiance(current_step)
        load_mult = sim.calculate_household_base_profile(current_step)

        # 2. Compute forecasts for +15m (1 step), +30m (2 steps), +60m (4 steps)
        horizons = [1, 2, 4]  # +15m, +30m, +60m
        solar_forecasts: Dict[str, float] = {}
        demand_forecasts: Dict[str, float] = {}
        deficit_forecasts: Dict[str, float] = {}

        total_solar_cap = sum(p.capacity_kw for p in sim.solar_producers)
        total_house_base = sum(h.base_load_kw + h.flexible_load_kw for h in sim.households)

        for h in horizons:
            f_step = min(sim.total_steps - 1, current_step + h)
            f_min = h * 15
            f_irr, f_w = sim.calculate_solar_irradiance(f_step)
            f_load_mult = sim.calculate_household_base_profile(f_step)

            # Projected solar
            proj_solar = total_solar_cap * (f_irr / 1000.0)

            # Projected demand (households + EV arrivals)
            proj_household = total_house_base * f_load_mult
            proj_ev = 0.0
            for ev in sim.evs:
                if ev.arrival_step <= f_step <= ev.deadline_step and ev.current_soc_pct < ev.target_soc_pct:
                    proj_ev += ev.charge_power_kw

            proj_total_demand = proj_household + proj_ev
            proj_deficit = max(0.0, proj_total_demand - proj_solar)

            key = f"+{f_min}min"
            solar_forecasts[key] = round(proj_solar, 1)
            demand_forecasts[key] = round(proj_total_demand, 1)
            deficit_forecasts[key] = round(proj_deficit, 1)

        # 3. Analyze Trend & Reasoning
        current_solar = round(sum(p.current_gen_kw for p in sim.solar_producers), 1)
        current_demand = round(
            sum(h.base_load_kw + h.flexible_load_kw for h in sim.households) * load_mult, 1
        )

        imbalance_predicted = False
        reasoning = ""
        max_deficit = max(deficit_forecasts.values())

        if deficit_forecasts.get("+30min", 0.0) > 40.0 or max_deficit > 50.0:
            imbalance_predicted = True
            reasoning = (
                f"Severe generation drop predicted within 30-60 min ({weather.value}). "
                f"Projected demand ({demand_forecasts.get('+30min')} kW) severely outpaces solar "
                f"({solar_forecasts.get('+30min')} kW), resulting in a {deficit_forecasts.get('+30min')} kW deficit."
            )
            # Dispatch high-priority advisory to GridHealthAgent and MarketAgent
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="GridAgent",
                message_type="DEFICIT_WARNING",
                priority="HIGH",
                content=f"Deficit warning: Expected deficit {deficit_forecasts.get('+30min')} kW at +30min. Grid overload risk imminent.",
                action_requested="PREPARE_PEAK_MITIGATION",
                reasoning=reasoning
            )
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="MarketAgent",
                message_type="DEMAND_SURGE_ADVISORY",
                priority="HIGH",
                content=f"Demand surge expected (+30m: {demand_forecasts.get('+30min')} kW). Solicit battery and local P2P sellers immediately.",
                action_requested="SOLICIT_FLEXIBILITY",
                reasoning=reasoning
            )
        else:
            reasoning = f"Stable generation-to-load ratio anticipated over next 60 minutes. Max projected deficit: {max_deficit:.1f} kW."
            self.send_message(
                step=current_step,
                time_str=time_str,
                receiver="GridAgent",
                message_type="FORECAST_REPORT",
                priority="NORMAL",
                content=f"Solar forecast: {solar_forecasts.get('+30min', 0.0):.1f} kW | Load forecast: {demand_forecasts.get('+30min', 0.0):.1f} kW. Status stable.",
                action_requested="MONITOR",
                reasoning=reasoning
            )

        # 4. Log Structured Decision
        self.log_decision(
            step=current_step,
            time_str=time_str,
            observation=f"Irradiance {current_irradiance:.0f} W/m2, Solar {current_solar} kW, Demand {current_demand} kW",
            decision="Issue Deficit Warning" if imbalance_predicted else "Forecast Stable",
            reason=reasoning,
            state={
                "solar_forecasts": solar_forecasts,
                "demand_forecasts": demand_forecasts,
                "deficit_forecasts": deficit_forecasts
            },
            constraints=["horizon_window=60m"],
            tools_used=["calculate_solar_irradiance", "calculate_household_base_profile"]
        )

        return {
            "solar_forecasts": solar_forecasts,
            "demand_forecasts": demand_forecasts,
            "deficit_forecasts": deficit_forecasts,
            "imbalance_predicted": imbalance_predicted,
            "reasoning": reasoning
        }
