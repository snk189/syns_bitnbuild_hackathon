from __future__ import annotations
import asyncio
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from ..simulation.simulator import MicrogridSimulator
from ..simulation.baseline import BaselineSimulator, compare_metrics
from ..simulation.scenarios import SCENARIOS
from ..simulation.models import GridState, SimulationMetrics, SimulationComparison, P2PTrade, AgentMessage
from ..agents.orchestrator import MultiAgentOrchestrator
from ..communication.message_bus import MessageBus

router = APIRouter(prefix="/api")

# Global singleton simulation state for live demo
global_sim = MicrogridSimulator(scenario_name="cloud_cover_peak")
global_orchestrator = MultiAgentOrchestrator(global_sim)
sim_task: Optional[asyncio.Task] = None
active_websockets: List[WebSocket] = []

class ScenarioSelectRequest(BaseModel):
    scenario: str

class SpeedRequest(BaseModel):
    speed: float  # e.g., 1.0, 2.0, 5.0

class RunCompareRequest(BaseModel):
    scenario: Optional[str] = None

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GRIDMIND Multi-Agent Microgrid Platform",
        "scenario": global_sim.scenario.title,
        "current_step": global_sim.current_step,
        "time": global_sim.step_to_time_str(global_sim.current_step),
        "is_running": global_sim.is_running
    }

@router.get("/simulation/scenarios")
def list_scenarios():
    return [
        {
            "id": key,
            "title": sc.title,
            "description": sc.description,
            "weather": sc.weather_pattern.value,
            "initial_battery_soc": sc.initial_battery_soc,
            "demand_multiplier": sc.demand_spike_factor
        }
        for key, sc in SCENARIOS.items()
    ]

@router.get("/state")
def get_current_state():
    if not global_sim.history:
        # Run one initial step or snapshot
        state = global_orchestrator.step()
    else:
        state = global_sim.history[-1]

    metrics = global_sim.get_metrics(mode="GRIDMIND")
    return {
        "state": state,
        "metrics": metrics,
        "is_running": global_sim.is_running,
        "scenario": global_sim.scenario_name,
        "crisis_triggered": global_sim.crisis_triggered
    }

@router.post("/simulation/step")
async def step_simulation():
    if global_sim.current_step >= global_sim.total_steps:
        return {"status": "COMPLETE", "message": "24-hour simulation cycle finished."}

    state = global_orchestrator.step()
    metrics = global_sim.get_metrics(mode="GRIDMIND")
    await broadcast_state_update(state, metrics)
    return {"status": "STEPPED", "step": state.step, "time": state.time_str}

@router.post("/simulation/start")
async def start_simulation():
    global sim_task
    if not global_sim.is_running:
        global_sim.is_running = True
        if sim_task is None or sim_task.done():
            sim_task = asyncio.create_task(run_simulation_loop())
    return {"status": "STARTED", "is_running": True}

@router.post("/simulation/pause")
def pause_simulation():
    global_sim.is_running = False
    return {"status": "PAUSED", "is_running": False}

@router.post("/simulation/reset")
async def reset_simulation(req: Optional[ScenarioSelectRequest] = None):
    global_sim.is_running = False
    scenario_to_use = req.scenario if req else global_sim.scenario_name
    global_sim.reset(scenario_to_use)
    # Re-instantiate orchestrator
    global global_orchestrator
    global_orchestrator = MultiAgentOrchestrator(global_sim)
    state = global_orchestrator.step()
    metrics = global_sim.get_metrics(mode="GRIDMIND")
    await broadcast_state_update(state, metrics)
    return {"status": "RESET", "scenario": scenario_to_use}

@router.post("/simulation/scenario")
async def set_scenario(req: ScenarioSelectRequest):
    if req.scenario not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Scenario '{req.scenario}' not recognized.")
    return await reset_simulation(req)

@router.post("/simulation/speed")
def set_speed(req: SpeedRequest):
    global_sim.speed_multiplier = max(0.2, min(10.0, req.speed))
    return {"status": "SPEED_UPDATED", "speed": global_sim.speed_multiplier}

@router.post("/simulation/trigger-crisis")
async def trigger_crisis():
    global_sim.trigger_crisis()
    bus = MessageBus.get_instance()
    msg = bus.publish(
        step=global_sim.current_step,
        time_str=global_sim.step_to_time_str(global_sim.current_step),
        sender="OPERATOR",
        receiver="ALL",
        message_type="CRISIS_INJECTED",
        priority="EMERGENCY",
        content="🚨 OPERATOR TRIGGERED CRISIS: Sudden severe cloud cover & demand surge injected into microgrid.",
        action_requested="ACTIVATE_EMERGENCY_COORDINATION",
        reasoning="Manual stress test injection for agent crisis response evaluation."
    )
    # Step once immediately to observe agent reaction
    state = global_orchestrator.step()
    metrics = global_sim.get_metrics(mode="GRIDMIND")
    await broadcast_state_update(state, metrics)
    return {"status": "CRISIS_TRIGGERED", "step": global_sim.current_step}

@router.get("/simulation/compare")
def get_comparison(scenario: Optional[str] = None):
    sc_name = scenario or global_sim.scenario_name

    # 1. Run full baseline mode
    baseline_runner = BaselineSimulator(sc_name)
    base_metrics, base_states = baseline_runner.run_full_simulation()

    # 2. Run full GridMind multi-agent mode
    gridmind_runner = MicrogridSimulator(sc_name)
    gridmind_orch = MultiAgentOrchestrator(gridmind_runner)
    gm_states: List[GridState] = []
    for _ in range(gridmind_runner.total_steps):
        st = gridmind_orch.step()
        gm_states.append(st)
    gm_metrics = gridmind_runner.get_metrics(mode="GRIDMIND")

    # 3. Calculate direct comparison
    comp = compare_metrics(base_metrics, gm_metrics)

    # Hourly curves for chart comparison
    chart_data = []
    for i in range(min(len(base_states), len(gm_states))):
        b_st = base_states[i]
        g_st = gm_states[i]
        chart_data.append({
            "step": i,
            "time": b_st.time_str,
            "baseline_grid_import_kw": b_st.grid_import_kw,
            "gridmind_grid_import_kw": g_st.grid_import_kw,
            "baseline_transformer_load_pct": b_st.transformer_load_pct,
            "gridmind_transformer_load_pct": g_st.transformer_load_pct,
            "solar_generation_kw": g_st.solar_total_kw,
            "baseline_battery_soc": b_st.battery.soc_pct,
            "gridmind_battery_soc": g_st.battery.soc_pct,
            "p2p_volume_kwh": g_st.p2p_volume_kwh
        })

    return {
        "comparison": comp,
        "chart_data": chart_data
    }

@router.get("/agents/logs")
def get_agent_logs(limit: int = 40):
    return global_orchestrator.memory.get_recent_decisions(limit)

@router.get("/agents/messages")
def get_agent_messages(limit: int = 50):
    bus = MessageBus.get_instance()
    return bus.get_recent_messages(limit)

@router.get("/market/trades")
def get_market_trades():
    return global_sim.executed_trades[-50:]

# WebSocket for real-time live events and state streaming
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        # Send initial state snapshot upon connection
        if global_sim.history:
            latest = global_sim.history[-1]
            metrics = global_sim.get_metrics(mode="GRIDMIND")
            await websocket.send_json({
                "type": "INIT_STATE",
                "state": latest.model_dump(),
                "metrics": metrics.model_dump(),
                "messages": [m.model_dump() for m in MessageBus.get_instance().get_recent_messages(20)],
                "decisions": global_orchestrator.memory.get_recent_decisions(15)
            })
        while True:
            # Keep-alive receive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
    except Exception:
        if websocket in active_websockets:
            active_websockets.remove(websocket)

async def broadcast_state_update(state: GridState, metrics: SimulationMetrics):
    if not active_websockets:
        return
    bus = MessageBus.get_instance()
    recent_msgs = bus.get_recent_messages(8)
    recent_decisions = global_orchestrator.memory.get_recent_decisions(5)

    payload = {
        "type": "TICK_UPDATE",
        "state": state.model_dump(),
        "metrics": metrics.model_dump(),
        "messages": [m.model_dump() for m in recent_msgs],
        "decisions": recent_decisions
    }
    to_remove = []
    for ws in active_websockets:
        try:
            await ws.send_json(payload)
        except Exception:
            to_remove.append(ws)
    for ws in to_remove:
        if ws in active_websockets:
            active_websockets.remove(ws)

async def run_simulation_loop():
    while global_sim.is_running:
        if global_sim.current_step >= global_sim.total_steps:
            global_sim.is_running = False
            break
        state = global_orchestrator.step()
        metrics = global_sim.get_metrics(mode="GRIDMIND")
        await broadcast_state_update(state, metrics)
        delay = max(0.1, 1.0 / global_sim.speed_multiplier)
        await asyncio.sleep(delay)
