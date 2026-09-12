from __future__ import annotations
from typing import List, Dict, Tuple
from .simulator import MicrogridSimulator
from .models import SimulationMetrics, SimulationComparison, GridState

class BaselineSimulator:
    """
    Executes Mode A (Baseline):
    - EVs charge immediately upon arrival (no coordination or delay)
    - Battery operates on a naive reactive threshold (does not anticipate evening peak, no pre-discharging)
    - Zero P2P energy trading (all surplus exported to grid at low feed-in tariff)
    - Zero household flexible load shifting (all appliances run at will)
    """
    def __init__(self, scenario_name: str = "cloud_cover_peak"):
        self.scenario_name = scenario_name

    def run_full_simulation(self) -> Tuple[SimulationMetrics, List[GridState]]:
        sim = MicrogridSimulator(self.scenario_name)
        states: List[GridState] = []

        for step in range(sim.total_steps):
            # Naive baseline battery logic:
            # If current solar > local household base load by 20 kW, charge battery reactively.
            # If deficit, naive battery only discharges if SOC > 80% (fails to assist during evening peak).
            batt_action = 0.0
            irradiance, _ = sim.calculate_solar_irradiance(step)
            load_mult = sim.calculate_household_base_profile(step)
            rough_solar = sum(p.capacity_kw for p in sim.solar_producers) * (irradiance / 1000.0)
            rough_load = sum(h.base_load_kw + h.flexible_load_kw for h in sim.households) * load_mult

            if rough_solar > rough_load + 15.0 and sim.battery.soc_pct < 95.0:
                batt_action = -15.0  # Naive reactive charging
            elif rough_load > rough_solar and sim.battery.soc_pct > 80.0:
                batt_action = 5.0   # Weak reactive discharge, stopping at 80%

            # In baseline, no EV delays and no flexible load reductions
            state = sim.apply_simulation_step(
                battery_action_kw=batt_action,
                flexible_load_reductions=None,
                ev_charging_overrides=None,
                p2p_trades_this_step=[]
            )
            states.append(state)

        metrics = sim.get_metrics(mode="BASELINE")
        return metrics, states

def compare_metrics(baseline: SimulationMetrics, gridmind: SimulationMetrics) -> SimulationComparison:
    peak_red_pct = 0.0
    if baseline.peak_grid_demand_kw > 0:
        peak_red_pct = ((baseline.peak_grid_demand_kw - gridmind.peak_grid_demand_kw) / baseline.peak_grid_demand_kw) * 100.0

    import_red_pct = 0.0
    if baseline.total_grid_import_kwh > 0:
        import_red_pct = ((baseline.total_grid_import_kwh - gridmind.total_grid_import_kwh) / baseline.total_grid_import_kwh) * 100.0

    cost_sav_pct = 0.0
    if baseline.total_cost > 0:
        cost_sav_pct = ((baseline.total_cost - gridmind.total_cost) / baseline.total_cost) * 100.0

    co2_red_pct = 0.0
    if baseline.estimated_co2_kg > 0:
        co2_red_pct = ((baseline.estimated_co2_kg - gridmind.estimated_co2_kg) / baseline.estimated_co2_kg) * 100.0

    ren_imp_pct = gridmind.renewable_utilization_pct - baseline.renewable_utilization_pct
    violations_avoided = max(0, baseline.grid_violations_count - gridmind.grid_violations_count)

    return SimulationComparison(
        baseline=baseline,
        gridmind=gridmind,
        peak_demand_reduction_pct=round(peak_red_pct, 1),
        grid_import_reduction_pct=round(import_red_pct, 1),
        cost_savings_pct=round(cost_sav_pct, 1),
        co2_reduction_pct=round(co2_red_pct, 1),
        renewable_utilization_improvement_pct=round(ren_imp_pct, 1),
        p2p_volume_traded_kwh=round(gridmind.p2p_energy_traded_kwh, 2),
        violations_avoided=violations_avoided
    )
