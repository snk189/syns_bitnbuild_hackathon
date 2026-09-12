import unittest
from backend.app.simulation.simulator import MicrogridSimulator
from backend.app.agents.what_if_planner import WhatIfPlanningAgent

class TestWhatIfPlanningAgent(unittest.TestCase):
    def setUp(self):
        self.sim = MicrogridSimulator(scenario_name="cloud_cover_peak")
        self.planner = WhatIfPlanningAgent()

    def test_evaluate_cloud_drop(self):
        result = self.planner.evaluate(self.sim, scenario_id="cloud_drop", horizon_minutes=30)
        self.assertEqual(len(result.strategies), 4)
        self.assertEqual(result.recommended_strategy_id, "strat_gridmind_consensus")
        self.assertGreater(len(result.agent_debate), 4)
        self.assertGreater(len(result.decision_chain), 4)
        self.assertIn("battery_action_kw", result.executable_action)

    def test_evaluate_heatwave_surge(self):
        result = self.planner.evaluate(self.sim, scenario_id="heatwave_surge", horizon_minutes=30)
        self.assertEqual(len(result.strategies), 4)
        opt_strat = next(s for s in result.strategies if s.id == "strat_gridmind_consensus")
        self.assertEqual(opt_strat.status, "OPTIMAL")

    def test_strategy_comparison_validity(self):
        result = self.planner.evaluate(self.sim, scenario_id="transformer_derating", horizon_minutes=30)
        # Optimal strategy should have lower cost or zero overload risk compared to grid-only
        s1 = next(s for s in result.strategies if s.id == "strat_grid_only")
        s4 = next(s for s in result.strategies if s.id == "strat_gridmind_consensus")
        self.assertEqual(s4.overload_risk, "NONE")

if __name__ == "__main__":
    unittest.main()
