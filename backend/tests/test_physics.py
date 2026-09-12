import unittest
from backend.app.simulation.simulator import MicrogridSimulator
from backend.app.simulation.models import GridStatus

class TestPhysicsSimulation(unittest.TestCase):
    def setUp(self):
        self.sim = MicrogridSimulator("normal_day")

    def test_energy_conservation_balance(self):
        """Verify that Total Supply = Total Demand exactly at every step."""
        for _ in range(20):
            state = self.sim.apply_simulation_step()
            # Check supply vs demand conservation
            self.assertLess(state.balance_error_kw, 1e-3, f"Energy balance violated at step {state.step}")
            self.assertEqual(state.total_supply_kw, state.total_demand_kw)

    def test_battery_soc_limits(self):
        """Verify that battery SOC stays within [min_reserve, 100%]."""
        # Attempt massive discharge exceeding capacity
        self.sim.battery.soc_pct = 26.0
        self.sim.battery.min_reserve_soc_pct = 25.0
        state = self.sim.apply_simulation_step(battery_action_kw=50.0)
        self.assertGreaterEqual(self.sim.battery.soc_pct, 25.0)

    def test_grid_status_classification(self):
        """Check transformer load percentage calculation and status threshold."""
        # Normal step
        state = self.sim.apply_simulation_step()
        if state.transformer_load_pct < 80.0:
            self.assertEqual(state.status, GridStatus.NORMAL)
        elif state.transformer_load_pct < 95.0:
            self.assertEqual(state.status, GridStatus.WARNING)
        else:
            self.assertEqual(state.status, GridStatus.CRITICAL)

if __name__ == "__main__":
    unittest.main()
