import unittest
from backend.app.simulation.simulator import MicrogridSimulator
from backend.app.simulation.baseline import BaselineSimulator, compare_metrics
from backend.app.agents.orchestrator import MultiAgentOrchestrator

class TestScenariosAndComparison(unittest.TestCase):
    def test_baseline_vs_gridmind_cloud_cover_peak(self):
        scenario = "cloud_cover_peak"

        # 1. Run Baseline Mode
        baseline_sim = BaselineSimulator(scenario)
        base_metrics, base_states = baseline_sim.run_full_simulation()

        # 2. Run GridMind Multi-Agent Mode
        gridmind_sim = MicrogridSimulator(scenario)
        orchestrator = MultiAgentOrchestrator(gridmind_sim)

        for _ in range(gridmind_sim.total_steps):
            orchestrator.step()

        gridmind_metrics = gridmind_sim.get_metrics(mode="GRIDMIND")

        # 3. Compare metrics
        comparison = compare_metrics(base_metrics, gridmind_metrics)

        # Baseline should have higher peak demand or higher cost or violations
        self.assertGreaterEqual(comparison.cost_savings_pct, 0.0)
        self.assertGreater(gridmind_metrics.p2p_energy_traded_kwh, 0.0, "GridMind must trade P2P energy")
        # GridMind should prevent or reduce grid violations
        self.assertLessEqual(gridmind_metrics.grid_violations_count, base_metrics.grid_violations_count)

if __name__ == "__main__":
    unittest.main()
