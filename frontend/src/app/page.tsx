"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Sun, Zap, AlertTriangle, Bot } from "lucide-react";
import { Header } from "../components/Header";
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
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"p2p" | "audit">("p2p");
  const [activeTab, setActiveTab] = useState<"dashboard" | "decisions" | "trading">("dashboard");

  // AI Copilot & OpenAI Key States
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState<LLMStatus | null>(null);
  const [externalPrompt, setExternalPrompt] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);

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

  // Explain with AI Handlers
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

  const activeScenarioObj = scenarios.find((s) => s.id === currentScenario);

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Top Controls Header */}
      <Header
        timeStr={gridState?.time_str || "00:00"}
        step={gridState?.step || 0}
        isRunning={isRunning}
        speed={speed}
        currentScenario={currentScenario}
        scenarios={scenarios}
        crisisTriggered={crisisTriggered}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
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
      />

      {/* Main App Body */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3.5 md:p-6 space-y-4">
        {activeTab === "decisions" ? (
          /* TAB 2: AGENT DECISIONS VIEW */
          <AgentDecisionsView
            currentScenario={currentScenario}
            scenarios={scenarios}
            currentStep={gridState?.step || 0}
            timeStr={gridState?.time_str || "00:00"}
            isRunning={isRunning}
            onScenarioChange={handleScenarioChange}
            onJumpToStep={handleJumpTo}
          />
        ) : activeTab === "trading" ? (
          /* TAB 3: USER P2P TRADING VIEW */
          <UserTradingView
            gridState={gridState}
            metrics={metrics}
            trades={trades}
            onTradeExecuted={() => {
              // Quick refresh
              handleStep();
            }}
          />
        ) : (
          /* TAB 1: DEFAULT DASHBOARD */
          <>
            {/* Scenario Story Explainer Banner */}
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/90 via-cyan-950/25 to-slate-900/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mt-0.5 shrink-0">
                  <Sparkles className="w-5 h-5 animate-pulse text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-[11px] uppercase font-extrabold tracking-wider text-cyan-400">
                      Active Simulation Scenario:
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
                      "Sudden cloud cover strikes at 18:30 (step 74), plunging solar by 85% exactly as EVs plug in and dinner demand peaks."}
                  </p>
                </div>
              </div>

              {/* Quick Actions, AI Copilot & What-If Planner */}
              <div className="flex items-center space-x-2 shrink-0 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 flex-wrap gap-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Actions:
                </span>
                <button
                  onClick={() => setIsCopilotOpen(true)}
                  className="px-3 py-1 text-xs font-black rounded-lg bg-gradient-to-r from-cyan-500/30 to-indigo-500/30 hover:from-cyan-500/45 hover:to-indigo-500/45 text-cyan-200 border border-cyan-400/50 shadow-md ring-1 ring-cyan-400/30 transition-all flex items-center space-x-1.5"
                  title="Open Autonomous AI Microgrid Copilot"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  <span>✨ AI Copilot</span>
                </button>
                <button
                  onClick={() => setIsWhatIfOpen(true)}
                  className="px-3 py-1 text-xs font-black rounded-lg bg-gradient-to-r from-cyan-500/25 via-indigo-500/25 to-purple-500/25 hover:from-cyan-500/40 hover:to-purple-500/40 text-cyan-200 border border-cyan-400/50 shadow-md ring-1 ring-cyan-400/30 transition-all flex items-center space-x-1.5"
                  title="Autonomous What-If Scenario Planning Agent"
                >
                  <Bot className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  <span>🧠 Plan 30m What-If</span>
                </button>
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

            {/* 1. Grid Status Banner */}
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

            {/* 2. Key Telemetry KPI Cards */}
            {gridState && metrics && <MetricsCards state={gridState} metrics={metrics} />}

            {/* 3. Operational Grid Workspace: 2-Column Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column (7 cols): Topological Power Flow + Tabbed Market/Audit Table */}
              <div className="lg:col-span-7 space-y-4">
                {gridState && <EnergyFlowDiagram state={gridState} />}

                {/* Bottom Tab Switcher: P2P Ledger vs Decision Audit Trail */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-1">
                    <button
                      onClick={() => setBottomTab("p2p")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        bottomTab === "p2p"
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      P2P Energy Trading Ledger
                    </button>
                    <button
                      onClick={() => setBottomTab("audit")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        bottomTab === "audit"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Explainable Agent Decision Logs ({decisions.length})
                    </button>
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

              {/* Right Column (5 cols): Live Agent Negotiation Feed + Event Timeline */}
              <div className="lg:col-span-5 space-y-4">
                <AgentActivityFeed
                  messages={messages}
                  onExplainMessage={handleExplainMessage}
                />
                <EventTimeline messages={messages} currentStep={gridState?.step || 0} />
              </div>
            </div>
          </>
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
