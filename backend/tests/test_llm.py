import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.llm.llm_service import llm_service

class TestLLMServiceAndEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def tearDown(self):
        llm_service.configure(api_key="", model="gpt-4o-mini")

    def test_llm_status_endpoint(self):
        res = self.client.get("/api/llm/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("configured", data)
        self.assertIn("model", data)
        self.assertIn("provider", data)
        self.assertEqual(data["provider"], "OpenAI")

    def test_llm_configure_endpoint(self):
        res = self.client.post("/api/llm/configure", json={
            "api_key": "test_fake_key_12345678",
            "model": "gpt-4o-mini"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "CONFIGURED")
        self.assertTrue(data["llm_status"]["configured"])

    def test_llm_chat_endpoint(self):
        res = self.client.post("/api/llm/chat", json={
            "message": "Why is the transformer load high at 18:30?",
            "history": []
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("reply", data)
        self.assertIn("suggestions", data)
        self.assertIn("context_summary", data)
        self.assertTrue(len(data["reply"]) > 20)

    def test_llm_explain_endpoint(self):
        res = self.client.post("/api/llm/explain", json={
            "decision": {
                "agent": "BatteryAgent",
                "time_str": "18:30",
                "observation": "Grid in CRITICAL stress; transformer loading 96.2%",
                "decision": "DISCHARGE_PEAK_SHAVING 35.0 kW",
                "reason": "Injected maximum inverter capacity to prevent transformer blackout",
                "constraints": ["SOC >= 25%", "Inverter <= 50kW"]
            }
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("explanation", data)
        self.assertEqual(data["agent"], "BatteryAgent")

    def test_llm_executive_summary_endpoint(self):
        res = self.client.post("/api/llm/executive-summary", json={
            "scenario": "cloud_cover_peak"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("executive_report", data)
        self.assertIn("comparison", data)
        self.assertTrue(len(data["executive_report"]) > 100)

if __name__ == "__main__":
    unittest.main()
