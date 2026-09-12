import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")

    def test_state_endpoint(self):
        response = self.client.get("/api/state")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("state", data)
        self.assertIn("metrics", data)

    def test_step_and_crisis_endpoint(self):
        step_res = self.client.post("/api/simulation/step")
        self.assertEqual(step_res.status_code, 200)
        crisis_res = self.client.post("/api/simulation/trigger-crisis")
        self.assertEqual(crisis_res.status_code, 200)

    def test_compare_endpoint(self):
        comp_res = self.client.get("/api/simulation/compare?scenario=cloud_cover_peak")
        self.assertEqual(comp_res.status_code, 200)
        data = comp_res.json()
        self.assertIn("comparison", data)
        self.assertIn("chart_data", data)
        comp = data["comparison"]
        self.assertIn("baseline", comp)
        self.assertIn("gridmind", comp)
        self.assertIn("cost_savings_pct", comp)

    def test_override_and_decision_summary(self):
        # Test override
        override_res = self.client.post("/api/simulation/override", json={
            "solar_kw": 5.0,
            "battery_soc_pct": 20.0,
            "demand_kw": 60.0
        })
        self.assertEqual(override_res.status_code, 200)
        data = override_res.json()
        self.assertEqual(data["status"], "OVERRIDE_APPLIED")
        self.assertIn("current_decision", data)
        self.assertIn("why_points", data)
        self.assertAlmostEqual(data["state"]["solar_total_kw"], 5.0, delta=0.5)

        # Test decision-summary
        summary_res = self.client.get("/api/simulation/decision-summary")
        self.assertEqual(summary_res.status_code, 200)
        summary_data = summary_res.json()
        self.assertIn("battery_action", summary_data)
        self.assertIn("grid_action", summary_data)
        self.assertIn("why_points", summary_data)

        # Reset overrides
        reset_res = self.client.post("/api/simulation/override", json={"reset_overrides": True})
        self.assertEqual(reset_res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
