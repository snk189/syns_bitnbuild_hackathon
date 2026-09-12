"use client";

import React from "react";
import { Play, Pause, SkipForward, RotateCcw, AlertOctagon, BarChart2, Zap, Clock } from "lucide-react";
import { ScenarioInfo } from "../types";

interface HeaderProps {
  timeStr: string;
  step: number;
  isRunning: boolean;
  speed: number;
  currentScenario: string;
  scenarios: ScenarioInfo[];
  crisisTriggered: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onScenarioChange: (scenario: string) => void;
  onTriggerCrisis: () => void;
  onOpenComparison: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timeStr,
  step,
  isRunning,
  speed,
  currentScenario,
  scenarios,
  crisisTriggered,
  onPlayPause,
  onStep,
  onReset,
  onSpeedChange,
  onScenarioChange,
  onTriggerCrisis,
  onOpenComparison,
}) => {
  return (
    <header className="w-full glass-panel border-b border-slate-800/80 px-4 lg:px-6 py-3 sticky top-0 z-40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                GRIDMIND
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Autonomous Multi-Agent Microgrid
              </span>
            </div>
            <p className="text-xs text-slate-400">Decentralized Energy & P2P Trading Ecosystem</p>
          </div>
        </div>

        {/* Simulation Clock & Progress */}
        <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl">
          <Clock className="w-4 h-4 text-cyan-400" />
          <div className="flex items-baseline space-x-2">
            <span className="text-lg font-mono font-bold text-slate-100">{timeStr || "00:00"}</span>
            <span className="text-xs font-mono text-slate-400">
              Step {step} / 96 ({(step * 15) % 60 === 0 ? "Hour " + Math.floor((step * 15) / 60) : ""})
            </span>
          </div>
        </div>

        {/* Scenario Selector */}
        <div className="flex items-center space-x-2">
          <select
            value={currentScenario}
            onChange={(e) => onScenarioChange(e.target.value)}
            className="bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[220px] md:max-w-xs truncate"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id} className="bg-slate-900 text-slate-200">
                {sc.title}
              </option>
            ))}
          </select>
        </div>

        {/* Simulation Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onPlayPause}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isRunning
                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 glow-amber"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 glow-emerald"
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isRunning ? "PAUSE" : "START"}</span>
          </button>

          <button
            onClick={onStep}
            disabled={isRunning}
            title="Advance 15-Minute Step"
            className="p-2 rounded-xl text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white disabled:opacity-40 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={onReset}
            title="Reset Simulation"
            className="p-2 rounded-xl text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-[11px] font-bold">
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  speed === s ? "bg-cyan-500/20 text-cyan-300 font-extrabold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons: Trigger Crisis & Comparison */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onTriggerCrisis}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all shadow-lg ${
              crisisTriggered
                ? "bg-rose-600 text-white glow-rose animate-pulse border border-rose-400"
                : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-400"
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>⚡ Trigger Crisis</span>
          </button>

          <button
            onClick={onOpenComparison}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 transition-all shadow-md"
          >
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <span>Baseline vs GridMind</span>
          </button>
        </div>
      </div>
    </header>
  );
};
