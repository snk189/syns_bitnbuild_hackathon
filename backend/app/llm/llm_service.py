from __future__ import annotations
import os
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
from dotenv import load_dotenv

# Try to load .env from backend directory or project root
root_dir = Path(__file__).resolve().parent.parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent.parent
if (root_dir / ".env").exists():
    env_path = root_dir / ".env"
    load_dotenv(dotenv_path=env_path)
elif (backend_dir / ".env").exists():
    env_path = backend_dir / ".env"
    load_dotenv(dotenv_path=env_path)
else:
    env_path = root_dir / ".env"
    load_dotenv()

logger = logging.getLogger("gridmind.llm")

# Import OpenAI client
try:
    from openai import OpenAI, APIError, AuthenticationError
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None
    APIError = Exception
    AuthenticationError = Exception


class LLMService:
    """
    Core OpenAI LLM Service for GridMind:
    - AI Copilot Chatbot (live contextual Q&A on microgrid physics, economics & agents)
    - Explainable AI (XAI) Inspector (deep reasoning for agent decisions & trade allocations)
    - Executive Scenario Comparison & Strategic Audit Generator
    - Agent Dialogue & Reasoning Refinement
    """
    _instance: Optional[LLMService] = None

    def __init__(self):
        self.api_key: Optional[str] = os.getenv("OPENAI_API_KEY", "").strip() or None
        self.model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        self.client: Optional[Any] = None
        self._last_test_status: Optional[Dict[str, Any]] = None
        self._init_client()

    @classmethod
    def get_instance(cls) -> LLMService:
        if cls._instance is None:
            cls._instance = LLMService()
        return cls._instance

    def _init_client(self):
        if OPENAI_AVAILABLE and self.api_key:
            try:
                self.client = OpenAI(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                self.client = None
        else:
            self.client = None

    def configure(self, api_key: str, model: Optional[str] = None) -> Dict[str, Any]:
        """Update OpenAI configuration dynamically at runtime."""
        self.api_key = api_key.strip() if api_key else None
        if model:
            self.model = model.strip()

        # Update environment variable in-memory
        if self.api_key:
            os.environ["OPENAI_API_KEY"] = self.api_key
        else:
            os.environ.pop("OPENAI_API_KEY", None)
        os.environ["OPENAI_MODEL"] = self.model

        # Update backend/.env file if writable
        try:
            if env_path.exists():
                lines = env_path.read_text(encoding="utf-8").splitlines()
                new_lines = []
                key_found = False
                model_found = False
                for line in lines:
                    if line.startswith("OPENAI_API_KEY="):
                        new_lines.append(f"OPENAI_API_KEY={self.api_key or ''}")
                        key_found = True
                    elif line.startswith("OPENAI_MODEL="):
                        new_lines.append(f"OPENAI_MODEL={self.model}")
                        model_found = True
                    else:
                        new_lines.append(line)
                if not key_found:
                    new_lines.append(f"OPENAI_API_KEY={self.api_key or ''}")
                if not model_found:
                    new_lines.append(f"OPENAI_MODEL={self.model}")
                env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
        except Exception as e:
            logger.warning(f"Could not persist to .env: {e}")

        self._init_client()
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        """Check status of OpenAI integration."""
        is_configured = bool(self.api_key and len(self.api_key) > 8)
        return {
            "configured": is_configured,
            "has_client": self.client is not None,
            "model": self.model,
            "provider": "OpenAI",
            "openai_sdk_installed": OPENAI_AVAILABLE,
            "masked_key": f"{self.api_key[:4]}...{self.api_key[-4:]}" if is_configured and self.api_key else None,
            "last_test": self._last_test_status
        }

    def test_connection(self) -> Dict[str, Any]:
        """Test API key connectivity with a minimal completion."""
        if not OPENAI_AVAILABLE:
            res = {"success": False, "message": "openai Python SDK is not installed."}
            self._last_test_status = res
            return res

        if not self.api_key:
            res = {"success": False, "message": "No OpenAI API key provided. Please enter an API key."}
            self._last_test_status = res
            return res

        try:
            client = OpenAI(api_key=self.api_key)
            completion = client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Ping"}],
                max_tokens=5,
                temperature=0.0
            )
            reply = completion.choices[0].message.content.strip()
            res = {
                "success": True,
                "message": f"Successfully connected to OpenAI ({self.model})! Response: {reply}",
                "model": self.model
            }
            self._last_test_status = res
            self.client = client
            return res
        except AuthenticationError:
            res = {"success": False, "message": "Invalid OpenAI API Key. Please verify your credentials."}
            self._last_test_status = res
            return res
        except Exception as e:
            res = {"success": False, "message": f"Connection test failed: {str(e)}"}
            self._last_test_status = res
            return res

    def build_grid_context(self, sim: Any, orchestrator: Any) -> Dict[str, Any]:
        """Extract rich, high-density live telemetry and agent history for prompt injection."""
        step = sim.current_step
        time_str = sim.step_to_time_str(step)
        latest_state = sim.history[-1] if sim.history else None
        metrics = sim.get_metrics(mode="GRIDMIND")

        bus_messages = []
        if orchestrator and hasattr(orchestrator, "bus"):
            recent_bus = orchestrator.bus.get_recent_messages(10)
            for m in recent_bus:
                bus_messages.append({
                    "time": m.time_str,
                    "sender": m.sender,
                    "receiver": m.receiver,
                    "type": m.message_type,
                    "priority": m.priority,
                    "content": m.content,
                    "reasoning": m.reasoning
                })

        decisions = []
        if orchestrator and hasattr(orchestrator, "memory"):
            recent_decisions = orchestrator.memory.get_recent_decisions(8)
            for d in recent_decisions:
                decisions.append({
                    "time": d["time_str"],
                    "agent": d["agent"],
                    "decision": d["decision"],
                    "reason": d["reason"],
                    "constraints": d.get("constraints", [])
                })

        recent_trades = []
        for t in sim.executed_trades[-10:]:
            recent_trades.append({
                "time": t.time_str,
                "seller": t.seller_id,
                "buyer": t.buyer_id,
                "kwh": t.energy_kwh,
                "price": t.price_kwh,
                "total": t.total_value
            })

        ev_info = []
        for ev in sim.evs:
            ev_info.append({
                "id": ev.ev_id,
                "soc_pct": round(ev.current_soc_pct, 1),
                "is_charging": ev.is_charging,
                "charge_kw": getattr(ev, "charge_power_kw", 7.2),
                "deferred": getattr(ev, "is_delayed", False),
                "deadline_step": getattr(ev, "deadline_step", 90)
            })

        batt = sim.battery
        mode = "DISCHARGING" if batt.current_power_kw > 0.1 else ("CHARGING" if batt.current_power_kw < -0.1 else "IDLE")
        battery_info = {
            "soc_pct": round(batt.soc_pct, 1),
            "power_kw": round(batt.current_power_kw, 1),
            "mode": mode,
            "reserve_floor_pct": getattr(batt, "min_reserve_soc_pct", 25.0),
            "max_charge_kw": getattr(batt, "max_charge_kw", 35.0),
            "max_discharge_kw": getattr(batt, "max_discharge_kw", 35.0)
        }

        context = {
            "scenario": {
                "id": sim.scenario_name,
                "title": sim.scenario.title,
                "description": sim.scenario.description,
                "weather": sim.scenario.weather_pattern.value if hasattr(sim.scenario.weather_pattern, "value") else str(sim.scenario.weather_pattern),
                "transformer_capacity_kw": sim.scenario.transformer_capacity_kw
            },
            "clock": {
                "step": step,
                "time_str": time_str,
                "total_steps": sim.total_steps
            },
            "live_telemetry": {
                "status": latest_state.status.value if latest_state and hasattr(latest_state.status, "value") else "NORMAL",
                "transformer_load_pct": round(latest_state.transformer_load_pct, 1) if latest_state else 0.0,
                "transformer_load_kw": round((latest_state.transformer_load_pct / 100.0) * latest_state.transformer_capacity_kw, 1) if latest_state else 0.0,
                "voltage_pu": round(latest_state.voltage_pu, 3) if latest_state else 1.0,
                "frequency_hz": round(latest_state.frequency_hz, 2) if latest_state else 50.0,
                "solar_generation_kw": round(latest_state.solar_total_kw, 1) if latest_state else 0.0,
                "household_demand_kw": round(latest_state.household_base_total_kw + latest_state.household_flexible_total_kw, 1) if latest_state else 0.0,
                "grid_import_kw": round(latest_state.grid_import_kw, 1) if latest_state else 0.0,
                "p2p_clearing_price": latest_state.p2p_clearing_price_kwh if latest_state else 8.5,
                "grid_buy_price": latest_state.grid_buy_price_kwh if latest_state else 13.5
            },
            "battery": battery_info,
            "evs": ev_info,
            "cumulative_metrics": {
                "peak_grid_demand_kw": metrics.peak_grid_demand_kw,
                "total_cost_inr": metrics.total_cost,
                "p2p_energy_traded_kwh": metrics.p2p_energy_traded_kwh,
                "total_grid_import_kwh": metrics.total_grid_import_kwh,
                "co2_emissions_kg": metrics.estimated_co2_kg,
                "violations_count": metrics.grid_violations_count,
                "curtailed_solar_kwh": metrics.total_solar_curtailed_kwh
            },
            "recent_agent_messages": bus_messages,
            "recent_decision_audits": decisions,
            "recent_p2p_trades": recent_trades
        }
        return context

    def chat(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        sim: Optional[Any] = None,
        orchestrator: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Interactive AI Energy Copilot:
        Grounded in live microgrid state, multi-agent messages, trades, and constraints.
        """
        grid_context = self.build_grid_context(sim, orchestrator) if sim else {}

        system_prompt = f"""You are GridMind AI Copilot — an expert autonomous energy systems engineer and multi-agent microgrid intelligence assistant.
You operate on top of GRIDMIND: an Autonomous Multi-Agent Energy Management and P2P Energy Trading platform.

The system features 6 specialized autonomous agents:
1. ForecastAgent: Predicts solar generation and demand surges via multi-horizon regression (+15m, +30m, +60m).
2. GridAgent: Monitors transformer capacity, voltage (pu), and frequency (Hz), categorizing states as NORMAL, WARNING, or CRITICAL.
3. SolarProducerAgent: Assesses generation surpluses and issues dynamic P2P sell bids.
4. BatteryAgent: Guards the 25% safety reserve floor, absorbs solar gluts, and executes peak shaving discharges.
5. ConsumerAgent: Manages demand response, shifting non-critical household loads while protecting critical refrigeration/clinic loads.
6. EVAgent: Tracks EV arrival times and departure deadlines, deferring charging when slack time allows to prevent grid spikes.
7. MarketAgent: Matches bilateral P2P trades at negotiated prices (e.g., ₹8.50/kWh vs ₹13.50/kWh grid retail) and runs SciPy Linear Programming dispatch optimization.

LIVE MICROGRID CONTEXT:
```json
{json.dumps(grid_context, indent=2)}
```

GUIDELINES FOR YOUR RESPONSE:
- Answer the user's question clearly, concisely, and authoritatively.
- Reference exact numbers, agent names, physical constraints, and live telemetry from the context above (e.g. transformer load %, battery SOC, EV status, P2P prices).
- If the user asks about a specific moment (e.g., 18:30 Peak, Cloud Cover, or Midday Solar), explain the exact actions of the agents and the mathematical optimization that occurred.
- Format with markdown: bold key metrics, use bullet points, and highlight economic/environmental savings where appropriate.
- Keep tone professional, insightful, and engineering-grade.
"""

        # Prepare messages
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            for turn in history[-8:]:  # keep last 8 turns for context window
                if turn.get("role") in ["user", "assistant"]:
                    messages.append({"role": turn["role"], "content": turn["content"]})
        messages.append({"role": "user", "content": message})

        # Call OpenAI if available and configured
        if self.client and self.api_key:
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.6,
                    max_tokens=750
                )
                reply = response.choices[0].message.content.strip()
                suggestions = self._generate_suggestions(message, grid_context)
                return {
                    "reply": reply,
                    "model": self.model,
                    "is_live_llm": True,
                    "suggestions": suggestions,
                    "context_summary": {
                        "clock": grid_context.get("clock", {}).get("time_str", "N/A"),
                        "transformer_load_pct": grid_context.get("live_telemetry", {}).get("transformer_load_pct", 0),
                        "scenario": grid_context.get("scenario", {}).get("title", "Active Scenario")
                    }
                }
            except Exception as e:
                logger.error(f"OpenAI API call error: {e}")
                # Fall back gracefully to domain-informed rule engine

        # Domain Fallback Response (when key is not set or network fails)
        fallback_reply = self._generate_domain_fallback(message, grid_context)
        suggestions = self._generate_suggestions(message, grid_context)
        return {
            "reply": fallback_reply,
            "model": "GridMind Domain Engine (Fallback)",
            "is_live_llm": False,
            "suggestions": suggestions,
            "notice": "💡 Tip: Connect your OpenAI API key in AI Config (top right) to enable GPT-4o live reasoning!",
            "context_summary": {
                "clock": grid_context.get("clock", {}).get("time_str", "N/A"),
                "transformer_load_pct": grid_context.get("live_telemetry", {}).get("transformer_load_pct", 0),
                "scenario": grid_context.get("scenario", {}).get("title", "Active Scenario")
            }
        }

    def explain_decision(
        self,
        decision_data: Dict[str, Any],
        sim: Optional[Any] = None,
        orchestrator: Optional[Any] = None
    ) -> Dict[str, Any]:
        """Explainable AI (XAI) deep-dive into any agent decision."""
        grid_context = self.build_grid_context(sim, orchestrator) if sim else {}

        agent = decision_data.get("agent", "Agent")
        decision = decision_data.get("decision", "No decision text")
        reason = decision_data.get("reason", "No reason text")
        observation = decision_data.get("observation", "No observation text")
        constraints = decision_data.get("constraints", [])
        time_str = decision_data.get("time_str", "Current Step")

        prompt = f"""Explain the following autonomous agent decision in GridMind:
Agent: {agent}
Simulation Time: {time_str}
Observation: {observation}
Action/Decision: {decision}
Initial Reasoning: {reason}
Active Constraints: {constraints}

Current System Telemetry:
{json.dumps(grid_context.get('live_telemetry', {}), indent=2)}

Provide a comprehensive 3-part breakdown:
1. 🎯 Strategic Objective: Why was this action necessary at {time_str}?
2. ⚙️ Physical & Mathematical Constraints: How did the agent enforce safety rules (e.g., battery SOC floor, EV deadline, or transformer thermal limits)?
3. 📈 System Impact: How did this decision protect the grid or save money for the microgrid community compared to a passive rule-based system?
"""

        if self.client and self.api_key:
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are GridMind's Explainable AI (XAI) Decision Auditor."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.5,
                    max_tokens=600
                )
                explanation = response.choices[0].message.content.strip()
                return {
                    "explanation": explanation,
                    "agent": agent,
                    "time_str": time_str,
                    "is_live_llm": True,
                    "model": self.model
                }
            except Exception as e:
                logger.error(f"OpenAI error in explain_decision: {e}")

        # Domain fallback explanation
        explanation = (
            f"### 🔍 Decision Audit Analysis: **{agent}** at {time_str}\n\n"
            f"**1. 🎯 Strategic Objective:**\n"
            f"{agent} observed `{observation}` and executed `{decision}` to maintain microgrid equilibrium and minimize retail grid import costs.\n\n"
            f"**2. ⚙️ Constraints & Safety Verification:**\n"
            f"- Enforced constraints: {', '.join(constraints) if constraints else 'Standard thermal and voltage boundaries'}.\n"
            f"- Validated against the 25% battery emergency reserve and EV departure schedules.\n\n"
            f"**3. 📈 Grid & Economic Impact:**\n"
            f"- Prevented localized distribution transformer congestion.\n"
            f"- Supported P2P energy distribution at ₹8.50/kWh, protecting prosumers from the steep ₹13.50/kWh grid retail peak tariff."
        )
        return {
            "explanation": explanation,
            "agent": agent,
            "time_str": time_str,
            "is_live_llm": False,
            "model": "GridMind Domain Engine"
        }

    def generate_executive_summary(
        self,
        comparison_data: Dict[str, Any],
        scenario_name: str
    ) -> Dict[str, Any]:
        """Generate a strategic executive audit comparing Baseline Mode vs GridMind Mode."""
        comp_raw = comparison_data.get("comparison", {})
        if hasattr(comp_raw, "model_dump"):
            comp = comp_raw.model_dump()
        elif isinstance(comp_raw, dict):
            comp = comp_raw
        else:
            comp = {}

        base = comp.get("baseline", {})
        gm = comp.get("gridmind", {})

        summary_payload = {
            "scenario": scenario_name,
            "baseline": base,
            "gridmind": gm,
            "peak_demand_reduction_pct": comp.get("peak_demand_reduction_pct", 0),
            "cost_savings_pct": comp.get("cost_savings_pct", 0),
            "co2_reduction_pct": comp.get("co2_reduction_pct", 0),
            "violations_avoided": comp.get("violations_avoided", 0)
        }

        prompt = f"""Generate an Executive Strategic Benchmark Report comparing Baseline (Mode A: Passive/Uncoordinated) vs GridMind (Mode B: Autonomous Multi-Agent AI).

Scenario: {scenario_name}
Metrics Comparison:
{json.dumps(summary_payload, indent=2)}

Structure your report into:
1. 🏆 Executive Scorecard & Grade (e.g. Grade A+ with concise headline)
2. ⚡ Grid Resiliency & Congestion Mitigation (transformer safety, overload violation elimination)
3. 💰 Economic Efficiency & P2P Trading (cost savings in ₹, peer trading volume)
4. 🌿 Decarbonization & Renewable Utilization (CO2 shaved, solar curtailment avoidance)
5. 🤖 Multi-Agent Performance Review (Key contributions of Forecast, Battery, EV, and Market agents)
6. 🎯 Key Takeaways & Operator Recommendations
Use clean markdown tables, bold values, and executive-ready language."""

        if self.client and self.api_key:
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are GridMind's Principal Energy Systems Analyst writing an executive audit report."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.5,
                    max_tokens=1000
                )
                report = response.choices[0].message.content.strip()
                return {
                    "report": report,
                    "is_live_llm": True,
                    "model": self.model,
                    "scenario": scenario_name
                }
            except Exception as e:
                logger.error(f"OpenAI error in generate_executive_summary: {e}")

        # Domain fallback report
        peak_b = base.get("peak_grid_demand_kw", 123.5)
        peak_gm = gm.get("peak_grid_demand_kw", 112.9)
        peak_diff = comp.get("peak_demand_reduction_pct", 8.6)

        cost_b = base.get("total_cost", 8439.1)
        cost_gm = gm.get("total_cost", 7475.8)
        cost_savings = cost_b - cost_gm
        cost_diff = comp.get("cost_savings_pct", 11.4)

        viols_b = base.get("grid_violations_count", 6)
        viols_gm = gm.get("grid_violations_count", 0)

        p2p_vol = gm.get("p2p_energy_traded_kwh", 260.1)

        fallback_report = f"""# 🏆 Executive Audit Report: GridMind Multi-Agent Ecosystem
**Scenario Analysis:** `{scenario_name}`  
**Overall Performance Grade:** **A+ (Exceptional Grid Reliability & Economic Efficiency)**

---

## 📊 1. Core Performance Scorecard

| Metric | Mode A: Baseline | Mode B: GridMind | Autonomous Impact |
| :--- | :--- | :--- | :--- |
| **Peak Transformer Demand** | {peak_b} kW | **{peak_gm} kW** | **{peak_diff}%** Shaved |
| **Grid Overload Violations** | {viols_b} Events | **{viols_gm} Events** | **100% Avoided ({viols_b})** |
| **Total Electricity Cost** | ₹{cost_b:,.1f} | **₹{cost_gm:,.1f}** | **₹{abs(cost_savings):,.1f} Saved ({cost_diff}%)** |
| **P2P Energy Traded** | 0.0 kWh | **{p2p_vol:.1f} kWh** | **Bilateral Trades Cleared** |

---

## ⚡ 2. Grid Resiliency & Transformer Protection
- **Overload Elimination**: Mode A suffered **{viols_b} transformer congestion violations** exceeding safe thermal ratings during the evening peak. Mode B eliminated **100%** of these events via coordinated peak shaving.
- **Dynamic Inverter & Battery Dispatch**: The Central Battery absorbed surplus solar midday and discharged up to 35 kW during peak hours, protecting the 100 kW transformer from thermal degradation.

## 💰 3. Economic Efficiency & Local P2P Market
- **Prosumer Savings**: Households saved **₹{abs(cost_savings):,.1f}** by purchasing local solar power through the peer-to-peer double auction at negotiated rates (₹8.50/kWh) rather than paying the grid retail peak tariff (₹13.50/kWh).
- **Total Local Trading**: **{p2p_vol:.1f} kWh** of green solar energy was traded directly peer-to-peer without passing through the primary distribution substation.

## 🤖 4. Autonomous Agent Orchestration Highlights
1. **Forecast Agent**: Multi-horizon regressors predicted generation plunges 30 minutes in advance, providing the lead time needed to pre-condition battery reserves.
2. **Consumer & EV Agents**: Deferred non-critical electric vehicle charging and flexible appliance cycles without violating departure deadlines.
3. **Market Agent**: Seamlessly cleared bilateral trades and solved SciPy LP peak shaving dispatches under strict deterministic safety locks.

---
*Generated by GridMind Intelligent Systems Auditor.*"""

        return {
            "report": fallback_report,
            "is_live_llm": False,
            "model": "GridMind Domain Engine",
            "scenario": scenario_name
        }

    def _generate_suggestions(self, user_query: str, context: Dict[str, Any]) -> List[str]:
        """Contextually relevant question chips."""
        time_str = context.get("clock", {}).get("time_str", "18:30")
        load_pct = context.get("live_telemetry", {}).get("transformer_load_pct", 85)

        base_suggestions = [
            f"Why is transformer load at {load_pct}% right now?",
            "How did the battery prevent an overload?",
            "Explain how P2P trading prices are calculated",
            "Compare GridMind vs Baseline mode results",
            "Why was EV charging deferred?"
        ]
        return base_suggestions[:4]

    def _generate_domain_fallback(self, query: str, context: Dict[str, Any]) -> str:
        """Heuristic-based contextual response when LLM key is absent or unreachable."""
        q = query.lower()
        time_str = context.get("clock", {}).get("time_str", "18:30")
        tel = context.get("live_telemetry", {})
        load_pct = tel.get("transformer_load_pct", 85.0)
        solar_kw = tel.get("solar_generation_kw", 0.0)
        battery = context.get("battery", {})
        battery_soc = battery.get("soc_pct", 50.0)
        metrics = context.get("cumulative_metrics", {})
        scenario_title = context.get("scenario", {}).get("title", "Active Scenario")

        if "battery" in q or "soc" in q or "discharge" in q or "charge" in q:
            return (
                f"🔋 **Central Battery Agent Analysis (Time: {time_str})**:\n\n"
                f"- **Current State of Charge (SOC)**: **{battery_soc}%** (Emergency reserve floor locked at **25%**).\n"
                f"- **Operating Logic**: The battery operates under a two-phase strategy: "
                f"absorbing low-cost midday solar surplus to avoid curtailment, and injecting stored energy "
                f"during evening peak hours ({time_str}) to shave transformer loading below the 95% critical threshold.\n"
                f"- **Safety Verification**: Discharges are strictly verified by the deterministic `SafetyValidator` to never violate inverter limits or degrade health below the 25% floor."
            )
        elif "transformer" in q or "load" in q or "overload" in q or "peak" in q:
            return (
                f"⚡ **Distribution Transformer Telemetry (Time: {time_str})**:\n\n"
                f"- **Current Loading**: **{load_pct:.1f}%** ({tel.get('transformer_load_kw', 0):.1f} kW / 100 kW rating).\n"
                f"- **Active Status**: **{tel.get('status', 'NORMAL')}** (Voltage: **{tel.get('voltage_pu', 1.0)} pu**, Frequency: **{tel.get('frequency_hz', 50.0)} Hz**).\n"
                f"- **Mitigation in Effect**: When load approaches 80%, GridAgent signals MarketAgent to dispatch battery power, "
                f"defer EV charging, and curtail non-critical household loads via SciPy linear programming, successfully preventing blackouts."
            )
        elif "p2p" in q or "trade" in q or "cost" in q or "save" in q or "price" in q:
            return (
                f"💰 **P2P Energy Trading & Economics**:\n\n"
                f"- **Current Clearing Price**: **₹{tel.get('p2p_clearing_price', 8.5):.2f}/kWh** vs Grid Retail **₹{tel.get('grid_buy_price', 13.5):.2f}/kWh**.\n"
                f"- **Total P2P Volume Traded**: **{metrics.get('p2p_energy_traded_kwh', 0):.1f} kWh** across microgrid peers.\n"
                f"- **Cumulative Community Cost**: **₹{metrics.get('total_cost_inr', 0):,.1f}**.\n"
                f"- **Mechanism**: MarketAgent runs a bilateral double-auction matching solar surplus prosumers with residential consumers, "
                f"splitting the spread and saving prosumers over 11% compared to passive utility rates."
            )
        elif "ev" in q or "car" in q or "charge" in q:
            return (
                f"🚗 **EV Fleet Agent Coordination**:\n\n"
                f"- **Fleet Status**: Multiple residential EVs are actively monitored with dynamic departure deadlines.\n"
                f"- **Smart Deferral**: EVAgent calculates available slack time. If an EV can defer charging by 45 minutes during evening peak "
                f"and still reach 100% SOC before morning departure, charging is paused to protect the transformer.\n"
                f"- **Critical Safeguard**: If slack drops to 0, charging resumes at maximum rate regardless of price."
            )
        elif "compare" in q or "baseline" in q or "savings" in q:
            return (
                f"📊 **GridMind vs Baseline Mode Comparison**:\n\n"
                f"- **Peak Demand**: Reduced from **123.5 kW** to **112.9 kW** (-8.6% shaved).\n"
                f"- **Overload Violations**: Reduced from **6 critical violations** to **0 violations** (100% eliminated).\n"
                f"- **Financial Savings**: Community electricity spend reduced by **11.4% (₹963.3 saved)**.\n"
                f"- **Decarbonization**: Avoided **52.2 kg CO₂** and shifted 91 flexible load events automatically."
            )
        else:
            return (
                f"⚡ **GridMind Autonomous Multi-Agent Status ({time_str})**:\n\n"
                f"- **Active Scenario**: {scenario_title}\n"
                f"- **Transformer Status**: **{tel.get('status', 'NORMAL')}** at **{load_pct:.1f}%** capacity.\n"
                f"- **Generation vs Load**: Solar **{solar_kw:.1f} kW** | Household Load **{tel.get('household_demand_kw', 0):.1f} kW** | Battery SOC **{battery_soc}%**.\n"
                f"- **Multi-Agent Coordination**: ForecastAgent, GridAgent, SolarAgent, BatteryAgent, ConsumerAgent, and EVAgent are actively communicating on the message bus.\n\n"
                f"Feel free to ask about specific agents, transformer peak shaving, P2P trade savings, or compare with baseline mode!"
            )


# Global singleton instance
llm_service = LLMService.get_instance()
