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
