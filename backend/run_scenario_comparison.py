"""
GRIDMIND CLI Scenario Comparison Runner
Runs Baseline vs GridMind Multi-Agent simulation for a chosen scenario and outputs calculated metrics.
"""
import sys
import os
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.app.simulation.simulator import MicrogridSimulator
from backend.app.simulation.baseline import BaselineSimulator, compare_metrics
from backend.app.agents.orchestrator import MultiAgentOrchestrator

def run_comparison(scenario_name: str = "cloud_cover_peak"):
    print(f"\n========================================================")
    print(f"  GRIDMIND SIMULATION: SCENARIO '{scenario_name.upper()}'")
    print(f"========================================================\n")

    # 1. Run Mode A: Baseline
    print("[1/2] Running Mode A: Baseline (Naive Uncoordinated Rules)...")
    base_runner = BaselineSimulator(scenario_name)
    base_metrics, base_states = base_runner.run_full_simulation()
    print("      Baseline completed: 96 intervals simulated.")

    # 2. Run Mode B: GridMind
    print("\n[2/2] Running Mode B: GridMind (Autonomous Multi-Agent System)...")
    gm_sim = MicrogridSimulator(scenario_name)
    gm_orch = MultiAgentOrchestrator(gm_sim)
    for _ in range(gm_sim.total_steps):
        gm_orch.step()
    gm_metrics = gm_sim.get_metrics(mode="GRIDMIND")
    print("      GridMind completed: 96 intervals simulated.")

    # 3. Calculate metrics
    comp = compare_metrics(base_metrics, gm_metrics)

    print("\n==========================================================================")
    print("                  ACTUAL SIMULATED COMPARISON METRICS                     ")
    print("==========================================================================")
    print(f"{'Metric':<35} | {'Baseline':<16} | {'GridMind':<16} | {'Improvement':<12}")
    print("-" * 88)
    print(f"{'Peak Grid Demand (kW)':<35} | {base_metrics.peak_grid_demand_kw:<16.1f} | {gm_metrics.peak_grid_demand_kw:<16.1f} | -{comp.peak_demand_reduction_pct:.1f}%")
    print(f"{'Total Grid Import (kWh)':<35} | {base_metrics.total_grid_import_kwh:<16.1f} | {gm_metrics.total_grid_import_kwh:<16.1f} | -{comp.grid_import_reduction_pct:.1f}%")
    print(f"{'Total Electricity Cost (₹)':<35} | ₹{base_metrics.total_cost:<15.1f} | ₹{gm_metrics.total_cost:<15.1f} | -{comp.cost_savings_pct:.1f}%")
    print(f"{'Renewable Utilization (%)':<35} | {base_metrics.renewable_utilization_pct:<16.1f} | {gm_metrics.renewable_utilization_pct:<16.1f} | +{comp.renewable_utilization_improvement_pct:.1f}%")
    print(f"{'P2P Energy Traded (kWh)':<35} | {base_metrics.p2p_energy_traded_kwh:<16.1f} | {gm_metrics.p2p_energy_traded_kwh:<16.1f} | {gm_metrics.p2p_trade_count} trades")
    print(f"{'Grid Transformer Violations':<35} | {base_metrics.grid_violations_count:<16} | {gm_metrics.grid_violations_count:<16} | {comp.violations_avoided} avoided")
    print(f"{'Flexible Loads Shifted':<35} | {base_metrics.flexible_loads_shifted_count:<16} | {gm_metrics.flexible_loads_shifted_count:<16} | {gm_metrics.flexible_loads_shifted_count} shifts")
    print(f"{'Estimated CO2 Emissions (kg)':<35} | {base_metrics.estimated_co2_kg:<16.1f} | {gm_metrics.estimated_co2_kg:<16.1f} | -{comp.co2_reduction_pct:.1f}%")
    print("==========================================================================\n")

if __name__ == "__main__":
    scenario = sys.argv[1] if len(sys.argv) > 1 else "cloud_cover_peak"
    run_comparison(scenario)
