import unittest
from backend.app.safety.validator import SafetyValidator
from backend.app.simulation.models import BatteryState, HouseholdState, EVState

class TestSafetyValidator(unittest.TestCase):
    def test_battery_discharge_reserve_lock(self):
        batt = BatteryState(soc_pct=25.0, min_reserve_soc_pct=25.0, capacity_kwh=100.0, max_discharge_kw=30.0)
        res = SafetyValidator.validate_battery_dispatch(requested_power_kw=15.0, battery=batt)
        self.assertFalse(res.is_valid)
        self.assertEqual(res.sanitized_value, 0.0)

    def test_battery_inverter_limit(self):
        batt = BatteryState(soc_pct=80.0, min_reserve_soc_pct=20.0, max_discharge_kw=30.0)
        res = SafetyValidator.validate_battery_dispatch(requested_power_kw=50.0, battery=batt)
        self.assertFalse(res.is_valid)
        self.assertEqual(res.sanitized_value, 30.0)

    def test_load_shedding_protects_critical_load(self):
        house = HouseholdState(
            house_id="H1",
            name="Test House",
            base_load_kw=3.0,
            flexible_load_kw=2.0,
            critical_load_kw=1.5,
            max_price_kwh=10.0
        )
        # Attempt to shed 4 kW when flexible load is only 2 kW
        res = SafetyValidator.validate_load_shedding(house, requested_reduction_kw=4.0, current_flexible_kw=2.0)
        self.assertFalse(res.is_valid)
        self.assertEqual(res.sanitized_value, 2.0)

    def test_ev_delay_deadline_enforcement(self):
        ev = EVState(
            ev_id="EV1",
            owner_id="H1",
            capacity_kwh=60.0,
            current_soc_pct=30.0,
            target_soc_pct=80.0,
            charge_power_kw=7.2,
            arrival_step=70,
            deadline_step=75  # Only 5 steps left, need ~18 steps to charge
        )
        # Delaying at step 72 should be rejected because deadline is imminent
        res = SafetyValidator.validate_ev_delay(ev, current_step=72, delay_requested=True)
        self.assertFalse(res.is_valid)
        self.assertEqual(res.sanitized_value, False)

if __name__ == "__main__":
    unittest.main()
