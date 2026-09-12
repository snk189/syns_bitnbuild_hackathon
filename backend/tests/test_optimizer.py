import unittest
from backend.app.optimization.optimizer import DispatchOptimizer
from backend.app.simulation.models import BatteryState, HouseholdState, EVState

class TestOptimizer(unittest.TestCase):
    def test_linear_programming_allocation(self):
        batt = BatteryState(soc_pct=70.0, min_reserve_soc_pct=25.0, capacity_kwh=100.0, max_discharge_kw=30.0)
        households = [
            HouseholdState(house_id="H1", name="H1", base_load_kw=2.0, flexible_load_kw=3.0, critical_load_kw=1.0, max_price_kwh=10.0),
            HouseholdState(house_id="H2", name="H2", base_load_kw=2.0, flexible_load_kw=2.0, critical_load_kw=1.0, max_price_kwh=10.0)
        ]
        evs = [
            EVState(ev_id="EV1", owner_id="H1", capacity_kwh=60.0, current_soc_pct=40.0, target_soc_pct=80.0, charge_power_kw=7.2, arrival_step=70, deadline_step=95)
        ]

        # Request 15 kW reduction
        plan = DispatchOptimizer.optimize_peak_shaving(
            target_reduction_kw=15.0,
            battery=batt,
            households=households,
            evs=evs,
            current_step=72
        )

        self.assertTrue(plan.success)
        self.assertAlmostEqual(plan.total_kw_reduced, 15.0, delta=0.2)
        # Battery should be the cheapest resource
        self.assertGreater(plan.battery_discharge_kw, 0.0)

if __name__ == "__main__":
    unittest.main()
