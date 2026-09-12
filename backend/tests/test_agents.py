import unittest
from backend.app.simulation.simulator import MicrogridSimulator
from backend.app.agents.orchestrator import MultiAgentOrchestrator
from backend.app.communication.message_bus import MessageBus

class TestMultiAgentOrchestration(unittest.TestCase):
    def setUp(self):
        self.sim = MicrogridSimulator("cloud_cover_peak")
        self.orchestrator = MultiAgentOrchestrator(self.sim)

    def test_agent_decision_cycle_and_message_bus(self):
        # Advance to evening peak with cloud cover event (step 72)
        self.sim.current_step = 72
        # Step through 5 intervals across peak
        for _ in range(5):
            state = self.orchestrator.step()
            self.assertIsNotNone(state)

        # Verify messages were exchanged between agents
        bus = MessageBus.get_instance()
        messages = bus.get_recent_messages(50)
        self.assertGreater(len(messages), 0, "Agents must exchange messages across message bus")

    def test_agent_memory_audit_logging(self):
        self.orchestrator.step()
        recent_decisions = self.orchestrator.memory.get_recent_decisions(10)
        self.assertGreater(len(recent_decisions), 0, "Agent decisions must be persisted in SQLite memory audit log")
        first = recent_decisions[0]
        self.assertIn("agent", first)
        self.assertIn("decision", first)
        self.assertIn("reason", first)

if __name__ == "__main__":
    unittest.main()
