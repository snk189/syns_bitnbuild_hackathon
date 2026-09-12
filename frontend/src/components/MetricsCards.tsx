"use client";

import React from "react";
import { Zap, Sun, BatteryCharging, Home, DollarSign, Leaf, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { GridState, SimulationMetrics } from "../types";

interface MetricsCardsProps {
  state: GridState;
  metrics: SimulationMetrics;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ state, metrics }) => {
  const isImporting = state.grid_import_kw > 0.1;
  const isDischarging = state.battery_discharge_kw > 0.1;
  const isCharging = state.battery_charge_kw > 0.1;

  const totalDemandKw = state.household_base_total_kw + state.household_flexible_total_kw + state.ev_charging_total_kw;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 w-full">
      {/* 1. Grid Import / Export */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 flex flex-col justify-between">
        <div className="flex justify-between items-center text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Main Grid Power</span>
          <div className={`p-1.5 rounded-lg ${isImporting ? "bg-amber-500/20 text-amber-400" : "bg-cyan-500/20 text-cyan-400"}`}>
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-2xl font-mono font-extrabold ${isImporting ? "text-amber-300" : "text-cyan-300"}`}>
              {isImporting ? state.grid_import_kw.toFixed(1) : state.grid_export_kw.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">kW</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 flex items-center mt-0.5">
            {isImporting ? (
              <span className="text-amber-400 flex items-center">
                <ArrowDownRight className="w-3 h-3 mr-0.5" /> Import
              </span>
            ) : (
              <span className="text-cyan-400 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> Export
              </span>
            )}
            <span className="ml-1 text-slate-500">| Peak: {metrics.peak_grid_demand_kw.toFixed(1)} kW</span>
          </span>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
          <span>Tariff</span>
          <span className="font-mono text-slate-200">₹{state.grid_buy_price_kwh}/kWh</span>
        </div>
      </div>

      {/* 2. Solar Generation */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 flex flex-col justify-between">
        <div className="flex justify-between items-center text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Solar Gen</span>
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Sun className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-mono font-extrabold text-amber-400">
              {state.solar_total_kw.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">kW</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
            {state.weather.replace("_", " ")} | {state.solar_irradiance_wm2.toFixed(0)} W/m²
          </span>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
          <span>Total Today</span>
          <span className="font-mono text-amber-300">{metrics.total_solar_generated_kwh.toFixed(1)} kWh</span>
        </div>
      </div>

      {/* 3. Central Battery SOC */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 flex flex-col justify-between">
        <div className="flex justify-between items-center text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Central Battery</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
            <BatteryCharging className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-2xl font-mono font-extrabold ${state.battery.soc_pct <= 25 ? "text-rose-400" : "text-cyan-400"}`}>
              {state.battery.soc_pct.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-400">SOC</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full ${state.battery.soc_pct <= 25 ? "bg-rose-500" : "bg-cyan-500"}`}
              style={{ width: `${state.battery.soc_pct}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
            {isDischarging ? (
              <span className="text-amber-400">Discharging {state.battery_discharge_kw.toFixed(1)} kW</span>
            ) : isCharging ? (
              <span className="text-emerald-400">Charging {state.battery_charge_kw.toFixed(1)} kW</span>
            ) : (
              <span className="text-slate-400">Standby (Reserve: {state.battery.min_reserve_soc_pct}%)</span>
            )}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
          <span>Capacity</span>
          <span className="font-mono text-slate-200">{state.battery.capacity_kwh} kWh</span>
        </div>
      </div>

      {/* 4. Total Community Demand */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 flex flex-col justify-between">
        <div className="flex justify-between items-center text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Total Demand</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Home className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-mono font-extrabold text-indigo-300">
              {totalDemandKw.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400">kW</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
            Homes: {(state.household_base_total_kw + state.household_flexible_total_kw).toFixed(1)} kW | EVs: {state.ev_charging_total_kw.toFixed(1)} kW
          </span>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
          <span>Shifts Made</span>
          <span className="font-mono text-emerald-400">{metrics.flexible_loads_shifted_count} events</span>
        </div>
      </div>

      {/* 5. P2P Energy Trading */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 flex flex-col justify-between">
        <div className="flex justify-between items-center text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">P2P Exchange</span>
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-mono font-extrabold text-purple-300">
              ₹{state.p2p_clearing_price_kwh.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">/kWh</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-400 mt-0.5 block">
            Save ₹{(state.grid_buy_price_kwh - state.p2p_clearing_price_kwh).toFixed(2)} vs Grid!
          </span>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
          <span>Traded Vol</span>
          <span className="font-mono text-purple-300">{metrics.p2p_energy_traded_kwh.toFixed(1)} kWh</span>
        </div>
      </div>

      {/* 6. Renewable Share & CO2 */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 flex flex-col justify-between">
        <div className="flex justify-between items-center text-slate-400">
          <span className="text-[11px] font-bold uppercase tracking-wider">Clean Energy</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Leaf className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-mono font-extrabold text-emerald-400">
              {metrics.renewable_utilization_pct.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-400">clean</span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
            CO2: {metrics.estimated_co2_kg.toFixed(1)} kg emitted
          </span>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
          <span>Cost So Far</span>
          <span className="font-mono text-slate-200">₹{metrics.total_cost.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
};
