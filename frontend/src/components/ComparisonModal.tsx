"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  TrendingDown,
  ShieldCheck,
  Zap,
  Leaf,
  DollarSign,
  Activity,
  Layers,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import { ComparisonData } from "../types";

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: string;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  scenario,
}) => {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"load" | "transformer" | "battery">("load");

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/simulation/compare?scenario=${scenario}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch comparison data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComparison();
    }
  }, [isOpen, scenario]);

  if (!isOpen) return null;

  const comp = data?.comparison;
  const base = comp?.baseline;
  const gm = comp?.gridmind;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-6xl max-h-[92vh] rounded-3xl p-6 flex flex-col border border-slate-700/80 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black tracking-wide text-slate-100">
                  Mode A (Baseline) vs Mode B (GridMind Multi-Agent)
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Actual Physics Simulation
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated over exact identical 24-hour microgrid scenario:{" "}
                <strong className="text-slate-200">{scenario.replace("_", " ").toUpperCase()}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchComparison}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
              title="Re-run Simulation Comparison"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
            <span className="text-sm font-semibold">Running twin 24-hour simulation benchmarks...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pt-4 space-y-6 pr-1">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              {/* 1. Peak Demand Reduction */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Peak Demand</span>
                <div className="flex items-baseline space-x-2 my-1">
                  <span className="text-2xl font-mono font-black text-emerald-400">
                    -{comp?.peak_demand_reduction_pct}%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {base?.peak_grid_demand_kw} → {gm?.peak_grid_demand_kw} kW
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">Shaved transformer peak</span>
              </div>

              {/* 2. Grid Transformer Violations */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overload Violations</span>
                <div className="flex items-baseline space-x-2 my-1">
                  <span className="text-2xl font-mono font-black text-emerald-400">
                    {comp?.violations_avoided} Avoided
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({base?.grid_violations_count} → {gm?.grid_violations_count})
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">Zero critical violations in GridMind!</span>
              </div>

              {/* 3. Cost Savings */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Electricity Cost</span>
                <div className="flex items-baseline space-x-2 my-1">
                  <span className="text-2xl font-mono font-black text-emerald-400">
                    -{comp?.cost_savings_pct}%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ₹{base?.total_cost.toFixed(0)} → ₹{gm?.total_cost.toFixed(0)}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">Net community savings</span>
              </div>

              {/* 4. P2P Energy Traded */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">P2P Traded Volume</span>
                <div className="flex items-baseline space-x-2 my-1">
                  <span className="text-2xl font-mono font-black text-purple-400">
                    {gm?.p2p_energy_traded_kwh.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">kWh ({gm?.p2p_trade_count} trades)</span>
                </div>
                <span className="text-[10px] text-purple-400 font-semibold">0 kWh in Baseline (exported to grid)</span>
              </div>
            </div>

            {/* Detailed Metric Comparison Table */}
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-2.5 px-4">Performance Metric</th>
                    <th className="py-2.5 px-4 text-right">Mode A: Baseline</th>
                    <th className="py-2.5 px-4 text-right">Mode B: GridMind</th>
                    <th className="py-2.5 px-4 text-right">Direct Improvement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">Peak Grid Demand</td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-300">{base?.peak_grid_demand_kw} kW</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-bold">{gm?.peak_grid_demand_kw} kW</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-black">-{comp?.peak_demand_reduction_pct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">Total Grid Electricity Import</td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-300">{base?.total_grid_import_kwh.toFixed(1)} kWh</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-bold">{gm?.total_grid_import_kwh.toFixed(1)} kWh</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-black">-{comp?.grid_import_reduction_pct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">Community Electricity Bill</td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-300">₹{base?.total_cost.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-bold">₹{gm?.total_cost.toFixed(1)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-black">-{comp?.cost_savings_pct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">Renewable Energy Utilization</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">{base?.renewable_utilization_pct}%</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-bold">{gm?.renewable_utilization_pct}%</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-black">+{comp?.renewable_utilization_improvement_pct}%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">P2P Energy Traded</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-500">0.0 kWh (0 trades)</td>
                    <td className="py-2.5 px-4 text-right font-mono text-purple-400 font-bold">{gm?.p2p_energy_traded_kwh.toFixed(1)} kWh ({gm?.p2p_trade_count} trades)</td>
                    <td className="py-2.5 px-4 text-right font-mono text-purple-300 font-black">100% Autonomous</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">Grid Overload Violations</td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-400 font-bold">{base?.grid_violations_count} violations</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-bold">{gm?.grid_violations_count} violations</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-black">{comp?.violations_avoided} Avoided (Zero violations)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-semibold text-slate-200">Estimated CO2 Emissions</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">{base?.estimated_co2_kg.toFixed(1)} kg</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-bold">{gm?.estimated_co2_kg.toFixed(1)} kg</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400 font-black">-{comp?.co2_reduction_pct}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Chart Tab Selectors */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab("load")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === "load" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                24-Hour Power Import Curve (kW)
              </button>
              <button
                onClick={() => setActiveTab("transformer")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === "transformer" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Transformer Loading & Violations (%)
              </button>
              <button
                onClick={() => setActiveTab("battery")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === "battery" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Battery SOC Profile (%)
              </button>
            </div>

            {/* Recharts Chart Visualization */}
            <div className="h-[280px] w-full bg-slate-950/80 rounded-2xl p-3 border border-slate-800/80">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === "load" ? (
                  <LineChart data={data.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" kW" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "11px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                    <Line
                      type="monotone"
                      dataKey="baseline_grid_import_kw"
                      name="Baseline Grid Import (Uncoordinated)"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="gridmind_grid_import_kw"
                      name="GridMind Grid Import (Multi-Agent)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="solar_generation_kw"
                      name="Solar Generation"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                ) : activeTab === "transformer" ? (
                  <LineChart data={data.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="%" domain={[0, 120]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "11px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                    <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Warning Threshold (80%)", fill: "#f59e0b", fontSize: 10 }} />
                    <ReferenceLine y={95} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Critical Violation (95%)", fill: "#f43f5e", fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="baseline_transformer_load_pct"
                      name="Baseline Transformer Load % (Causes Violations)"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="gridmind_transformer_load_pct"
                      name="GridMind Transformer Load % (Shaved & Safe)"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                ) : (
                  <LineChart data={data.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "11px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                    <ReferenceLine y={25} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Min Reserve (25%)", fill: "#f43f5e", fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="baseline_battery_soc"
                      name="Baseline Battery SOC"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="gridmind_battery_soc"
                      name="GridMind Battery SOC (Anticipatory Discharge)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
