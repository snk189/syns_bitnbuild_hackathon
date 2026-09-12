from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from ..communication.message_bus import MessageBus
from ..memory.memory import AgentMemory
from ..tools.tool_registry import tools
from ..simulation.models import AgentMessage, AgentDecisionLog

class BaseAgent(ABC):
    def __init__(self, name: str, role: str, memory: AgentMemory, bus: MessageBus):
        self.name = name
        self.role = role
        self.memory = memory
        self.bus = bus
        # Subscribe to incoming messages directed to this agent or broadcast to all
        self.bus.subscribe(self.name, self.handle_message)
        self.bus.subscribe("ALL", self.handle_message)
        self.inbox: List[AgentMessage] = []

    def handle_message(self, message: AgentMessage):
        if message.sender != self.name:
            self.inbox.append(message)

    def log_decision(
        self,
        step: int,
        time_str: str,
        observation: str,
        decision: str,
        reason: str,
        state: Dict[str, Any],
        constraints: Optional[List[str]] = None,
        tools_used: Optional[List[str]] = None
    ):
        self.memory.log_decision(
            step=step,
            time_str=time_str,
            agent_name=self.name,
            observation=observation,
            decision=decision,
            reason=reason,
            state=state,
            constraints=constraints or [],
            tools=tools_used or []
        )

    def send_message(
        self,
        step: int,
        time_str: str,
        receiver: str,
        message_type: str,
        content: str,
        priority: str = "NORMAL",
        action_requested: Optional[str] = None,
        response: Optional[str] = None,
        reasoning: Optional[str] = None
    ) -> AgentMessage:
        return self.bus.publish(
            step=step,
            time_str=time_str,
            sender=self.name,
            receiver=receiver,
            message_type=message_type,
            content=content,
            priority=priority,
            action_requested=action_requested,
            response=response,
            reasoning=reasoning
        )

    @abstractmethod
    def perceive_and_act(self, current_step: int, time_str: str, sim_state: Any) -> Dict[str, Any]:
        """
        Agent observe -> reason -> plan -> communicate -> act cycle.
        """
        pass
