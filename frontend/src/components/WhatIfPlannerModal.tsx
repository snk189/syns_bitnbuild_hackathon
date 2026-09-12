"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  BatteryCharging,
  Zap,
  Clock,
  Car,
  Home,
  Bot,
  ArrowRight,
  ShieldCheck,
  Scale,
  RefreshCw,
  Play
} from "lucide-react";
import { WhatIfEvaluationResult } from "../types";

interface WhatIfPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanExecuted: (data: any) => void;
  backendUrl: string;
}

export const WhatIfPlannerModal: React.FC<WhatIfPlannerModalProps> = ({
  isOpen,
  onClose,
  onPlanExecuted,
  backendUrl,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>("cloud_drop");
  const [evalResult, setEvalResult] = useState<WhatIfEvaluationResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"debate" | "decision_chain">("debate");
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const presets = [
    { id: "cloud_drop", label: "⛅ Cloud Cover (-70% Solar)", icon: "⛅" },
    { id: "heatwave_surge", label: "⚡ Heatwave Spike (+40% Demand)", icon: "⚡" },
    { id: "transformer_derating", label: "🔌 Substation Derated (95 kW Limit)", icon: "🔌" },
    { id: "ev_surge", label: "🚗 EV Fleet Surge (4 Fast Chargers)", icon: "🚗" },
  ];

  const fetchEvaluation = async (scId: string) => {
    setIsLoading(true);
    setExecutionMessage(null);
    try {
      const res = await fetch(`${backendUrl}/api/planning/what-if`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: scId, horizon_minutes: 30 }),
      });
      if (res.ok) {
        const data = await res.json();
        setEvalResult(data);
      }
    } catch (err) {
      console.error("Failed to evaluate what-if", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEvaluation(selectedScenario);
    }
  }, [isOpen, selectedScenario]);

  const handleExecute = async () => {
    if (!evalResult) return;
    setIsExecuting(true);
    try {
      const res = await fetch(`${backendUrl}/api/planning/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: selectedScenario,
          plan_id: evalResult.recommended_strategy_id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExecutionMessage(data.summary || "Autonomous Consensus Plan successfully applied to the live microgrid!");
        onPlanExecuted(data);
      }
    } catch (err) {
      console.error("Failed to execute plan", err);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b101f] border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Bot className="w-6 h-6 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg md:text-xl font-black text-white tracking-wide">
                  Autonomous Scenario Planning Agent
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Agentic AI
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates candidate mitigation strategies, conducts multi-agent negotiation, and executes consensus actions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {/* Preset Risk Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Select Simulated Future Shock (30 Minutes Horizon)
              </span>
              <button
                onClick={() => fetchEvaluation(selectedScenario)}
                disabled={isLoading}
                className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                <span>Re-Evaluate</span>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {presets.map((p) => {
                const isSelected = selectedScenario === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedScenario(p.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? "bg-cyan-950/60 border-cyan-400 text-white shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-400/40"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="text-base mb-1">{p.icon}</div>
                    <div className="text-xs font-bold leading-snug">{p.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Risk Alert Callout */}
          {evalResult && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-amber-950/25 to-slate-900 border border-rose-500/40 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <div className="font-black text-rose-300 uppercase tracking-wider text-[11px] mb-0.5">
                  Future Risk Detected at {evalResult.target_time_str}
                </div>
                <div className="text-slate-200 font-medium">
                  {evalResult.risk_summary}
                </div>
                <div className="mt-1 text-slate-400 text-[11px]">
                  Uncoordinated baseline response will spike transformer demand to{" "}
                  <span className="text-rose-400 font-bold font-mono">
                    {evalResult.baseline_projected_load_kw} kW
                  </span>
                  , threatening blackouts.
                </div>
              </div>
            </div>
          )}

          {/* Candidate Strategies Matrix */}
          {evalResult && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                2. Autonomous Strategy Evaluation (4 Alternatives Evaluated)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {evalResult.strategies.map((strat) => {
                  const isOptimal = strat.id === evalResult.recommended_strategy_id;
                  return (
                    <div
                      key={strat.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all ${
                        isOptimal
                          ? "bg-gradient-to-b from-cyan-950/60 to-emerald-950/40 border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-950/50"
                          : "bg-slate-900/50 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              isOptimal
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : strat.status === "CRITICAL_RISK"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {strat.status_label}
                          </span>
                        </div>
                        <h4 className={`text-xs font-black mb-1 ${isOptimal ? "text-white" : "text-slate-300"}`}>
                          {strat.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                          {strat.description}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Transformer:</span>
                          <span className={isOptimal ? "text-cyan-300 font-bold" : "text-slate-300"}>
                            {strat.projected_transformer_kw} kW
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Est. Cost:</span>
                          <span className={isOptimal ? "text-emerald-400 font-bold" : "text-slate-300"}>
                            ₹{strat.projected_cost}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">BESS SOC:</span>
                          <span className="text-slate-300">{strat.ending_battery_soc}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">EV Readiness:</span>
                          <span className="text-slate-300">{strat.ev_readiness_pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Agent Debate vs Causal Chain */}
          {evalResult && (
            <div className="border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-900/70">
                <button
                  onClick={() => setActiveTab("debate")}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                    activeTab === "debate"
                      ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>🗣️ Multi-Agent Negotiation & Consensus</span>
                </button>
                <button
                  onClick={() => setActiveTab("decision_chain")}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                    activeTab === "decision_chain"
                      ? "text-purple-400 border-b-2 border-purple-400 bg-purple-950/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>🔍 Causal Decision Chain (&quot;Why?&quot;)</span>
                </button>
              </div>

              <div className="p-4 max-h-60 overflow-y-auto space-y-2.5">
                {activeTab === "debate" && (
                  <>
                    {evalResult.agent_debate.map((msg, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-3 text-xs"
                      >
                        <span className="text-lg shrink-0 mt-0.5">{msg.agent_avatar}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-black text-slate-200">{msg.agent_name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                msg.stance === "CONSENSUS"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : msg.stance === "CONSTRAINT"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              }`}
                            >
                              {msg.stance}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-relaxed">{msg.dialogue}</p>
                        </div>
                      </div>
                    ))}
                    <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>
                        🎯 CONSENSUS PLAN ACCEPTED: Multi-agent coordination prevents blackout while saving ₹
                        {evalResult.executable_action.projected_cost_savings}.
                      </span>
                    </div>
                  </>
                )}

                {activeTab === "decision_chain" && (
                  <div className="space-y-2">
                    {evalResult.decision_chain.map((node) => (
                      <div
                        key={node.step_order}
                        className="flex items-center space-x-3 p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs"
                      >
                        <span className="w-6 h-6 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {node.step_order}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-200">{node.agent}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="text-purple-300 font-semibold">{node.action}</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{node.detail}</p>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900 shrink-0">
                          {node.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success banner if executed */}
          {executionMessage && (
            <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-bounce">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{executionMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Recommended Action:{" "}
            <span className="text-emerald-400 font-bold">
              Dispatch 24 kW BESS + Shift 7 kW Load + Defer 2 EVs + Clear P2P
            </span>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleExecute}
              disabled={isExecuting || !evalResult}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing Plan...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ Execute Consensus Plan on Grid</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
