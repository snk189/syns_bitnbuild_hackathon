"use client";

import React from "react";
import { ScenarioInfo, GridState } from "../types";
import { Play, Sparkles, CheckCircle2, ShieldAlert, CloudRain, Sun, Moon, BatteryWarning, Zap, ArrowRight, BarChart2 } from "lucide-react";

interface ScenariosViewProps {
  scenarios: ScenarioInfo[];
  currentScenario: string;
  gridState: GridState | null;
  onScenarioChange: (scenarioId: string) => void;
  onOpenComparison: () => void;
  onNavigateToSimulation: () => void;
}

const SCENARIO_ICONS: Record<string, React.ReactNode> = {
  normal_day: <Sun className="w-6 h-6 text-amber-400" />,
  evening_peak: <Moon className="w-6 h-6 text-indigo-400" />,
  cloud_cover_peak: <CloudRain className="w-6 h-6 text-cyan-400" />,
  solar_surplus: <Sun className="w-6 h-6 text-yellow-300" />,
  battery_low_soc: <BatteryWarning className="w-6 h-6 text-rose-400" />,
  grid_emergency: <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />,
};

const SCENARIO_BADGES: Record<string, { label: string; color: string }> = {
  normal_day: { label: "Baseline", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  evening_peak: { label: "High Demand", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  cloud_cover_peak: { label: "Dynamic Shock", color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  solar_surplus: { label: "Excess PV", color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  battery_low_soc: { label: "Storage Depleted", color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  grid_emergency: { label: "Islanded Mode", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

export const ScenariosView: React.FC<ScenariosViewProps> = ({
  scenarios,
  currentScenario,
  gridState,
  onScenarioChange,
  onOpenComparison,
  onNavigateToSimulation,
}) => {
  const activeScenario = scenarios.find((s) => s.id === currentScenario);

  return (
    <div className="space-y-6">
      {/* Header & Active Scenario Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/20 to-slate-900 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Scenario Engine & Stress Testing
                </h2>
                <p className="text-xs text-slate-400">
                  Select predefined operating scenarios to observe autonomous multi-agent adaptation and optimizer response.
                </p>
              </div>
            </div>
            {activeScenario && (
              <div className="mt-3 flex items-center space-x-3 flex-wrap gap-y-2">
                <span className="text-xs text-slate-400">Active Scenario:</span>
                <span className="text-xs font-bold text-cyan-300 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/40">
                  {activeScenario.title}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Step: <strong className="text-white">{gridState?.step || 0}/96</strong> ({gridState?.time_str || "00:00"})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenComparison}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all shadow-md"
            >
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>Compare with Baseline</span>
            </button>
            <button
              onClick={onNavigateToSimulation}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all shadow-md"
            >
              <Play className="w-4 h-4 fill-current text-cyan-400" />
              <span>Go to Live Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((sc, idx) => {
          const isActive = sc.id === currentScenario;
          const badge = SCENARIO_BADGES[sc.id] || { label: "Scenario", color: "bg-slate-800 text-slate-300 border-slate-700" };
          const icon = SCENARIO_ICONS[sc.id] || <Zap className="w-6 h-6 text-cyan-400" />;

          return (
            <div
              key={sc.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? "bg-slate-900/90 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
              }`}
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      {icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-500">SCENARIO {idx + 1}</span>
                      <h3 className="text-sm font-bold text-white">{sc.title}</h3>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 leading-relaxed min-h-[50px] mb-4">
                  {sc.description}
                </p>

                {/* Characteristics */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Solar Profile:</span>
                    <span className="text-slate-200 font-medium">
                      {sc.id.includes("cloud") ? "Intermittent / Sudden Drop" : sc.id.includes("surplus") ? "Peak Irradiance (100%)" : "Standard Bell Curve"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Storage Initial SOC:</span>
                    <span className="text-slate-200 font-medium">
                      {sc.id.includes("battery_low") ? "15% (Critical Reserve)" : "60-70% (Nominal)"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Grid Status:</span>
                    <span className="text-slate-200 font-medium">
                      {sc.id.includes("emergency") ? "Outage / Islanded Mode" : "Normal Grid Tied"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {isActive ? (
                  <div className="flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Currently Active</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onScenarioChange(sc.id)}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 border border-slate-700 hover:border-cyan-500 text-xs font-bold transition-all shadow-sm group"
                  >
                    <span>Activate Scenario</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
