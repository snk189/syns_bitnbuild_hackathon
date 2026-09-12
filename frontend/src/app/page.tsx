"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Sun,
  Zap,
  Bot,
  Sliders,
  Cpu,
  Activity,
  ArrowRight,
  BatteryCharging,
  ShieldCheck,
  CheckCircle2,
  Layers,
  BarChart2,
  Compass,
} from "lucide-react";
import { Header, AdminTab } from "../components/Header";
import { GridStatusBanner } from "../components/GridStatusBanner";
import { MetricsCards } from "../components/MetricsCards";
import { EnergyFlowDiagram } from "../components/EnergyFlowDiagram";
import { AgentActivityFeed } from "../components/AgentActivityFeed";
import { P2PTradingLedger } from "../components/P2PTradingLedger";
import { AgentDecisionAudit } from "../components/AgentDecisionAudit";
import { ComparisonModal } from "../components/ComparisonModal";
import { WhatIfPlannerModal } from "../components/WhatIfPlannerModal";
import { EventTimeline } from "../components/EventTimeline";
import { GridMindCopilot } from "../components/GridMindCopilot";
import { AIConfigModal } from "../components/AIConfigModal";
import { AgentDecisionsView } from "../components/AgentDecisionsView";
import { UserTradingView } from "../components/UserTradingView";
import { LoginPortal } from "../components/LoginPortal";
import { EnergySourcesView } from "../components/EnergySourcesView";
import { ScenariosView } from "../components/ScenariosView";
import { AnalyticsView } from "../components/AnalyticsView";
import {
  GridState,
  SimulationMetrics,
  ScenarioInfo,
  AgentMessage,
  AgentDecisionLog,
  P2PTrade,
  LLMStatus,
} from "../types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== "undefined"
    ? `ws://${window.location.hostname}:8000/ws`
    : "ws://127.0.0.1:8000/ws");

export default function DashboardPage() {
  // User Session / Demo Role State
  const [currentUser, setCurrentUser] = useState<{ name: string; role: "admin" | "user" } | null>(null);

  // Simulation & Grid State
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [decisions, setDecisions] = useState<AgentDecisionLog[]>([]);
  const [trades, setTrades] = useState<P2PTrade[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [currentScenario, setCurrentScenario] = useState("cloud_cover_peak");
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [crisisTriggered, setCrisisTriggered] = useState(false);

  // Modals & Navigation
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("dashboard");
  const [bottomTab, setBottomTab] = useState<"p2p" | "audit">("p2p");
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);

  // AI Copilot & OpenAI Key States
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<LLMStatus | null>(null);
  const [externalPrompt, setExternalPrompt] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);

  // Check sessionStorage for active session on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = sessionStorage.getItem("gridmind_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.name && parsed.role) {
            setCurrentUser(parsed);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleLogin = (name: string, role: "admin" | "user") => {
    const user = { name, role };
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("gridmind_user", JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("gridmind_user");
    }
  };

  // 1. Fetch initial state, scenarios & AI status
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [stateRes, scRes, tradesRes, msgsRes, logsRes, aiRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/state`),
          fetch(`${BACKEND_URL}/api/simulation/scenarios`),
          fetch(`${BACKEND_URL}/api/market/trades`),
          fetch(`${BACKEND_URL}/api/agents/messages`),
          fetch(`${BACKEND_URL}/api/agents/logs`),
          fetch(`${BACKEND_URL}/api/llm/status`).catch(() => null),
        ]);

        if (stateRes.ok) {
          const json = await stateRes.json();
          setGridState(json.state);
          setMetrics(json.metrics);
          setIsRunning(json.is_running);
          setCurrentScenario(json.scenario);
          setCrisisTriggered(json.crisis_triggered);
        }
        if (scRes.ok) {
          const scJson = await scRes.json();
          setScenarios(scJson);
        }
        if (tradesRes.ok) {
          const tJson = await tradesRes.json();
          setTrades(tJson);
        }
        if (msgsRes.ok) {
          const mJson = await msgsRes.json();
          setMessages(mJson);
        }
        if (logsRes.ok) {
          const lJson = await logsRes.json();
          setDecisions(lJson);
        }
        if (aiRes && aiRes.ok) {
          const aiJson = await aiRes.json();
          setAiStatus(aiJson);
        }
      } catch (err) {
        console.error("Failed to connect to backend", err);
      }
    };

    fetchInit();
  }, []);

  // 2. WebSocket Real-Time Connection
  useEffect(() => {
    let ws: WebSocket;
    const connectWs = () => {
      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("Connected to GridMind Live WebSocket");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "TICK_UPDATE" || data.type === "INIT_STATE") {
              if (data.state) setGridState(data.state);
              if (data.metrics) setMetrics(data.metrics);
              if (data.messages && data.messages.length > 0) {
                setMessages((prev) => {
                  const existingIds = new Set(prev.map((m) => m.id));
                  const newOnes = data.messages.filter((m: AgentMessage) => !existingIds.has(m.id));
                  return [...prev, ...newOnes];
                });
              }
              if (data.decisions && data.decisions.length > 0) {
                setDecisions(data.decisions);
              }
              if (data.trades && data.trades.length > 0) {
                setTrades(data.trades);
              }
            }
          } catch (e) {
            console.error("Error parsing WS frame", e);
          }
        };

        ws.onclose = () => {
          setTimeout(connectWs, 2000);
        };
      } catch (e) {
        console.error("WebSocket connection error", e);
      }
    };

    connectWs();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Handlers for Simulation Controls
  const handlePlayPause = async () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    const endpoint = nextState ? "/api/simulation/start" : "/api/simulation/pause";
    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setIsRunning(json.is_running);
      } else {
        setIsRunning(!nextState);
      }
    } catch (e) {
      console.error("Control action error", e);
      setIsRunning(!nextState);
    }
  };

  const handleStep = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/step`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.state) setGridState(data.state);
        if (data.metrics) setMetrics(data.metrics);
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newOnes = data.messages.filter((m: AgentMessage) => !existingIds.has(m.id));
            return [...prev, ...newOnes];
          });
        }
        if (data.decisions && data.decisions.length > 0) {
          setDecisions(data.decisions);
        }
        if (data.trades && data.trades.length > 0) {
          setTrades(data.trades);
        }
      }
    } catch (e) {
      console.error("Step error", e);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: currentScenario }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) setGridState(data.state);
        if (data.metrics) setMetrics(data.metrics);
        if (data.messages && data.messages.length > 0) setMessages(data.messages);
        if (data.decisions && data.decisions.length > 0) setDecisions(data.decisions);
        if (data.trades && data.trades.length > 0) setTrades(data.trades);
        setIsRunning(false);
        setCrisisTriggered(false);
      }
    } catch (e) {
      console.error("Reset error", e);
    }
  };

  const handleSpeedChange = async (s: number) => {
    setSpeed(s);
    try {
      await fetch(`${BACKEND_URL}/api/simulation/speed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed: s }),
      });
    } catch (e) {
      console.error("Speed change error", e);
    }
  };

  const handleScenarioChange = async (scId: string) => {
    setCurrentScenario(scId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) setGridState(data.state);
        if (data.metrics) setMetrics(data.metrics);
        if (data.messages && data.messages.length > 0) setMessages(data.messages);
        if (data.decisions && data.decisions.length > 0) setDecisions(data.decisions);
        if (data.trades && data.trades.length > 0) setTrades(data.trades);
      }
      setIsRunning(false);
      setCrisisTriggered(false);
    } catch (e) {
      console.error("Scenario change error", e);
    }
  };

  const handleTriggerCrisis = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/trigger-crisis`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.state) setGridState(data.state);
        if (data.metrics) setMetrics(data.metrics);
        if (data.messages && data.messages.length > 0) setMessages(data.messages);
        if (data.decisions && data.decisions.length > 0) setDecisions(data.decisions);
        if (data.trades && data.trades.length > 0) setTrades(data.trades);
      }
      setCrisisTriggered(true);
    } catch (e) {
      console.error("Crisis trigger error", e);
    }
  };

  const handleJumpTo = async (targetStep: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/jump`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: targetStep }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) setGridState(data.state);
        if (data.metrics) setMetrics(data.metrics);
        if (data.messages && data.messages.length > 0) setMessages(data.messages);
        if (data.decisions && data.decisions.length > 0) setDecisions(data.decisions);
        if (data.trades && data.trades.length > 0) setTrades(data.trades);
      }
    } catch (e) {
      console.error("Jump error", e);
    }
  };

  const handlePlanExecuted = (data: any) => {
    if (data.state) setGridState(data.state);
    if (data.metrics) setMetrics(data.metrics);
    if (data.messages && data.messages.length > 0) setMessages(data.messages);
    if (data.decisions && data.decisions.length > 0) setDecisions(data.decisions);
    if (data.trades && data.trades.length > 0) setTrades(data.trades);
  };

  const handleStateUpdated = (newState: GridState, newMetrics?: SimulationMetrics) => {
    setGridState(newState);
    if (newMetrics) setMetrics(newMetrics);
  };

  const handleExplainDecision = (decision: AgentDecisionLog) => {
    setExternalPrompt(
      `Please explain the rationale behind this decision by ${decision.agent} at ${decision.time_str}:\nDecision: "${decision.decision}"\nReason: "${decision.reason}"\nObservation: "${decision.observation}"\nWhy was this chosen over other alternatives?`
    );
    setIsCopilotOpen(true);
  };

  const handleExplainMessage = (msg: AgentMessage) => {
    setExternalPrompt(
      `Analyze this agent communication sent by ${msg.sender} to ${msg.receiver} at ${msg.time_str} (${msg.message_type}, priority: ${msg.priority}):\nContent: "${msg.content}"\nReasoning: "${msg.reasoning || 'N/A'}"\nWhat are the grid implications?`
    );
    setIsCopilotOpen(true);
  };

  // IF NO USER IS LOGGED IN: Render Login / Entry Portal
  if (!currentUser) {
    return <LoginPortal onLogin={handleLogin} />;
  }

  // IF NORMAL USER IS LOGGED IN: Render Only User P2P Trading View
  if (currentUser.role === "user") {
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
        <header className="w-full glass-panel border-b border-slate-800/80 px-4 lg:px-6 py-3 sticky top-0 z-40 bg-[#050811]/90 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-wider text-white">GRIDMIND P2P</h1>
                <p className="text-[10px] text-slate-400">Decentralized Energy Marketplace</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400">
                Welcome, <strong className="text-cyan-300">{currentUser.name}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/30 hover:text-rose-300 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6">
          <UserTradingView
            gridState={gridState}
            metrics={metrics}
            trades={trades}
            initialUserName={currentUser.name}
            onLogout={handleLogout}
            onTradeExecuted={handleStep}
          />
        </main>
      </div>
    );
  }

  // ADMIN MODE: Full GridMind Control Center
  const activeScenarioObj = scenarios.find((s) => s.id === currentScenario);

  // Current Decision fallback if not provided by backend
  const decisionSummary = gridState?.current_decision || {
    battery_action:
      (gridState?.battery_discharge_kw || 0) > 0.1
        ? `Discharge ${gridState?.battery_discharge_kw.toFixed(1)} kW`
        : (gridState?.battery_charge_kw || 0) > 0.1
        ? `Charge ${gridState?.battery_charge_kw.toFixed(1)} kW`
        : "Idle / Standby",
    battery_kw: (gridState?.battery_discharge_kw || 0) > 0.1 ? gridState?.battery_discharge_kw || 0 : -(gridState?.battery_charge_kw || 0),
    grid_action:
      (gridState?.grid_import_kw || 0) > 0.1
        ? `Import ${gridState?.grid_import_kw.toFixed(1)} kW`
        : (gridState?.grid_export_kw || 0) > 0.1
        ? `Export ${gridState?.grid_export_kw.toFixed(1)} kW`
        : "Balanced",
    grid_kw: gridState?.grid_import_kw || 0,
    p2p_action:
      (gridState?.p2p_volume_kwh || 0) > 0
        ? `Active Peer Trade (${gridState?.p2p_volume_kwh.toFixed(1)} kWh cleared)`
        : "Zero P2P Trade Required",
    p2p_kwh: gridState?.p2p_volume_kwh || 0,
    flexible_action:
      (gridState?.household_flexible_total_kw || 0) > 0
        ? `Deferred ${gridState?.household_flexible_total_kw.toFixed(1)} kW to off-peak`
        : "Zero load shedding",
    ev_action: "Coordinated smart charging",
    why_points: [
      `Solar generation at ${gridState?.solar_total_kw.toFixed(1)} kW against total demand of ${gridState?.total_demand_kw.toFixed(1)} kW.`,
      `Battery SOC is ${gridState?.battery?.soc_pct.toFixed(1)}%, ${(gridState?.battery_discharge_kw || 0) > 0 ? "discharging to protect grid and avoid peak tariffs" : "preserving reserves"}.`,
      `Substation transformer is loading at ${gridState?.transformer_load_pct.toFixed(1)}% (limit: 95%).`,
      `P2P market clearing price is ₹${(gridState?.p2p_clearing_price_kwh || 8.5).toFixed(2)}/kWh vs retail ₹${(gridState?.grid_buy_price_kwh || 13.5).toFixed(2)}/kWh.`,
    ],
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Admin Controls Header */}
      <Header
        timeStr={gridState?.time_str || "00:00"}
        step={gridState?.step || 0}
        isRunning={isRunning}
        speed={speed}
        currentScenario={currentScenario}
        scenarios={scenarios}
        crisisTriggered={crisisTriggered}
        activeTab={activeAdminTab}
        onTabChange={(tab) => setActiveAdminTab(tab)}
        isAIOpen={isCopilotOpen}
        onToggleAI={() => setIsCopilotOpen(!isCopilotOpen)}
        onOpenAIConfig={() => setIsAIConfigOpen(true)}
        isAIConfigured={aiStatus?.configured ?? false}
        onPlayPause={handlePlayPause}
        onStep={handleStep}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onScenarioChange={handleScenarioChange}
        onTriggerCrisis={handleTriggerCrisis}
        onOpenComparison={() => setIsComparisonOpen(true)}
        onOpenWhatIf={() => setIsWhatIfOpen(true)}
        userName={currentUser.name}
        onLogout={handleLogout}
      />

      {/* Main Admin Content Body */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3.5 md:p-6 space-y-4">
        {/* TAB 1: DASHBOARD (High-Level Overview) */}
        {activeAdminTab === "dashboard" && (
          <div className="space-y-4">
            {/* Quick Scenario & Story Banner */}
            <div className="glass-panel p-3.5 md:p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/90 via-cyan-950/25 to-slate-900/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mt-0.5 shrink-0">
                  <Sparkles className="w-4 h-4 animate-pulse text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-[11px] uppercase font-extrabold tracking-wider text-cyan-400">
                      Active Operating Scenario:
                    </span>
                    <span className="text-xs font-bold text-white px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                      {activeScenarioObj?.title || currentScenario}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Clock: <strong className="text-white">{gridState?.time_str || "00:00"}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
                    {activeScenarioObj?.description ||
                      "Autonomous multi-agent microgrid coordinating distributed solar, battery storage, and peer-to-peer trading in real-time."}
                  </p>
                </div>
              </div>

              {/* Jump & What-If shortcuts */}
              <div className="flex items-center space-x-2 shrink-0 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 flex-wrap gap-y-1">
                <button
                  onClick={() => handleJumpTo(48)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center space-x-1"
                  title="Jump directly to 12:00 (Midday Solar Peak)"
                >
                  <Sun className="w-3.5 h-3.5 mr-1" />
                  <span>12:00 Noon</span>
                </button>
                <button
                  onClick={() => handleJumpTo(74)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all flex items-center space-x-1"
                  title="Jump directly to 18:30 (Evening Peak & Storm Shock)"
                >
                  <Zap className="w-3.5 h-3.5 mr-1 text-rose-400" />
                  <span>18:30 Peak</span>
                </button>
              </div>
            </div>

            {/* Grid Status Banner */}
            {gridState && (
              <GridStatusBanner
                status={gridState.status}
                transformerLoadPct={gridState.transformer_load_pct}
                transformerCapacityKw={gridState.transformer_capacity_kw}
                voltagePu={gridState.voltage_pu}
                frequencyHz={gridState.frequency_hz}
                crisisTriggered={crisisTriggered}
              />
            )}

            {/* Top Key Telemetry KPI Cards */}
            {gridState && metrics && <MetricsCards state={gridState} metrics={metrics} />}

            {/* SECTION: Current GridMind Decision Hero Card + Live Explainer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Left 7 Cols: Current Decision Hero */}
              <div className="lg:col-span-7 glass-panel p-5 rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-cyan-300">
                        Current GridMind Decision
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      Step {gridState?.step || 0} • {gridState?.time_str || "00:00"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {/* Battery Action */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          <BatteryCharging className="w-4 h-4 text-emerald-400" />
                          <span>Battery Storage</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          SOC {gridState?.battery?.soc_pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-base font-extrabold text-emerald-300 font-mono">
                        {decisionSummary.battery_action}
                      </div>
                    </div>

                    {/* Grid Import/Export */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span>Main Grid</span>
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          ₹{gridState?.grid_buy_price_kwh}/kWh
                        </span>
                      </div>
                      <div className="text-base font-extrabold text-amber-300 font-mono">
                        {decisionSummary.grid_action}
                      </div>
                    </div>

                    {/* P2P Trading */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-500/20">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-purple-400" />
                          <span>P2P Market</span>
                        </span>
                        <span className="text-[10px] font-mono text-purple-400 font-bold">
                          Clear ₹{(gridState?.p2p_clearing_price_kwh || 8.5).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-base font-extrabold text-purple-300 font-mono">
                        {decisionSummary.p2p_action}
                      </div>
                    </div>

                    {/* Flexible Loads & EV */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/20">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-cyan-400" />
                          <span>Demand Response</span>
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          Load Shifting
                        </span>
                      </div>
                      <div className="text-base font-extrabold text-cyan-300 font-mono">
                        {decisionSummary.flexible_action}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drill-down links */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">Deep-dive into system internals:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveAdminTab("agents")}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Inspect 7 Agents</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                    <button
                      onClick={() => setActiveAdminTab("energy_sources")}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Tune Energy Sources</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                    <button
                      onClick={() => setActiveAdminTab("simulation")}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Live Power Flow</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Live "Why Did GridMind Decide This?" */}
              <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Why Did GridMind Decide This?</span>
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Autonomous Rationale
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    Live multi-agent consensus and LP optimizer justification for the current dispatch vector:
                  </p>

                  <ul className="space-y-2 text-xs">
                    {decisionSummary.why_points.map((pt, idx) => (
                      <li key={idx} className="flex items-start space-x-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200 leading-snug">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Verified by LP Optimizer & Safety Layer</span>
                  <button
                    onClick={() => setActiveAdminTab("agents")}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
                  >
                    View Agent Decision Logs →
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Activity Split: P2P Trades Ledger vs Decision Audit Trail */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setBottomTab("p2p")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                      bottomTab === "p2p"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Recent P2P Trades
                  </button>
                  <button
                    onClick={() => setBottomTab("audit")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                      bottomTab === "audit"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Agent Audit Log ({decisions.length})
                  </button>
                </div>
                <span className="text-xs text-slate-500 font-mono">Live Sync</span>
              </div>

              {bottomTab === "p2p" ? (
                <P2PTradingLedger
                  trades={trades}
                  totalVolumeKwh={metrics?.p2p_energy_traded_kwh || 0}
                  clearingPrice={gridState?.p2p_clearing_price_kwh || 8.5}
                  gridRetailTariff={gridState?.grid_buy_price_kwh || 13.5}
                />
              ) : (
                <AgentDecisionAudit
                  decisions={decisions}
                  onExplainDecision={handleExplainDecision}
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE SIMULATION (Power Flow & Live Operations) */}
        {activeAdminTab === "simulation" && (
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-slate-900/60 shadow-xl flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span>Real-Time Topological Power Flow</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Visualizing power exchange across Solar PV, Battery Energy Storage, Main Substation Grid, Households, and EV Fleet.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-xl border border-cyan-500/30">
                  {gridState?.time_str || "00:00"} (Step {gridState?.step || 0}/96)
                </span>
              </div>
            </div>

            {/* Topological Flow Diagram */}
            {gridState && <EnergyFlowDiagram state={gridState} />}

            {/* Agent Live Communication Feed & Event Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-7">
                <AgentActivityFeed
                  messages={messages}
                  onExplainMessage={handleExplainMessage}
                />
              </div>
              <div className="lg:col-span-5">
                <EventTimeline messages={messages} currentStep={gridState?.step || 0} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AGENT DECISIONS (Multi-Agent Inspection) */}
        {activeAdminTab === "agents" && (
          <AgentDecisionsView
            currentScenario={currentScenario}
            scenarios={scenarios}
            currentStep={gridState?.step || 0}
            timeStr={gridState?.time_str || "00:00"}
            isRunning={isRunning}
            onScenarioChange={handleScenarioChange}
            onJumpToStep={handleJumpTo}
          />
        )}

        {/* TAB 4: ENERGY SOURCES (Admin Microgrid Controls & Real-Time Recalculation) */}
        {activeAdminTab === "energy_sources" && (
          <EnergySourcesView
            gridState={gridState}
            metrics={metrics}
            onStateUpdated={handleStateUpdated}
            onNavigateToDecisions={() => setActiveAdminTab("agents")}
            onNavigateToSimulation={() => setActiveAdminTab("simulation")}
          />
        )}

        {/* TAB 5: SCENARIOS (Stress Testing & Scenario Engine) */}
        {activeAdminTab === "scenarios" && (
          <ScenariosView
            scenarios={scenarios}
            currentScenario={currentScenario}
            gridState={gridState}
            onScenarioChange={handleScenarioChange}
            onOpenComparison={() => setIsComparisonOpen(true)}
            onNavigateToSimulation={() => setActiveAdminTab("simulation")}
          />
        )}

        {/* TAB 6: ANALYTICS (Deep-Dive Performance & Baseline Comparison) */}
        {activeAdminTab === "analytics" && (
          <AnalyticsView
            gridState={gridState}
            metrics={metrics}
            trades={trades}
            onOpenComparison={() => setIsComparisonOpen(true)}
          />
        )}
      </main>

      {/* Baseline vs GridMind Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        scenario={currentScenario}
      />

      {/* Autonomous What-If Scenario Planning Modal */}
      <WhatIfPlannerModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
        onPlanExecuted={handlePlanExecuted}
        backendUrl={BACKEND_URL}
      />

      {/* Floating AI Copilot Trigger Button */}
      {!isCopilotOpen && (
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 text-white shadow-2xl shadow-cyan-500/30 hover:scale-105 transition-all flex items-center space-x-2 border border-cyan-300/30 glow-cyan"
        >
          <Sparkles className="w-5 h-5 animate-spin" />
          <span className="text-xs font-bold hidden sm:inline">Ask GridMind AI</span>
        </button>
      )}

      {/* GridMind AI Copilot Drawer */}
      <GridMindCopilot
        isOpen={isCopilotOpen}
        onClose={() => {
          setIsCopilotOpen(false);
          setExternalPrompt("");
        }}
        gridState={gridState}
        currentScenario={currentScenario}
        externalPrompt={externalPrompt}
        onClearExternalPrompt={() => setExternalPrompt("")}
        onOpenConfig={() => setIsAIConfigOpen(true)}
      />

      {/* OpenAI API Configuration Modal */}
      <AIConfigModal
        isOpen={isAIConfigOpen}
        onClose={() => setIsAIConfigOpen(false)}
        onStatusChange={(st) => setAiStatus(st)}
      />
    </div>
  );
}
