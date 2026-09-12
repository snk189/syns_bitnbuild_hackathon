from __future__ import annotations
import uuid
from datetime import datetime
from typing import List, Dict, Callable, Any, Optional
from ..simulation.models import AgentMessage

class MessageBus:
    """
    Standardized Multi-Agent Message Bus:
    Facilitates transparent agent-to-agent communication, negotiations, and audit history.
    """
    _instance: Optional[MessageBus] = None

    def __init__(self):
        self.subscribers: Dict[str, List[Callable[[AgentMessage], Any]]] = {}
        self.message_history: List[AgentMessage] = []
        self.max_history: int = 500
        self._seed_initial_messages()

    def _seed_initial_messages(self):
        initial_events = [
            ("ForecastAgent", "GridAgent", "AGENT_INIT", "NORMAL", "Multi-horizon Gradient Boosting model initialized. 15m/30m/60m prediction horizons active.", "Observing local weather sensors and solar telemetry."),
            ("GridAgent", "ALL", "AGENT_INIT", "NORMAL", "Substation 11kV transformer online (Capacity 125 kW). Normal thermal thresholds enforced.", "Continuous telemetry monitoring active."),
            ("BatteryAgent", "MarketAgent", "AGENT_INIT", "NORMAL", "Central BESS 120 kWh online. SOC 45.0%. Emergency reserve lock engaged at 25%.", "Safe discharge envelope configured."),
            ("SolarAgent", "MarketAgent", "AGENT_INIT", "NORMAL", "Community Solar Farm (50 kW) & Rooftop array (25 kW) online. Standing by for daylight.", "Self-consumption priority enabled."),
            ("EVAgent", "MarketAgent", "AGENT_INIT", "NORMAL", "Smart EV Fleet (4 vehicles) connected. Departure deadline constraints registered.", "Charging slack calculated dynamically."),
            ("ConsumerAgent", "MarketAgent", "AGENT_INIT", "NORMAL", "10 residential prosumers connected. Critical clinic & refrigeration loads locked.", "Flexible load shifting policy armed."),
            ("MarketAgent", "ALL", "AGENT_INIT", "NORMAL", "Double-auction P2P exchange initialized. Bilateral mid-market clearing active (₹8.50/kWh).", "Ready for peer-to-peer ask/bid matching.")
        ]
        for sender, receiver, mtype, prio, content, reason in initial_events:
            self.publish(
                step=0,
                time_str="00:00",
                sender=sender,
                receiver=receiver,
                message_type=mtype,
                content=content,
                priority=prio,
                reasoning=reason
            )

    @classmethod
    def get_instance(cls) -> MessageBus:
        if cls._instance is None:
            cls._instance = MessageBus()
        return cls._instance

    def subscribe(self, agent_id: str, callback: Callable[[AgentMessage], Any]):
        if agent_id not in self.subscribers:
            self.subscribers[agent_id] = []
        self.subscribers[agent_id].append(callback)

    def publish(
        self,
        step: int,
        time_str: str,
        sender: str,
        receiver: str,
        message_type: str,
        content: str,
        priority: str = "NORMAL",
        action_requested: Optional[str] = None,
        response: Optional[str] = None,
        reasoning: Optional[str] = None
    ) -> AgentMessage:
        msg = AgentMessage(
            id=str(uuid.uuid4())[:8],
            step=step,
            time_str=time_str,
            sender=sender,
            receiver=receiver,
            message_type=message_type,
            priority=priority,
            content=content,
            action_requested=action_requested,
            response=response,
            reasoning=reasoning
        )
        self.message_history.append(msg)
        if len(self.message_history) > self.max_history:
            self.message_history.pop(0)

        # Broadcast to specific recipient or all subscribers if receiver is "ALL"
        if receiver == "ALL":
            for recipient, callbacks in self.subscribers.items():
                for cb in callbacks:
                    try:
                        cb(msg)
                    except Exception:
                        pass
        elif receiver in self.subscribers:
            for cb in self.subscribers[receiver]:
                try:
                    cb(msg)
                except Exception:
                    pass

        return msg

    def get_recent_messages(self, limit: int = 50) -> List[AgentMessage]:
        return self.message_history[-limit:]

    def clear(self):
        self.message_history.clear()
