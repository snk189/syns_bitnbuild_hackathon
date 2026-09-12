"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Clock,
  Zap,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Sun,
  Battery,
  Home,
  Car,
  TrendingUp,
  Cpu,
  Layers,
  Search
} from "lucide-react";
import { AgentDecisionLog, ScenarioInfo } from "../types";

interface AgentDecisionsViewProps {
  currentScenario: string;
  scenarios: ScenarioInfo[];
  currentStep: number;
  timeStr: string;
  isRunning: boolean;
  onScenarioChange: (scenario: string) => void;
  onJumpToStep?: (step: number) => void;
}

const ALL_AGENTS = [
  { id: "ALL", name: "All Autonomous Agents", icon: Brain, color: "text-cyan-400" },
  { id: "ForecastAgent", name: "ForecastAgent", icon: TrendingUp, color: "text-cyan-400" },
  { id: "GridHealthAgent", name: "GridHealthAgent", icon: Activity, color: "text-rose-400" },
  { id: "SolarAgent", name: "SolarAgent", icon: Sun, color: "text-amber-400" },
  { id: "BatteryAgent", name: "BatteryAgent", icon: Battery, color: "text-emerald-400" },
  { id: "ConsumerAgent", name: "ConsumerAgent", icon: Home, color: "text-indigo-400" },
  { id: "EVAgent", name: "EV Fleet Agent", icon: Car, color: "text-teal-400" },
  { id: "MarketAgent", name: "Market / Negotiation Agent", icon: Zap, color: "text-purple-400" },
];

export const AgentDecisionsView: React.FC<AgentDecisionsViewProps> = ({
  currentScenario,
  scenarios,
  currentStep,
  timeStr,
  isRunning,
  onScenarioChange,
  onJumpToStep,
}) => {
  const [selectedStep, setSelectedStep] = useState<number>(currentStep);
  const [followLive, setFollowLive] = useState<boolean>(true);
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [decisions, setDecisions] = useState<AgentDecisionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [stepTime, setStepTime] = useState<string>(timeStr);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  // Synchronize with live simulation when followLive is enabled
  useEffect(() => {
    if (followLive) {
      setSelectedStep(currentStep);
      setStepTime(timeStr);
    }
  }, [currentStep, timeStr, followLive]);

  // Fetch decisions whenever selectedStep or currentScenario changes
  useEffect(() => {
    let isCancelled = false;
    const fetchDecisions = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/agents/decisions?step=${selectedStep}&scenario=${currentScenario}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled) {
            setDecisions(data.decisions || []);
            if (data.time_str) setStepTime(data.time_str);
          }
        }
      } catch (err) {
        console.error("Failed to fetch agent decisions", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchDecisions();
    return () => {
      isCancelled = true;
    };
  }, [selectedStep, currentScenario, BACKEND_URL]);

  const handleStepChange = (newStep: number) => {
    const clamped = Math.max(0, Math.min(95, newStep));
    setSelectedStep(clamped);
    setFollowLive(false);
    if (onJumpToStep) {
      onJumpToStep(clamped);
    }
  };

  // Convert step to formatted time string
  const formatStepToTime = (s: number) => {
    const totalMinutes = s * 15;
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // Determine Agent Status Badge
  const getStatusBadge = (agent: string, decision: string, reason: string) => {
    const dLower = decision.toLowerCase();
    const rLower = reason.toLowerCase();

    if (
      dLower.includes("critical") ||
      dLower.includes("emergency") ||
      rLower.includes("critical") ||
      rLower.includes("emergency") ||
      rLower.includes("lock")
    ) {
      return {
        label: "Critical",
        color: "bg-rose-500/20 text-rose-400 border-rose-500/40",
        icon: Flame,
      };
    }

    if (
      dLower.includes("warning") ||
      dLower.includes("curtail") ||
      dLower.includes("defer") ||
      rLower.includes("stress") ||
      rLower.includes("warning")
    ) {
      return {
        label: "Warning",
        color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        icon: AlertTriangle,
      };
    }

    if (
      dLower.includes("discharge") ||
      dLower.includes("charge") ||
      dLower.includes("dispatch") ||
      dLower.includes("shed") ||
      dLower.includes("delay") ||
      dLower.includes("matched")
    ) {
      return {
        label: "Action Taken",
        color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
        icon: Zap,
      };
    }

    return {
      label: "Normal",
      color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      icon: ShieldCheck,
    };
  };

  // Match agent filter
  const filteredDecisions = decisions.filter((d) => {
    const agentName = d.agent || "";
    const matchesFilter =
      selectedAgentFilter === "ALL" ||
      agentName.toLowerCase().includes(selectedAgentFilter.toLowerCase()) ||
      (selectedAgentFilter === "GridHealthAgent" && agentName.toLowerCase().includes("grid"));

    const matchesSearch =
      searchQuery.trim() === "" ||
      agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.decision.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.observation.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Banner & Timestep Controls */}
      <div className="glass-panel p-4 md:p-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-950/95 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Brain className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  <span>Autonomous Agent Decisions & Action Audit</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Step {selectedStep} of 95 ({formatStepToTime(selectedStep)})
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect the real-time reasoning, status, and autonomous dispatch executed by each microgrid agent.
                </p>
              </div>
            </div>
          </div>

          {/* Scenario Picker & Live Sync */}
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400">Scenario:</span>
              <select
                value={currentScenario}
                onChange={(e) => onScenarioChange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer"
              >
                {scenarios.map((sc) => (
                  <option key={sc.id} value={sc.id} className="bg-slate-900 text-slate-200">
                    {sc.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setFollowLive(!followLive);
                if (!followLive) {
                  setSelectedStep(currentStep);
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                followLive
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 glow-emerald"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${followLive && isRunning ? "animate-spin" : ""}`} />
              <span>{followLive ? "Live Tracking ON" : "Paused on Step"}</span>
            </button>
          </div>
        </div>

        {/* 96-Step Timeline Slider & Step Controls */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => handleStepChange(selectedStep - 1)}
              disabled={selectedStep <= 0}
              className="p-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors"
              title="Previous 15-minute step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center px-2">
              <div className="text-base font-mono font-black text-cyan-300">
                {formatStepToTime(selectedStep)}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Step #{selectedStep}
              </div>
            </div>

            <button
              onClick={() => handleStepChange(selectedStep + 1)}
              disabled={selectedStep >= 95}
              className="p-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition-colors"
              title="Next 15-minute step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline Slider */}
          <div className="flex-1 w-full flex flex-col gap-1">
            <input
              type="range"
              min="0"
              max="95"
              value={selectedStep}
              onChange={(e) => handleStepChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
              <span>00:00 (Midnight)</span>
              <span>06:00 (Dawn)</span>
              <span>12:00 (Solar Peak)</span>
              <span>18:30 (Evening Peak)</span>
              <span>23:45 (End)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
          {ALL_AGENTS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedAgentFilter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedAgentFilter(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                    : "bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search decisions or reasons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 text-xs text-slate-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-cyan-500/60"
          />
        </div>
      </div>

      {/* Agent Decisions Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-sm glass-panel rounded-2xl flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Retrieving agent decisions for step {selectedStep}...</span>
        </div>
      ) : filteredDecisions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm glass-panel rounded-2xl flex flex-col items-center justify-center space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mb-1" />
          <span className="font-semibold text-slate-400">No decisions recorded matching current filter.</span>
          <span className="text-xs text-slate-500">
            Select a different agent or step on the timeline.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecisions.map((log, idx) => {
            const status = getStatusBadge(log.agent, log.decision, log.reason);
            const StatusIcon = status.icon;

            return (
              <div
                key={idx}
                className="glass-panel p-4 rounded-2xl border border-slate-800/80 hover:border-cyan-500/40 transition-all shadow-md flex flex-col justify-between group"
              >
                <div>
                  {/* Header: Agent Name & Status Badge */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span className="text-xs font-black tracking-wider text-slate-100 uppercase">
                        {log.agent}
                      </span>
                    </div>

                    <span
                      className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{status.label}</span>
                    </span>
                  </div>

                  {/* Decision & Action */}
                  <div className="space-y-2 mb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Decision Made
                      </span>
                      <div className="text-xs font-extrabold text-cyan-300 mt-0.5">
                        {log.decision}
                      </div>
                    </div>

                    {/* Human Readable Reason */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Reasoning & Context
                      </span>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                        {log.reason}
                      </p>
                    </div>

                    {/* Observation */}
                    {log.observation && (
                      <div className="text-[11px] text-slate-400">
                        <span className="text-slate-500 font-semibold">Observation: </span>
                        <span>{log.observation}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Key Values / Metrics Influencing Decision */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Key Influencing Metrics
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(log.state || {}).map(([k, v]) => (
                      <span
                        key={k}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300"
                      >
                        <strong className="text-slate-400">{k}:</strong>{" "}
                        <span className="text-cyan-400">
                          {typeof v === "boolean" ? (v ? "true" : "false") : typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </span>
                    ))}
                    {log.constraints && log.constraints.length > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-800/40 text-purple-300">
                        {log.constraints[0]}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-slate-500 text-right">
                    Timestep: {log.time_str} (#{log.step})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
