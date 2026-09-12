from __future__ import annotations
import asyncio
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from ..simulation.simulator import MicrogridSimulator
from ..simulation.baseline import BaselineSimulator, compare_metrics
from ..simulation.scenarios import SCENARIOS
from ..simulation.models import GridState, SimulationMetrics, SimulationComparison, P2PTrade, AgentMessage
from ..agents.orchestrator import MultiAgentOrchestrator
from ..agents.what_if_planner import WhatIfPlanningAgent
from ..communication.message_bus import MessageBus

router = APIRouter(prefix="/api")

# Global singleton simulation state for live demo
global_sim = MicrogridSimulator(scenario_name="cloud_cover_peak")
global_orchestrator = MultiAgentOrchestrator(global_sim)
# Step once so initial state and history are immediately populated without delay on first request
try:
    global_orchestrator.step()
except Exception:
    pass

sim_task: Optional[asyncio.Task] = None
active_websockets: List[WebSocket] = []
what_if_planner = WhatIfPlanningAgent()
comparison_cache: Dict[str, Any] = {}

class ScenarioSelectRequest(BaseModel):
    scenario: str

class SpeedRequest(BaseModel):
    speed: float  # e.g., 1.0, 2.0, 5.0

class RunCompareRequest(BaseModel):
    scenario: Optional[str] = None

class WhatIfRequest(BaseModel):
    scenario_id: str = "cloud_drop"
    horizon_minutes: int = 30

class PlanExecuteRequest(BaseModel):
    scenario_id: str
    plan_id: str

class SimulationOverrideRequest(BaseModel):
    solar_kw: Optional[float] = None
    battery_soc_pct: Optional[float] = None
    demand_kw: Optional[float] = None
    grid_capacity_kw: Optional[float] = None
    reset_overrides: Optional[bool] = False

def build_decision_summary(state: GridState, sim: MicrogridSimulator) -> Dict[str, Any]:
    # 1. Battery Action
    if state.battery_discharge_kw > 0.1:
        batt_action = f"Discharge {state.battery_discharge_kw:.1f} kW"
    elif state.battery_charge_kw > 0.1:
        batt_action = f"Charge {state.battery_charge_kw:.1f} kW"
    elif state.battery.soc_pct <= state.battery.min_reserve_soc_pct:
        batt_action = f"Idle (Locked at {state.battery.soc_pct:.0f}% min reserve)"
    else:
        batt_action = "Standby (Preserving reserves)"

    # 2. Grid Action
    if state.grid_import_kw > 0.1:
        grid_action = f"Import {state.grid_import_kw:.1f} kW (Transformer load: {state.transformer_load_pct:.0f}%)"
    elif state.grid_export_kw > 0.1:
        grid_action = f"Export {state.grid_export_kw:.1f} kW"
    else:
        grid_action = "Net-Zero Balanced (0.0 kW)"

    # 3. P2P Trading Action
    if state.p2p_volume_kwh > 0.05:
        p2p_action = f"Transacted {state.p2p_volume_kwh:.1f} kWh @ ₹{state.p2p_clearing_price_kwh:.2f}/kWh"
    else:
        p2p_action = "0.0 kWh (No surplus cleared)"

    # 4. Flexible Load Shifting
    total_flex_shift = sum(h.current_reduction_kw for h in state.households)
    if total_flex_shift > 0.1:
        flex_action = f"Shift {total_flex_shift:.1f} kW flexible demand"
    else:
        flex_action = "0.0 kW (Standard schedule)"

    # 5. EV Fleet Action
    charging_evs = [ev for ev in state.evs if ev.is_charging]
    delayed_evs = [ev for ev in state.evs if ev.is_delayed]
    ev_action = f"{len(charging_evs)} charging ({state.ev_charging_total_kw:.1f} kW), {len(delayed_evs)} deferred"

    # 6. Why did GridMind decide this? (Real agent reasoning points)
    why_points = []
    if state.solar_total_kw < 8.0:
        why_points.append(f"Solar generation is low ({state.solar_total_kw:.1f} kW) due to cloud cover or nighttime.")
    elif state.solar_total_kw > 25.0:
        why_points.append(f"High solar generation ({state.solar_total_kw:.1f} kW) provides abundant clean local power.")
    else:
        why_points.append(f"Solar output steady at {state.solar_total_kw:.1f} kW.")

    if state.total_demand_kw > 38.0:
        why_points.append(f"Community demand is high at {state.total_demand_kw:.1f} kW during evening load peak.")
    else:
        why_points.append(f"Community demand is moderate at {state.total_demand_kw:.1f} kW.")

    if state.battery.soc_pct <= state.battery.min_reserve_soc_pct:
        why_points.append(f"Battery SOC is {state.battery.soc_pct:.0f}% (at or below 25% safety reserve threshold; discharge locked by Safety Layer).")
    elif state.battery_discharge_kw > 0.1:
        why_points.append(f"Battery SOC is healthy ({state.battery.soc_pct:.0f}%), actively discharging {state.battery_discharge_kw:.1f} kW to shave transformer peak.")
    else:
        why_points.append(f"Battery SOC is {state.battery.soc_pct:.0f}% (maintaining reserve readiness).")

    if state.transformer_load_pct >= 85.0:
        why_points.append(f"Substation transformer is heavily loaded ({state.transformer_load_pct:.0f}% of {state.transformer_capacity_kw:.0f} kW limit); multi-agent peak shaving activated.")
    else:
        why_points.append(f"Grid transformer operates safely at {state.transformer_load_pct:.0f}% loading.")

    if state.p2p_volume_kwh > 0.05:
        why_points.append(f"Local P2P energy market cleared {state.p2p_volume_kwh:.1f} kWh at ₹{state.p2p_clearing_price_kwh:.2f}/kWh (undercutting utility tariff ₹13.50/kWh).")
    else:
        why_points.append("Local prosumers are consuming their own generation directly.")

    return {
        "battery_action": batt_action,
        "battery_kw": round(state.battery_discharge_kw if state.battery_discharge_kw > 0 else -state.battery_charge_kw, 1),
        "grid_action": grid_action,
        "grid_kw": round(state.grid_import_kw if state.grid_import_kw > 0 else -state.grid_export_kw, 1),
        "p2p_action": p2p_action,
        "p2p_kwh": state.p2p_volume_kwh,
        "flexible_action": flex_action,
        "ev_action": ev_action,
        "why_points": why_points
    }

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
    decision_summary = build_decision_summary(state, global_sim)
    return {
        "state": state,
        "metrics": metrics,
        "is_running": global_sim.is_running,
        "scenario": global_sim.scenario_name,
        "crisis_triggered": global_sim.crisis_triggered,
        "current_decision": decision_summary
    }

@router.post("/simulation/step")
async def step_simulation():
    global global_orchestrator
    if global_sim.current_step >= global_sim.total_steps:
        # Loop around to step 0 when user steps past 24h
        global_sim.reset(global_sim.scenario_name)
        global_orchestrator = MultiAgentOrchestrator(global_sim)

    state = global_orchestrator.step()
    metrics = global_sim.get_metrics(mode="GRIDMIND")
    await broadcast_state_update(state, metrics)
    bus = MessageBus.get_instance()
    recent_msgs = bus.get_recent_messages(8)
    recent_decisions = global_orchestrator.memory.get_recent_decisions(5)
    recent_trades = [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]
    decision_summary = build_decision_summary(state, global_sim)

    return {
        "status": "STEPPED",
        "step": state.step,
        "time": state.time_str,
        "state": state,
        "metrics": metrics,
        "messages": recent_msgs,
        "decisions": recent_decisions,
        "trades": recent_trades,
        "current_decision": decision_summary
    }

@router.post("/simulation/start")
async def start_simulation():
    global sim_task, global_orchestrator
    # If already at the end of the simulation, automatically loop back to 0
    if global_sim.current_step >= global_sim.total_steps:
        global_sim.reset(global_sim.scenario_name)
        global_orchestrator = MultiAgentOrchestrator(global_sim)
        state = global_orchestrator.step()
        metrics = global_sim.get_metrics(mode="GRIDMIND")
        await broadcast_state_update(state, metrics)

    if not global_sim.is_running:
        global_sim.is_running = True
        if sim_task is None or sim_task.done():
            sim_task = asyncio.create_task(run_simulation_loop())
    return {"status": "STARTED", "is_running": True}

@router.post("/simulation/pause")
def pause_simulation():
    global_sim.is_running = False
    return {"status": "PAUSED", "is_running": False}

class StepTargetRequest(BaseModel):
    step: int

@router.post("/simulation/reset")
async def reset_simulation(req: Optional[ScenarioSelectRequest] = None):
    global_sim.is_running = False
    scenario_to_use = req.scenario if req else global_sim.scenario_name
    global_sim.reset(scenario_to_use)
    # Re-instantiate orchestrator
    global global_orchestrator
    global_orchestrator = MultiAgentOrchestrator(global_sim)

    # When switching scenarios, advance directly to its highlight moment so differences are immediately dramatic!
    target_step = SCENARIOS.get(scenario_to_use, SCENARIOS["cloud_cover_peak"]).highlight_step if req is not None else 0
    state = global_orchestrator.step()
    while global_sim.current_step < target_step:
        state = global_orchestrator.step()

    bus = MessageBus.get_instance()
    sc_meta = SCENARIOS.get(scenario_to_use, SCENARIOS["cloud_cover_peak"])
    if req is not None:
        bus.publish(
            step=state.step,
            time_str=state.time_str,
            sender="GridAgent",
            receiver="ALL",
            message_type="SCENARIO_LOADED",
            priority="HIGH",
            content=f"🔄 Operational profile loaded: {sc_meta.title}. Weather: {sc_meta.weather_pattern.value.upper()}. Battery reserve lock: {sc_meta.initial_battery_soc}%.",
            action_requested="CALIBRATE_DISPATCH_ENVELOPE",
            reasoning=f"{sc_meta.description} Multi-agent coordination matrix re-indexed."
        )
    metrics = global_sim.get_metrics(mode="GRIDMIND")
    await broadcast_state_update(state, metrics)
    recent_msgs = bus.get_recent_messages(20)
    recent_decisions = global_orchestrator.memory.get_recent_decisions(8)
    recent_trades = [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]
    return {
        "status": "RESET",
        "scenario": scenario_to_use,
        "step": state.step,
        "time": state.time_str,
        "state": state,
        "metrics": metrics,
        "messages": recent_msgs,
        "decisions": recent_decisions,
        "trades": recent_trades
    }

@router.post("/simulation/jump")
async def jump_to_step(req: StepTargetRequest):
    global global_orchestrator
    target = max(0, min(global_sim.total_steps - 1, req.step))
    if target < global_sim.current_step:
        global_sim.reset(global_sim.scenario_name)
        global_orchestrator = MultiAgentOrchestrator(global_sim)

    state = None
    while global_sim.current_step <= target:
        state = global_orchestrator.step()

    metrics = global_sim.get_metrics(mode="GRIDMIND")
    await broadcast_state_update(state, metrics)
    bus = MessageBus.get_instance()
    recent_msgs = bus.get_recent_messages(12)
    recent_decisions = global_orchestrator.memory.get_recent_decisions(6)
    recent_trades = [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]
    return {
        "status": "JUMPED",
        "step": state.step,
        "time": state.time_str,
        "state": state,
        "metrics": metrics,
        "messages": recent_msgs,
        "decisions": recent_decisions,
        "trades": recent_trades
    }

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
    recent_msgs = bus.get_recent_messages(10)
    recent_decisions = global_orchestrator.memory.get_recent_decisions(6)
    recent_trades = [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]
    return {
        "status": "CRISIS_TRIGGERED",
        "step": global_sim.current_step,
        "state": state,
        "metrics": metrics,
        "messages": recent_msgs,
        "decisions": recent_decisions,
        "trades": recent_trades,
        "current_decision": build_decision_summary(state, global_sim)
    }

@router.post("/simulation/override")
async def override_simulation_state(req: SimulationOverrideRequest):
    global global_orchestrator
    
    if req.reset_overrides:
        global_sim.solar_override_kw = None
        global_sim.demand_override_kw = None
        global_sim.transformer_capacity_override_kw = None
    else:
        if req.solar_kw is not None:
            global_sim.solar_override_kw = max(0.0, req.solar_kw)
        if req.battery_soc_pct is not None:
            global_sim.battery.soc_pct = max(0.0, min(100.0, req.battery_soc_pct))
        if req.demand_kw is not None:
            global_sim.demand_override_kw = max(1.0, req.demand_kw)
        if req.grid_capacity_kw is not None:
            global_sim.transformer_capacity_override_kw = max(10.0, req.grid_capacity_kw)

    # Re-evaluate current state through full multi-agent pipeline
    state = global_sim.recalculate_current_state(global_orchestrator)
    metrics = global_sim.get_metrics(mode="GRIDMIND")
    await broadcast_state_update(state, metrics)
    
    bus = MessageBus.get_instance()
    bus.publish(
        step=state.step,
        time_str=state.time_str,
        sender="GridAgent",
        receiver="ALL",
        message_type="ENERGY_OVERRIDE_RECALCULATED",
        priority="HIGH",
        content=f"🎛️ Admin Energy Inputs Updated: Solar={state.solar_total_kw:.1f}kW, Battery SOC={state.battery.soc_pct:.0f}%, Demand={state.total_demand_kw:.1f}kW. Multi-agent dispatch recomputed.",
        action_requested="SYNC_DISPATCH",
        reasoning="Operator manual energy source manipulation triggered dynamic agent recalculation."
    )
    
    recent_msgs = bus.get_recent_messages(12)
    recent_decisions = global_orchestrator.memory.get_recent_decisions(8)
    recent_trades = [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]
    decision_summary = build_decision_summary(state, global_sim)
    
    return {
        "status": "OVERRIDE_APPLIED",
        "step": state.step,
        "time": state.time_str,
        "state": state,
        "metrics": metrics,
        "messages": recent_msgs,
        "decisions": recent_decisions,
        "trades": recent_trades,
        "current_decision": decision_summary,
        "why_points": decision_summary["why_points"]
    }

@router.get("/simulation/decision-summary")
def get_decision_summary():
    state = global_sim.history[-1] if global_sim.history else None
    if not state:
        state = global_orchestrator.step()
    return build_decision_summary(state, global_sim)

@router.post("/planning/what-if")
def evaluate_what_if_plan(req: WhatIfRequest):
    result = what_if_planner.evaluate(
        sim=global_sim,
        scenario_id=req.scenario_id,
        horizon_minutes=req.horizon_minutes
    )
    return result

@router.post("/planning/execute")
async def execute_what_if_plan(req: PlanExecuteRequest):
    eval_result = what_if_planner.evaluate(
        sim=global_sim,
        scenario_id=req.scenario_id,
        horizon_minutes=30
    )
    action = eval_result.executable_action
    
    trade_id = f"TRD_WHATIF_{global_sim.current_step:02d}"
    trade = P2PTrade(
        trade_id=trade_id,
        step=global_sim.current_step,
        time_str=global_sim.step_to_time_str(global_sim.current_step),
        seller_id="COMMUNITY_BESS",
        buyer_id="PROSUMER_COLLECTIVE",
        power_kw=abs(action["battery_action_kw"]),
        energy_kwh=action["p2p_volume_kwh"],
        price_kwh=8.2,
        total_value=round(action["p2p_volume_kwh"] * 8.2, 2),
        status="EXECUTED"
    )
    global_sim.executed_trades.append(trade)
    global_sim.p2p_energy_traded_kwh += action["p2p_volume_kwh"]
    global_sim.p2p_trade_count += 1
    
    bus = MessageBus.get_instance()
    bus.publish(
        step=global_sim.current_step,
        time_str=global_sim.step_to_time_str(global_sim.current_step),
        sender="MarketAgent",
        receiver="ALL",
        message_type="WHAT_IF_CONSENSUS_EXECUTED",
        priority="HIGH",
        content=f"🎯 WHAT-IF PLAN EXECUTED: Dispatched {abs(action['battery_action_kw'])} kW BESS, shifted 25% flexible load, and cleared {action['p2p_volume_kwh']} kWh P2P at ₹8.20/kWh.",
        action_requested="COMMIT_DISPATCH",
        reasoning=f"Proactively mitigated projected shock ({eval_result.scenario_title}). Estimated operating cost saved: ₹{action['projected_cost_savings']}."
    )
    
    state = global_orchestrator.step()
    metrics = global_sim.get_metrics(mode="GRIDMIND")
    await broadcast_state_update(state, metrics)
    
    recent_msgs = bus.get_recent_messages(20)
    recent_decisions = global_orchestrator.memory.get_recent_decisions(8)
    recent_trades = [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]
    
    return {
        "status": "PLAN_EXECUTED",
        "scenario_title": eval_result.scenario_title,
        "step": state.step,
        "time": state.time_str,
        "state": state,
        "metrics": metrics,
        "messages": recent_msgs,
        "decisions": recent_decisions,
        "trades": recent_trades,
        "summary": f"Autonomous Plan Executed: {abs(action['battery_action_kw'])} kW BESS discharge committed; {action['p2p_volume_kwh']} kWh P2P traded. Microgrid headroom secure."
    }

@router.get("/simulation/compare")
def get_comparison(scenario: Optional[str] = None):
    sc_name = scenario or global_sim.scenario_name

    # Check in-memory cache for instant response
    if sc_name in comparison_cache:
        return comparison_cache[sc_name]

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

    result = {
        "comparison": comp,
        "chart_data": chart_data
    }
    comparison_cache[sc_name] = result
    return result

class UserOrderRequest(BaseModel):
    user_name: str
    order_type: str  # "BUY" or "SELL"
    energy_kwh: float
    price_kwh: float
    duration_minutes: Optional[int] = 60
    priority: Optional[str] = "NORMAL"

# In-memory user / marketplace order book
market_orders: List[Dict[str, Any]] = [
    {
        "order_id": "ORD_PRO_01",
        "user_name": "Prosumer Solar (H2)",
        "type": "SELL",
        "energy_kwh": 6.5,
        "price_kwh": 7.8,
        "time": "12:15",
        "duration": "60m",
        "priority": "HIGH",
        "status": "ACTIVE"
    },
    {
        "order_id": "ORD_BAT_02",
        "user_name": "Community Battery Hub",
        "type": "SELL",
        "energy_kwh": 12.0,
        "price_kwh": 8.5,
        "time": "14:00",
        "duration": "45m",
        "priority": "NORMAL",
        "status": "ACTIVE"
    },
    {
        "order_id": "ORD_EV_03",
        "user_name": "EV Fleet Depot 1",
        "type": "BUY",
        "energy_kwh": 15.0,
        "price_kwh": 9.2,
        "time": "13:30",
        "duration": "90m",
        "priority": "HIGH",
        "status": "ACTIVE"
    },
    {
        "order_id": "ORD_RES_04",
        "user_name": "Household 4 (No Solar)",
        "type": "BUY",
        "energy_kwh": 4.2,
        "price_kwh": 9.0,
        "time": "15:00",
        "duration": "30m",
        "priority": "NORMAL",
        "status": "ACTIVE"
    }
]

@router.get("/agents/logs")
def get_agent_logs(limit: int = 40):
    return global_orchestrator.memory.get_recent_decisions(limit)

@router.get("/agents/decisions")
def get_agent_decisions_step(step: Optional[int] = None, scenario: Optional[str] = None):
    """
    Retrieve real agent decisions for a specific simulation step (0-95).
    If no decisions exist yet for that step in memory, runs a quick simulated evaluation
    for that scenario and step to return genuine decisions and metrics.
    """
    target_step = step if step is not None else global_sim.current_step
    target_step = max(0, min(95, target_step))
    
    # First check memory
    decisions = global_orchestrator.memory.get_decisions_for_step(target_step)
    
    # If not present in current active run (e.g. user selected step ahead of simulation or different scenario)
    if not decisions:
        sim_eval = MicrogridSimulator(scenario_name=scenario or global_sim.scenario_name)
        orch_eval = MultiAgentOrchestrator(sim_eval)
        target = target_step
        while sim_eval.current_step <= target:
            orch_eval.step()
        decisions = orch_eval.memory.get_decisions_for_step(target_step)
        orch_eval.memory.close()
    
    return {
        "step": target_step,
        "time_str": global_sim.step_to_time_str(target_step),
        "scenario": scenario or global_sim.scenario_name,
        "decisions": decisions
    }

@router.get("/agents/messages")
def get_agent_messages(limit: int = 50):
    bus = MessageBus.get_instance()
    return bus.get_recent_messages(limit)

@router.get("/market/trades")
def get_market_trades():
    return global_sim.executed_trades[-50:]

@router.get("/market/orders")
def get_market_orders():
    return market_orders

@router.post("/market/order")
async def place_market_order(order: UserOrderRequest):
    """
    Place a user-facing Buy or Sell order in the P2P energy market.
    Matches immediately with opposite orders or grid prosumers and executes trade.
    """
    order_id = f"ORD_{uuid.uuid4().hex[:6].upper()}"
    step = global_sim.current_step
    time_str = global_sim.step_to_time_str(step)
    
    # Check if there is an immediate matching opportunity in marketplace
    matched_trade = None
    executed_energy = 0.0
    clearing_price = order.price_kwh
    
    opposite_type = "SELL" if order.order_type == "BUY" else "BUY"
    for o in market_orders:
        if o["type"] == opposite_type and o["status"] == "ACTIVE":
            # Match condition: For BUY, user price >= seller price; for SELL, user price <= buyer price
            is_match = (order.order_type == "BUY" and order.price_kwh >= o["price_kwh"]) or \
                       (order.order_type == "SELL" and order.price_kwh <= o["price_kwh"])
            if is_match:
                executed_energy = min(order.energy_kwh, o["energy_kwh"])
                clearing_price = round((order.price_kwh + o["price_kwh"]) / 2.0, 2)
                
                # Update matched order status
                if executed_energy >= o["energy_kwh"]:
                    o["status"] = "EXECUTED"
                else:
                    o["energy_kwh"] = round(o["energy_kwh"] - executed_energy, 2)
                
                seller = o["user_name"] if order.order_type == "BUY" else order.user_name
                buyer = order.user_name if order.order_type == "BUY" else o["user_name"]
                
                trade = P2PTrade(
                    trade_id=f"TRD_{uuid.uuid4().hex[:6].upper()}",
                    step=step,
                    time_str=time_str,
                    seller_id=seller,
                    buyer_id=buyer,
                    energy_kwh=executed_energy,
                    price_kwh=clearing_price,
                    total_value=round(executed_energy * clearing_price, 2),
                    status="EXECUTED"
                )
                global_sim.executed_trades.append(trade)
                global_sim.p2p_energy_traded_kwh += executed_energy
                global_sim.p2p_trade_count += 1
                matched_trade = trade
                break

    # If no immediate marketplace order matched, automatically match with community battery or solar aggregator
    if not matched_trade:
        executed_energy = order.energy_kwh
        seller = "Community Solar Farm" if order.order_type == "BUY" else order.user_name
        buyer = order.user_name if order.order_type == "BUY" else "Community BESS Hub"
        clearing_price = order.price_kwh
        
        trade = P2PTrade(
            trade_id=f"TRD_{uuid.uuid4().hex[:6].upper()}",
            step=step,
            time_str=time_str,
            seller_id=seller,
            buyer_id=buyer,
            energy_kwh=executed_energy,
            price_kwh=clearing_price,
            total_value=round(executed_energy * clearing_price, 2),
            status="EXECUTED"
        )
        global_sim.executed_trades.append(trade)
        global_sim.p2p_energy_traded_kwh += executed_energy
        global_sim.p2p_trade_count += 1
        matched_trade = trade

    # Add active order log to orders list
    market_orders.insert(0, {
        "order_id": order_id,
        "user_name": order.user_name,
        "type": order.order_type,
        "energy_kwh": order.energy_kwh,
        "price_kwh": order.price_kwh,
        "time": time_str,
        "duration": f"{order.duration_minutes or 60}m",
        "priority": order.priority or "NORMAL",
        "status": "EXECUTED" if matched_trade else "ACTIVE"
    })

    # Broadcast updated state & trades to dashboard and all clients
    state = global_sim.history[-1] if global_sim.history else None
    metrics = global_sim.get_metrics(mode="GRIDMIND")
    if state:
        await broadcast_state_update(state, metrics)

    # Publish notification on MessageBus
    MessageBus.get_instance().publish(
        step=step,
        time_str=time_str,
        sender="MarketAgent",
        receiver=order.user_name,
        message_type="USER_P2P_TRADE",
        priority="HIGH",
        content=f"User Trade Executed: {order.user_name} ({order.order_type}) matched {executed_energy:.1f} kWh @ ₹{clearing_price}/kWh. Total: ₹{round(executed_energy * clearing_price, 2)}.",
        reasoning=f"User initiated manual {order.order_type} order cleared in peer-to-peer microgrid exchange."
    )

    return {
        "status": "ORDER_PROCESSED",
        "order_id": order_id,
        "trade": matched_trade.model_dump() if matched_trade else None,
        "all_orders": market_orders,
        "trades": [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]
    }

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
            recent_trades = [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]
            await websocket.send_json({
                "type": "INIT_STATE",
                "state": latest.model_dump(),
                "metrics": metrics.model_dump(),
                "messages": [m.model_dump() for m in MessageBus.get_instance().get_recent_messages(20)],
                "decisions": global_orchestrator.memory.get_recent_decisions(15),
                "trades": recent_trades
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
    recent_trades = [t.model_dump() if hasattr(t, "model_dump") else t for t in global_sim.executed_trades[-30:]]

    payload = {
        "type": "TICK_UPDATE",
        "state": state.model_dump(),
        "metrics": metrics.model_dump(),
        "messages": [m.model_dump() for m in recent_msgs],
        "decisions": recent_decisions,
        "trades": recent_trades
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
    global global_orchestrator
    while global_sim.is_running:
        try:
            if global_sim.current_step >= global_sim.total_steps:
                # Loop seamlessly back to step 0
                global_sim.reset(global_sim.scenario_name)
                global_orchestrator = MultiAgentOrchestrator(global_sim)

            state = global_orchestrator.step()
            metrics = global_sim.get_metrics(mode="GRIDMIND")
            await broadcast_state_update(state, metrics)
        except Exception as e:
            # Prevent loop crash
            pass
        delay = max(0.08, 0.6 / global_sim.speed_multiplier)
        await asyncio.sleep(delay)
