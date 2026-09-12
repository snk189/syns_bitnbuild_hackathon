"use client";

import React from "react";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  AlertOctagon,
  BarChart2,
  Zap,
  Clock,
  Bot,
  Sparkles,
  Key,
  Shield,
  LogOut,
  Sliders,
  Layers,
  Activity,
  Cpu,
  Compass,
} from "lucide-react";
import { ScenarioInfo } from "../types";

export type AdminTab =
  | "dashboard"
  | "simulation"
  | "agents"
  | "energy_sources"
  | "scenarios"
  | "analytics";

interface HeaderProps {
  timeStr: string;
  step: number;
  isRunning: boolean;
  speed: number;
  currentScenario: string;
  scenarios: ScenarioInfo[];
  crisisTriggered: boolean;
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  isAIOpen?: boolean;
  onToggleAI?: () => void;
  onOpenAIConfig?: () => void;
  isAIConfigured?: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onScenarioChange: (scenario: string) => void;
  onTriggerCrisis: () => void;
  onOpenComparison: () => void;
  onOpenWhatIf: () => void;
  userName?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeStr,
  step,
  isRunning,
  speed,
  currentScenario,
  scenarios,
  crisisTriggered,
  activeTab = "dashboard",
  onTabChange,
  isAIOpen = false,
  onToggleAI,
  onOpenAIConfig,
  isAIConfigured = false,
  onPlayPause,
  onStep,
  onReset,
  onSpeedChange,
  onScenarioChange,
  onTriggerCrisis,
  onOpenComparison,
  onOpenWhatIf,
  userName = "admin",
  onLogout,
}) => {
  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "simulation", label: "Live Simulation", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "agents", label: "Agent Decisions", icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: "energy_sources", label: "Energy Sources", icon: <Sliders className="w-3.5 h-3.5 text-amber-400" /> },
    { id: "scenarios", label: "Scenarios", icon: <Compass className="w-3.5 h-3.5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="w-full glass-panel border-b border-slate-800/80 px-4 lg:px-6 py-2.5 sticky top-0 z-40 bg-[#050811]/90 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Mode Tag */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Zap className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                GRIDMIND
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Control Center
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Autonomous Multi-Agent Microgrid</p>
          </div>
        </div>

        {/* 6 Clean Admin Navigation Tabs */}
        {onTabChange && (
          <nav className="flex items-center bg-slate-950/90 border border-slate-800/90 rounded-2xl p-1 shadow-inner overflow-x-auto max-w-full">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* User Identity & Logout */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-mono text-[11px]">Role:</span>
            <span className="font-bold text-cyan-300 capitalize">{userName}</span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold transition-all"
              title="Return to Login Screen"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Bar: Quick Simulation Controls & Scenario Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2 pt-2 border-t border-slate-800/50 text-xs">
        {/* Simulation Clock & Progress */}
        <div className="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono font-bold text-slate-100">{timeStr || "00:00"}</span>
          <span className="text-slate-500 font-mono">|</span>
          <span className="font-mono text-slate-400 text-[11px]">
            Step {step} / 96 ({(step * 15) % 60 === 0 ? "Hr " + Math.floor((step * 15) / 60) : ""})
          </span>
        </div>

        {/* Quick Scenario Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 text-[11px] hidden sm:inline font-semibold">Scenario:</span>
          <select
            value={currentScenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            className="bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-200 rounded-xl px-2.5 py-1 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[200px] md:max-w-xs truncate"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id} className="bg-slate-900 text-slate-200">
                {sc.title}
              </option>
            ))}
          </select>
        </div>

        {/* Simulation Controls: Play, Step, Reset, Speed */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onPlayPause}
            className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-md ${
              isRunning
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 glow-amber"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 glow-emerald"
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? "PAUSE" : "START"}</span>
          </button>

          <button
            onClick={onStep}
            disabled={isRunning}
            title="Advance 15-Minute Step"
            className="p-1.5 rounded-xl text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white disabled:opacity-40 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onReset}
            title="Reset Simulation"
            className="p-1.5 rounded-xl text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-[10px] font-bold">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-1.5 py-0.5 rounded-lg transition-colors ${
                  speed === s ? "bg-cyan-500/20 text-cyan-300 font-extrabold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Action Tools: AI, What-If, Crisis, Compare */}
        <div className="flex items-center space-x-1.5">
          {onOpenAIConfig && (
            <button
              onClick={onOpenAIConfig}
              title={isAIConfigured ? "OpenAI Configured" : "Set OpenAI API Key"}
              className={`p-1.5 rounded-xl border transition-all ${
                isAIConfigured
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleAI && (
            <button
              onClick={onToggleAI}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isAIOpen
                  ? "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white"
                  : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden md:inline">AI Copilot</span>
            </button>
          )}

          <button
            onClick={onOpenWhatIf}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-400/40 transition-all shadow-sm"
          >
            <Bot className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden md:inline">What-If</span>
          </button>

          <button
            onClick={onTriggerCrisis}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-black transition-all shadow-sm ${
              crisisTriggered
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Crisis</span>
          </button>

          <button
            onClick={onOpenComparison}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Compare</span>
          </button>
        </div>
      </div>
    </header>
  );
};
