"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  Battery,
  Zap,
  Activity,
  Car,
  Layers,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { GridState, SimulationMetrics, GridMindDecisionSummary } from "../types";

interface EnergySourcesViewProps {
  gridState: GridState | null;
  metrics: SimulationMetrics | null;
  onStateUpdated: (newState: GridState, newMetrics: SimulationMetrics, newDecision?: GridMindDecisionSummary) => void;
  onNavigateToDecisions?: () => void;
  onNavigateToSimulation?: () => void;
}

export const EnergySourcesView: React.FC<EnergySourcesViewProps> = ({
  gridState,
  metrics,
  onStateUpdated,
  onNavigateToDecisions,
  onNavigateToSimulation,
}) => {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  // Controlled numerical states
  const [solarKw, setSolarKw] = useState<number>(gridState?.solar_total_kw || 25.0);
  const [batterySoc, setBatterySoc] = useState<number>(gridState?.battery.soc_pct || 75.0);
  const [demandKw, setDemandKw] = useState<number>(gridState?.total_demand_kw || 42.0);
  const [gridCapacityKw, setGridCapacityKw] = useState<number>(gridState?.transformer_capacity_kw || 50.0);

  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [lastActionMsg, setLastActionMsg] = useState<string | null>(null);
  const [activeDecision, setActiveDecision] = useState<GridMindDecisionSummary | null>(null);

  // Sync inputs when gridState changes externally (unless user is actively tweaking)
  useEffect(() => {
    if (gridState && !isApplying) {
      setSolarKw(gridState.solar_total_kw);
      setBatterySoc(gridState.battery.soc_pct);
      setDemandKw(gridState.total_demand_kw);
      setGridCapacityKw(gridState.transformer_capacity_kw);
    }
  }, [gridState?.step]);

  // Execute backend override and agent recalculation
  const applyOverride = async (overrides: {
    solar_kw?: number;
    battery_soc_pct?: number;
    demand_kw?: number;
    grid_capacity_kw?: number;
    reset_overrides?: boolean;
    actionLabel?: string;
  }) => {
    setIsApplying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulation/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          solar_kw: overrides.solar_kw,
          battery_soc_pct: overrides.battery_soc_pct,
          demand_kw: overrides.demand_kw,
          grid_capacity_kw: overrides.grid_capacity_kw,
          reset_overrides: overrides.reset_overrides,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state && data.metrics) {
          onStateUpdated(data.state, data.metrics, data.current_decision);
          setSolarKw(data.state.solar_total_kw);
          setBatterySoc(data.state.battery.soc_pct);
          setDemandKw(data.state.total_demand_kw);
          setGridCapacityKw(data.state.transformer_capacity_kw);
          setActiveDecision(data.current_decision);
          setLastActionMsg(
            overrides.actionLabel ||
              `Recalculated: Solar=${data.state.solar_total_kw}kW, Battery SOC=${data.state.battery.soc_pct}%, Demand=${data.state.total_demand_kw}kW.`
          );
        }
      }
    } catch (err) {
      console.error("Failed to apply energy override", err);
    } finally {
      setIsApplying(false);
    }
  };

  // Quick Adjustment Handlers
  const handleSolarChange = (delta: number) => {
    const newVal = Math.max(0, Math.round((solarKw + delta) * 10) / 10);
    setSolarKw(newVal);
    applyOverride({ solar_kw: newVal, actionLabel: `${delta > 0 ? "+" : ""}${delta} kW Solar adjusted` });
  };

  const handleBatteryChange = (deltaPct: number) => {
    const newVal = Math.max(5, Math.min(100, Math.round(batterySoc + deltaPct)));
    setBatterySoc(newVal);
    applyOverride({
      battery_soc_pct: newVal,
      actionLabel: `${deltaPct > 0 ? "+" : ""}${deltaPct}% Battery SOC adjusted`,
    });
  };

  const handleDemandChange = (deltaKw: number) => {
    const newVal = Math.max(5, Math.round((demandKw + deltaKw) * 10) / 10);
    setDemandKw(newVal);
    applyOverride({ demand_kw: newVal, actionLabel: `${deltaKw > 0 ? "+" : ""}${deltaKw} kW Demand adjusted` });
  };

  const handleResetOverrides = () => {
    applyOverride({ reset_overrides: true, actionLabel: "Reset to natural scenario physics & profiles" });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center space-x-2">
                <span>Energy Sources & Microgrid Dispatch Control</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Admin Real-Time Sandbox
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Directly manipulate microgrid energy levels. The multi-agent pipeline and LP optimizer will immediately recompute the final dispatch in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={handleResetOverrides}
            disabled={isApplying}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-700 hover:text-white hover:border-slate-500 transition-all shadow-sm"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isApplying ? "animate-spin" : ""}`} />
            <span>Reset Overrides</span>
          </button>
        </div>
      </div>

      {/* Real-time Recalculation Cause-and-Effect Banner */}
      {lastActionMsg && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-indigo-950/40 to-slate-900/80 border border-cyan-500/40 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                Live Cause & Effect Pipeline Recalculated:
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
              ⚡ Multi-Agent Dispatch Synced
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300 font-mono overflow-x-auto pb-1">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-200 font-bold shrink-0">
              Input: {lastActionMsg}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-indigo-200 shrink-0">
              7 Agents Re-evaluated
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-purple-200 shrink-0">
              LP Optimizer & Safety Layer
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold shrink-0">
              Decision: {activeDecision?.battery_action || "Updated"}
            </span>
          </div>
        </div>
      )}

      {/* Grid of Interactive Control Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. SOLAR GENERATION PANEL */}
        <div className="glass-panel p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/15 via-slate-900/90 to-slate-900/90 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Solar Generation</h3>
                  <span className="text-[10px] text-slate-400">Rooftops + 40 kW Solar Farm</span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-lg border border-amber-800/40">
                Max 65 kW
              </span>
            </div>

            {/* Direct Input */}
            <div className="my-4">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Current Output (kW)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="65"
                  step="0.5"
                  value={solarKw}
                  onChange={(e) => setSolarKw(parseFloat(e.target.value) || 0)}
                  onBlur={() => applyOverride({ solar_kw: solarKw, actionLabel: `Set Solar to ${solarKw} kW` })}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-lg font-mono font-black text-amber-300 focus:outline-none"
                />
                <button
                  onClick={() => applyOverride({ solar_kw: solarKw, actionLabel: `Set Solar to ${solarKw} kW` })}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Adjustments
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleSolarChange(-10)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors"
                >
                  -10 kW
                </button>
                <button
                  onClick={() => handleSolarChange(-5)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors"
                >
                  -5 kW
                </button>
                <button
                  onClick={() => handleSolarChange(5)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors"
                >
                  +5 kW
                </button>
                <button
                  onClick={() => handleSolarChange(10)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition-colors"
                >
                  +10 kW
                </button>
              </div>

              {/* Preset Scenarios */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setSolarKw(5.0);
                    applyOverride({ solar_kw: 5.0, actionLabel: "Cloud cover shock (5.0 kW Solar)" });
                  }}
                  className="py-1 rounded-lg text-[10px] font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40"
                >
                  ☁️ Cloud Drop (5 kW)
                </button>
                <button
                  onClick={() => {
                    setSolarKw(45.0);
                    applyOverride({ solar_kw: 45.0, actionLabel: "Midday Solar Surge (45.0 kW)" });
                  }}
                  className="py-1 rounded-lg text-[10px] font-semibold bg-amber-950/40 text-amber-300 border border-amber-800/40 hover:bg-amber-900/40"
                >
                  ☀️ Full Noon (45 kW)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Producers: 3 Installed</span>
            <span className="text-amber-400 font-mono font-semibold">Feed-in: ₹4.00/kWh</span>
          </div>
        </div>

        {/* 2. CENTRAL BATTERY STORAGE PANEL */}
        <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/15 via-slate-900/90 to-slate-900/90 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Battery className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Central BESS Storage</h3>
                  <span className="text-[10px] text-slate-400">120 kWh Capacity / ±35 kW Inverter</span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                {batterySoc.toFixed(0)}% SOC
              </span>
            </div>

            {/* Direct Input */}
            <div className="my-4">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                State of Charge (%)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="5"
                  max="100"
                  step="1"
                  value={batterySoc}
                  onChange={(e) => setBatterySoc(parseFloat(e.target.value) || 0)}
                  onBlur={() => applyOverride({ battery_soc_pct: batterySoc, actionLabel: `Set Battery SOC to ${batterySoc}%` })}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-xl px-3.5 py-2 text-lg font-mono font-black text-emerald-300 focus:outline-none"
                />
                <button
                  onClick={() => applyOverride({ battery_soc_pct: batterySoc, actionLabel: `Set Battery SOC to ${batterySoc}%` })}
                  className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Adjustments
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleBatteryChange(-20)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors"
                >
                  -20%
                </button>
                <button
                  onClick={() => handleBatteryChange(-10)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors"
                >
                  -10%
                </button>
                <button
                  onClick={() => handleBatteryChange(10)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors"
                >
                  +10%
                </button>
                <button
                  onClick={() => handleBatteryChange(20)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 transition-colors"
                >
                  +20%
                </button>
              </div>

              {/* Safety Reserve Presets */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setBatterySoc(20.0);
                    applyOverride({ battery_soc_pct: 20.0, actionLabel: "Battery SOC set to 20% (Safety Lock Triggered)" });
                  }}
                  className="py-1 rounded-lg text-[10px] font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40"
                >
                  🔒 Lock Reserve (20%)
                </button>
                <button
                  onClick={() => {
                    setBatterySoc(85.0);
                    applyOverride({ battery_soc_pct: 85.0, actionLabel: "Battery SOC set to 85% (High Reserve)" });
                  }}
                  className="py-1 rounded-lg text-[10px] font-semibold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/40"
                >
                  ⚡ Fully Charged (85%)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Safety Reserve: 25% Min Lock</span>
            <span className="text-emerald-400 font-mono font-semibold">
              Available: {Math.max(0, (batterySoc - 25) * 1.2).toFixed(1)} kWh
            </span>
          </div>
        </div>

        {/* 3. COMMUNITY DEMAND PANEL */}
        <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/15 via-slate-900/90 to-slate-900/90 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Community Demand</h3>
                  <span className="text-[10px] text-slate-400">10 Households + 4 EV Chargers</span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-800/40">
                {demandKw.toFixed(1)} kW
              </span>
            </div>

            {/* Direct Input */}
            <div className="my-4">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Total Load (kW)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="5"
                  max="120"
                  step="1"
                  value={demandKw}
                  onChange={(e) => setDemandKw(parseFloat(e.target.value) || 0)}
                  onBlur={() => applyOverride({ demand_kw: demandKw, actionLabel: `Set Demand to ${demandKw} kW` })}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-3.5 py-2 text-lg font-mono font-black text-indigo-300 focus:outline-none"
                />
                <button
                  onClick={() => applyOverride({ demand_kw: demandKw, actionLabel: `Set Demand to ${demandKw} kW` })}
                  className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Adjustments
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => handleDemandChange(-10)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 transition-colors"
                >
                  -10 kW
                </button>
                <button
                  onClick={() => handleDemandChange(-5)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 transition-colors"
                >
                  -5 kW
                </button>
                <button
                  onClick={() => handleDemandChange(5)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 transition-colors"
                >
                  +5 kW
                </button>
                <button
                  onClick={() => handleDemandChange(10)}
                  className="py-1.5 rounded-lg text-xs font-bold bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 transition-colors"
                >
                  +10 kW
                </button>
              </div>

              {/* Demand Presets */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setDemandKw(65.0);
                    applyOverride({ demand_kw: 65.0, actionLabel: "Simulate Dinner Peak Surge (65.0 kW Demand)" });
                  }}
                  className="py-1 rounded-lg text-[10px] font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40"
                >
                  🍽️ Dinner Surge (65 kW)
                </button>
                <button
                  onClick={() => {
                    setDemandKw(22.0);
                    applyOverride({ demand_kw: 22.0, actionLabel: "Simulate Base Night Load (22.0 kW Demand)" });
                  }}
                  className="py-1 rounded-lg text-[10px] font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 hover:bg-indigo-900/40"
                >
                  🌙 Base Night (22 kW)
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Flexible Portion: ~14.5 kW</span>
            <span className="text-indigo-400 font-mono font-semibold">Retail Tariff: ₹13.50/kWh</span>
          </div>
        </div>

        {/* 4. SUBSTATION TRANSFORMER CAPACITY PANEL */}
        <div className="glass-panel p-5 rounded-3xl border border-rose-500/30 bg-gradient-to-b from-rose-950/15 via-slate-900/90 to-slate-900/90 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Main Grid Substation</h3>
                  <span className="text-[10px] text-slate-400">Distribution Transformer Rating</span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded-lg border border-rose-800/40">
                {gridCapacityKw.toFixed(0)} kW Limit
              </span>
            </div>

            {/* Direct Input */}
            <div className="my-4">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Transformer Rating (kW)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="20"
                  max="150"
                  step="5"
                  value={gridCapacityKw}
                  onChange={(e) => setGridCapacityKw(parseFloat(e.target.value) || 0)}
                  onBlur={() =>
                    applyOverride({
                      grid_capacity_kw: gridCapacityKw,
                      actionLabel: `Set Transformer Capacity to ${gridCapacityKw} kW`,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 focus:border-rose-400 rounded-xl px-3.5 py-2 text-lg font-mono font-black text-rose-300 focus:outline-none"
                />
                <button
                  onClick={() =>
                    applyOverride({
                      grid_capacity_kw: gridCapacityKw,
                      actionLabel: `Set Transformer Capacity to ${gridCapacityKw} kW`,
                    })
                  }
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Quick Capacity Stress Testing */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Capacity Stress Tests
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setGridCapacityKw(30.0);
                    applyOverride({
                      grid_capacity_kw: 30.0,
                      actionLabel: "Choked Substation: Capacity reduced to 30.0 kW",
                    });
                  }}
                  className="p-2 rounded-xl text-left bg-slate-900 border border-rose-900/50 hover:border-rose-500/60"
                >
                  <span className="text-xs font-bold text-rose-300 block">30 kW Choke</span>
                  <span className="text-[10px] text-slate-400">Forces emergency peak shaving</span>
                </button>

                <button
                  onClick={() => {
                    setGridCapacityKw(75.0);
                    applyOverride({
                      grid_capacity_kw: 75.0,
                      actionLabel: "Expanded Substation: Capacity increased to 75.0 kW",
                    });
                  }}
                  className="p-2 rounded-xl text-left bg-slate-900 border border-slate-800 hover:border-cyan-500/60"
                >
                  <span className="text-xs font-bold text-cyan-300 block">75 kW Expanded</span>
                  <span className="text-[10px] text-slate-400">High grid import headroom</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Warning Level: 80%</span>
            <span className="text-rose-400 font-mono font-semibold">Critical Violation: 95%</span>
          </div>
        </div>

        {/* 5. P2P MARKET STATUS CARD */}
        <div className="glass-panel p-5 rounded-3xl border border-purple-500/30 bg-gradient-to-b from-purple-950/15 via-slate-900/90 to-slate-900/90 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">P2P Trading Pool</h3>
                  <span className="text-[10px] text-slate-400">Autonomous Double-Auction LP</span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded-lg border border-purple-800/40">
                ₹8.50/kWh
              </span>
            </div>

            <div className="space-y-3 my-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-medium">P2P Traded Volume:</span>
                <span className="font-mono font-bold text-purple-300">
                  {gridState?.p2p_volume_kwh || 0} kWh (This Step)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Cumulative P2P Traded:</span>
                <span className="font-mono font-bold text-slate-200">
                  {metrics?.p2p_energy_traded_kwh.toFixed(1) || 0} kWh ({metrics?.p2p_trade_count || 0} trades)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Market Clearing Spread:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹5.00/kWh consumer discount
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Marketplace: Active</span>
            <span className="text-purple-400 font-mono font-semibold">100% Peer Retained</span>
          </div>
        </div>

        {/* 6. EV FLEET STATUS CARD */}
        <div className="glass-panel p-5 rounded-3xl border border-teal-500/30 bg-gradient-to-b from-teal-950/15 via-slate-900/90 to-slate-900/90 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">EV Fleet Subsystem</h3>
                  <span className="text-[10px] text-slate-400">4 Community Fleet Vehicles</span>
                </div>
              </div>
              <span className="text-xs font-mono font-black text-teal-400 bg-teal-950/50 px-2 py-0.5 rounded-lg border border-teal-800/40">
                {gridState?.ev_charging_total_kw || 0} kW Load
              </span>
            </div>

            <div className="space-y-2.5 my-3 text-xs">
              {gridState?.evs.map((ev, idx) => (
                <div
                  key={ev.ev_id}
                  className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-teal-300">{ev.ev_id}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ev.current_soc_pct.toFixed(0)}% → {ev.target_soc_pct}%
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      ev.is_charging
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                        : ev.is_delayed
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {ev.is_charging ? "Charging" : ev.is_delayed ? "Deferred" : "Unplugged"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Deadline: 22:30 Max</span>
            <span className="text-teal-400 font-mono font-semibold">Smart Delay Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};
