from __future__ import annotations
from typing import Dict, Any, Callable, List, Optional
from ..simulation.models import GridState, BatteryState, P2PTrade

class ToolRegistry:
    """
    Central tool registry exposing callable deterministic tools for autonomous agents.
    Agents invoke these tools during their reasoning and action loops.
    """
    _instance: Optional[ToolRegistry] = None

    def __init__(self):
        self._tools: Dict[str, Callable[..., Any]] = {}
        self._tool_descriptions: Dict[str, str] = {}

    @classmethod
    def get_instance(cls) -> ToolRegistry:
        if cls._instance is None:
            cls._instance = ToolRegistry()
        return cls._instance

    def register(self, name: str, description: str, func: Callable[..., Any]):
        self._tools[name] = func
        self._tool_descriptions[name] = description

    def execute(self, tool_name: str, **kwargs) -> Any:
        if tool_name not in self._tools:
            raise KeyError(f"Tool '{tool_name}' not registered in registry.")
        return self._tools[tool_name](**kwargs)

    def list_tools(self) -> List[Dict[str, str]]:
        return [
            {"name": name, "description": desc}
            for name, desc in self._tool_descriptions.items()
        ]

# Global singleton
tools = ToolRegistry.get_instance()
