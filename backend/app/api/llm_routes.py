from __future__ import annotations
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..llm.llm_service import llm_service
from ..simulation.baseline import BaselineSimulator, compare_metrics
from ..simulation.simulator import MicrogridSimulator
from ..agents.orchestrator import MultiAgentOrchestrator

router = APIRouter(prefix="/api/llm", tags=["LLM & AI Copilot"])

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None

class ConfigureLLMRequest(BaseModel):
    api_key: str
    model: Optional[str] = "gpt-4o-mini"

class ExplainRequest(BaseModel):
    decision: Dict[str, Any]

class ExecutiveSummaryRequest(BaseModel):
    scenario: Optional[str] = None


@router.get("/status")
def get_llm_status():
    """Get current OpenAI LLM integration status."""
    return llm_service.get_status()


@router.post("/configure")
def configure_llm(req: ConfigureLLMRequest):
    """Dynamically set or update OpenAI API key and model."""
    status = llm_service.configure(api_key=req.api_key, model=req.model)
    return {
        "status": "CONFIGURED",
        "llm_status": status
    }


@router.post("/test")
def test_llm_connection():
    """Test connection with the configured OpenAI API key."""
    result = llm_service.test_connection()
    return result


@router.post("/chat")
def chat_with_copilot(req: ChatRequest):
    """
    Interact with the GridMind AI Energy Copilot.
    Injects real-time microgrid telemetry, multi-agent decisions, and economics into the prompt.
    """
    from .routes import global_sim, global_orchestrator
    
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    res = llm_service.chat(
        message=req.message,
        history=req.history,
        sim=global_sim,
        orchestrator=global_orchestrator
    )
    return res


@router.post("/explain")
def explain_agent_decision(req: ExplainRequest):
    """
    Explainable AI (XAI): Generate deep technical and economic explanation
    for an autonomous agent's decision or logged action.
    """
    from .routes import global_sim, global_orchestrator

    res = llm_service.explain_decision(
        decision_data=req.decision,
        sim=global_sim,
        orchestrator=global_orchestrator
    )
    return res


@router.post("/executive-summary")
def generate_executive_report(req: ExecutiveSummaryRequest):
    """
    Generate an Executive Strategic Audit comparing Mode A (Baseline) vs Mode B (GridMind)
    with deep LLM-powered engineering and economic synthesis.
    """
    from .routes import global_sim

    sc_name = req.scenario or global_sim.scenario_name

    # 1. Run Baseline
    baseline_runner = BaselineSimulator(sc_name)
    base_metrics, base_states = baseline_runner.run_full_simulation()

    # 2. Run GridMind
    gridmind_runner = MicrogridSimulator(sc_name)
    gridmind_orch = MultiAgentOrchestrator(gridmind_runner)
    for _ in range(gridmind_runner.total_steps):
        gridmind_orch.step()
    gm_metrics = gridmind_runner.get_metrics(mode="GRIDMIND")

    # 3. Compare metrics
    comp = compare_metrics(base_metrics, gm_metrics)

    comparison_data = {
        "comparison": comp,
        "scenario": sc_name
    }

    report_res = llm_service.generate_executive_summary(
        comparison_data=comparison_data,
        scenario_name=sc_name
    )

    return {
        "scenario": sc_name,
        "executive_report": report_res.get("report"),
        "is_live_llm": report_res.get("is_live_llm"),
        "model": report_res.get("model"),
        "comparison": comp
    }
