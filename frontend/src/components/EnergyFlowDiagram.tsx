"use client";

import React from "react";
import { Zap, Sun, BatteryCharging, Home, Car, DollarSign } from "lucide-react";
import { GridState } from "../types";

interface EnergyFlowDiagramProps {
  state: GridState;
}

export const EnergyFlowDiagram: React.FC<EnergyFlowDiagramProps> = ({ state }) => {
  const solarGen = state.solar_total_kw;
  const gridImport = state.grid_import_kw;
  const gridExport = state.grid_export_kw;
  const battDischarge = state.battery_discharge_kw;
  const battCharge = state.battery_charge_kw;
  const evDemand = state.ev_charging_total_kw;
  const homeDemand = state.household_base_total_kw + state.household_flexible_total_kw;
  const p2pVolume = state.p2p_volume_kwh;

  return (
    <div className="glass-panel rounded-2xl p-4 w-full flex flex-col justify-between">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">
            Real-Time Microgrid Power Flow
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-semibold text-slate-400">
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 inline-block" />Solar ({solarGen.toFixed(1)} kW)</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-cyan-400 mr-1.5 inline-block" />Storage ({(battDischarge - battCharge).toFixed(1)} kW)</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-400 mr-1.5 inline-block" />P2P Local</span>
          <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-indigo-400 mr-1.5 inline-block" />Grid ({gridImport > 0 ? `+${gridImport.toFixed(1)}` : `-${gridExport.toFixed(1)}`} kW)</span>
        </div>
      </div>

      {/* SVG Canvas for Topological Power Flow */}
      <div className="relative w-full h-[320px] bg-slate-950/60 rounded-xl border border-slate-800/60 overflow-hidden flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 800 320" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Defs for gradients & glow filters */}
          <defs>
            <linearGradient id="grad-solar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="grad-grid" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#4338ca" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="grad-battery" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="grad-market" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.3" />
            </linearGradient>

            <filter id="glow-solar" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background grid lines */}
          <path d="M 50 160 L 750 160" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M 400 30 L 400 290" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />

          {/* CONNECTING POWER FLOW LINES */}
          {/* 1. Solar (150, 70) -> P2P Market Hub (400, 160) */}
          <path
            d="M 170 85 Q 280 110 380 150"
            stroke={solarGen > 1.0 ? "#f59e0b" : "#334155"}
            strokeWidth={solarGen > 1.0 ? "3" : "1.5"}
            className={solarGen > 1.0 ? "animate-dash-flow" : ""}
            strokeOpacity={solarGen > 1.0 ? 0.9 : 0.4}
            filter={solarGen > 1.0 ? "url(#glow-solar)" : undefined}
          />

          {/* 2. Solar (150, 70) -> Central Battery (150, 250) */}
          <path
            d="M 150 95 L 150 225"
            stroke={battCharge > 0.5 ? "#06b6d4" : "#1e293b"}
            strokeWidth={battCharge > 0.5 ? "3.5" : "1.5"}
            className={battCharge > 0.5 ? "animate-dash-flow" : ""}
            strokeOpacity={battCharge > 0.5 ? 1 : 0.3}
          />

          {/* 3. Main Grid Substation (400, 50) -> Market Hub / Community (400, 160) */}
          <path
            d="M 400 70 L 400 135"
            stroke={gridImport > 0.5 ? "#6366f1" : gridExport > 0.5 ? "#06b6d4" : "#334155"}
            strokeWidth={gridImport > 1.0 || gridExport > 1.0 ? "3.5" : "1.5"}
            className={gridImport > 0.5 ? "animate-dash-flow" : gridExport > 0.5 ? "animate-dash-reverse" : ""}
            strokeOpacity={gridImport > 0.5 ? 0.9 : 0.4}
          />

          {/* 4. Central Battery (150, 250) -> Market Hub (400, 160) */}
          <path
            d="M 180 240 Q 280 200 375 170"
            stroke={battDischarge > 0.5 ? "#06b6d4" : "#1e293b"}
            strokeWidth={battDischarge > 0.5 ? "3.5" : "1.5"}
            className={battDischarge > 0.5 ? "animate-dash-flow" : ""}
            strokeOpacity={battDischarge > 0.5 ? 1 : 0.3}
            filter={battDischarge > 0.5 ? "url(#glow-cyan)" : undefined}
          />

          {/* 5. Market Hub (400, 160) -> Residential Homes (650, 80) */}
          <path
            d="M 425 150 Q 520 110 620 90"
            stroke="#a855f7"
            strokeWidth={homeDemand > 5 ? "3" : "1.5"}
            className="animate-dash-flow"
            strokeOpacity={homeDemand > 5 ? 0.9 : 0.4}
          />

          {/* 6. Market Hub (400, 160) -> EV Charging Station (650, 240) */}
          <path
            d="M 425 170 Q 520 200 620 230"
            stroke={evDemand > 0.5 ? "#10b981" : "#334155"}
            strokeWidth={evDemand > 0.5 ? "3" : "1.5"}
            className={evDemand > 0.5 ? "animate-dash-flow" : ""}
            strokeOpacity={evDemand > 0.5 ? 0.9 : 0.3}
          />

          {/* POWER NODES */}
          {/* Node 1: Solar Arrays */}
          <g transform="translate(150, 70)">
            <circle r="36" fill="url(#grad-solar)" stroke="#f59e0b" strokeWidth="2" filter="url(#glow-solar)" />
            <foreignObject x="-24" y="-24" width="48" height="48">
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <Sun className="w-5 h-5 text-amber-200" />
              </div>
            </foreignObject>
            <text y="48" fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">Solar Arrays</text>
            <text y="61" fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="middle">{solarGen.toFixed(1)} kW</text>
          </g>

          {/* Node 2: Central Battery Bank */}
          <g transform="translate(150, 250)">
            <circle r="34" fill="url(#grad-battery)" stroke="#06b6d4" strokeWidth="2" filter="url(#glow-cyan)" />
            <foreignObject x="-24" y="-24" width="48" height="48">
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <BatteryCharging className="w-5 h-5 text-cyan-200" />
              </div>
            </foreignObject>
            <text y="46" fill="#22d3ee" fontSize="11" fontWeight="bold" textAnchor="middle">Central Battery</text>
            <text y="59" fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="middle">
              {state.battery.soc_pct.toFixed(0)}% SOC ({battDischarge > 0 ? `-${battDischarge.toFixed(1)}` : battCharge > 0 ? `+${battCharge.toFixed(1)}` : "0"} kW)
            </text>
          </g>

          {/* Node 3: Main Grid Substation */}
          <g transform="translate(400, 50)">
            <rect x="-42" y="-24" width="84" height="48" rx="14" fill="url(#grad-grid)" stroke="#818cf8" strokeWidth="2" />
            <foreignObject x="-42" y="-24" width="84" height="48">
              <div className="w-full h-full flex items-center justify-center space-x-1.5 text-white">
                <Zap className="w-4 h-4 text-indigo-300" />
                <span className="text-[11px] font-extrabold tracking-wider">GRID</span>
              </div>
            </foreignObject>
            <text y="38" fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="middle">
              {gridImport > 0 ? `Import ${gridImport.toFixed(1)} kW` : gridExport > 0 ? `Export ${gridExport.toFixed(1)} kW` : "0.0 kW"}
            </text>
          </g>

          {/* Node 4: P2P Trading Hub / Microgrid Dispatch Center */}
          <g transform="translate(400, 160)">
            <circle r="40" fill="url(#grad-market)" stroke="#c084fc" strokeWidth="2.5" />
            <foreignObject x="-30" y="-30" width="60" height="60">
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <DollarSign className="w-5 h-5 text-purple-200" />
                <span className="text-[9px] font-black tracking-tighter">P2P HUB</span>
              </div>
            </foreignObject>
            <text y="52" fill="#d8b4fe" fontSize="11" fontWeight="bold" textAnchor="middle">Microgrid Market</text>
            <text y="65" fill="#a855f7" fontSize="10" fontFamily="monospace" textAnchor="middle">₹{state.p2p_clearing_price_kwh.toFixed(2)}/kWh</text>
          </g>

          {/* Node 5: Residential Community */}
          <g transform="translate(650, 80)">
            <circle r="34" fill="#1e293b" stroke="#a78bfa" strokeWidth="2" />
            <foreignObject x="-24" y="-24" width="48" height="48">
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <Home className="w-5 h-5 text-purple-300" />
              </div>
            </foreignObject>
            <text y="46" fill="#c4b5fd" fontSize="11" fontWeight="bold" textAnchor="middle">Neighborhood</text>
            <text y="59" fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="middle">{homeDemand.toFixed(1)} kW Demand</text>
          </g>

          {/* Node 6: EV Fleet Station */}
          <g transform="translate(650, 240)">
            <circle r="34" fill="#1e293b" stroke={evDemand > 0.5 ? "#34d399" : "#64748b"} strokeWidth="2" />
            <foreignObject x="-24" y="-24" width="48" height="48">
              <div className="w-full h-full flex flex-col items-center justify-center text-white">
                <Car className="w-5 h-5 text-emerald-400" />
              </div>
            </foreignObject>
            <text y="46" fill="#6ee7b7" fontSize="11" fontWeight="bold" textAnchor="middle">EV Charging Fleet</text>
            <text y="59" fill="#cbd5e1" fontSize="10" fontFamily="monospace" textAnchor="middle">
              {evDemand > 0 ? `${evDemand.toFixed(1)} kW (Charging)` : "Delayed / Standby"}
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
};
