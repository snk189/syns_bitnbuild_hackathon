from __future__ import annotations
from typing import Dict, Any, List, Optional
from ..simulation.simulator import MicrogridSimulator
from ..simulation.models import GridState, SimulationMetrics
from ..communication.message_bus import MessageBus
from ..memory.memory import AgentMemory
from .forecast_agent import ForecastAgent
from .grid_agent import GridAgent
from .solar_agent import SolarProducerAgent, SolarAgent
from .battery_agent import BatteryAgent
from .consumer_agent import ConsumerAgent
from .ev_agent import EVAgent
from .market_agent import MarketAgent

class MultiAgentOrchestrator:
    """
    Coordinates the autonomous multi-agent reasoning and action cycle at each simulation step.
    Implements:
    Observation -> Reasoning -> Planning -> Communication -> Negotiation -> Tool Use -> Action -> Feedback
    """
    def __init__(self, simulator: MicrogridSimulator):
        self.sim = simulator
        self.bus = MessageBus.get_instance()
        self.memory = AgentMemory()

        # Instantiate the 6 core autonomous agents
        self.forecast_agent = ForecastAgent(memory=self.memory, bus=self.bus)
        self.grid_agent = GridAgent(memory=self.memory, bus=self.bus)
        self.solar_agent = SolarProducerAgent(memory=self.memory, bus=self.bus)
        self.battery_agent = BatteryAgent(memory=self.memory, bus=self.bus)
        self.consumer_agent = ConsumerAgent(memory=self.memory, bus=self.bus)
        self.ev_agent = EVAgent(memory=self.memory, bus=self.bus)
        self.market_agent = MarketAgent(memory=self.memory, bus=self.bus)

    def step(self) -> GridState:
        """
        Executes one full coordinated agent cycle followed by a deterministic simulation step.
        """
        step = self.sim.current_step
        time_str = self.sim.step_to_time_str(step)

        # 1. Forecast Agent perceives & predicts
        forecast_res = self.forecast_agent.perceive_and_act(step, time_str, self.sim)

        # 2. Grid Health Agent evaluates current & future stress
        grid_res = self.grid_agent.perceive_and_act(step, time_str, self.sim, forecast_res)

        # 3. Solar Producer Agent analyzes generation & surplus asks
        solar_res = self.solar_agent.perceive_and_act(step, time_str, self.sim, grid_res)

        # 4. Central Battery Agent manages reserves & dispatch offers
        battery_res = self.battery_agent.perceive_and_act(step, time_str, self.sim, grid_res, solar_res)

        # 5. Consumer Agent coordinates flexible load shifting
        consumer_res = self.consumer_agent.perceive_and_act(step, time_str, self.sim, grid_res)

        # 6. EV Agent coordinates smart deferred charging
        ev_res = self.ev_agent.perceive_and_act(step, time_str, self.sim, grid_res)

        # 7. Market Agent matches P2P trades, optimizes allocation, validates constraints
        market_res = self.market_agent.perceive_and_act(
            step, time_str, self.sim,
            grid_data=grid_res,
            solar_data=solar_res,
            battery_data=battery_res,
            consumer_data=consumer_res,
            ev_data=ev_res
        )

        # 8. Commit validated actions into deterministic microgrid simulation
        state = self.sim.apply_simulation_step(
            battery_action_kw=market_res["final_battery_action_kw"],
            flexible_load_reductions=market_res["final_household_reductions"],
            ev_charging_overrides=market_res["final_ev_overrides"],
            p2p_trades_this_step=market_res["executed_trades"]
        )

        return state
