"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, Flame, Activity, Zap } from "lucide-react";
import { GridStatus } from "../types";

interface GridStatusBannerProps {
  status: GridStatus;
  transformerLoadPct: number;
  transformerCapacityKw: number;
  voltagePu: number;
  frequencyHz: number;
  crisisTriggered: boolean;
}

export const GridStatusBanner: React.FC<GridStatusBannerProps> = ({
  status,
  transformerLoadPct,
  transformerCapacityKw,
  voltagePu,
  frequencyHz,
  crisisTriggered,
}) => {
  const isCritical = status === "CRITICAL" || transformerLoadPct >= 95;
  const isWarning = status === "WARNING" || (transformerLoadPct >= 80 && !isCritical);

  let bannerClass = "border-emerald-500/30 bg-emerald-950/20 text-emerald-300";
  let badgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  let statusText = "GRID OPERATING NORMALLY";
  let subText = "Power flow balanced. Transformer within nominal capacity. No active line violations.";
  let StatusIcon = ShieldCheck;

  if (isCritical) {
    bannerClass = "border-rose-500/50 bg-rose-950/40 text-rose-300 glow-rose animate-pulse";
    badgeClass = "bg-rose-600 text-white border-rose-400";
    statusText = "CRITICAL GRID OVERLOAD — EMERGENCY MODE ACTIVE";
    subText = "Transformer loading exceeds safe operating capacity! Automated multi-agent peak shaving & load shifting engaged.";
    StatusIcon = Flame;
  } else if (isWarning) {
    bannerClass = "border-amber-500/40 bg-amber-950/30 text-amber-300 glow-amber";
    badgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/50";
    statusText = "ELEVATED GRID STRESS — PRE-EMPTIVE SHAVING";
    subText = "Transformer approaching 80% ceiling. Battery dispatch and EV delay protocols solicited.";
    StatusIcon = AlertTriangle;
  }

  return (
    <div className={`w-full rounded-2xl border p-4 transition-all duration-500 ${bannerClass}`}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Status Indicator */}
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-current shadow-inner">
            <StatusIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider uppercase border ${badgeClass}`}>
                {status}
              </span>
              <h2 className="text-base font-bold tracking-wide">{statusText}</h2>
              {crisisTriggered && (
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-bounce">
                  Stress Injected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300/80 mt-0.5">{subText}</p>
          </div>
        </div>

        {/* Electrical Metrics Gauges */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Transformer Loading Bar */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-3.5 py-2 min-w-[200px] flex-1 lg:flex-initial">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-medium">Transformer Load</span>
              <span className={`font-mono font-bold ${isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"}`}>
                {transformerLoadPct.toFixed(1)}% / {transformerCapacityKw} kW
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCritical ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, transformerLoadPct)}%` }}
              />
            </div>
          </div>

          {/* Voltage per-unit */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-3.5 py-2 text-center min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Voltage</span>
            <span className={`text-sm font-mono font-bold ${voltagePu < 0.95 || voltagePu > 1.05 ? "text-amber-400" : "text-cyan-400"}`}>
              {voltagePu.toFixed(3)} pu
            </span>
          </div>

          {/* Frequency Hz */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-3.5 py-2 text-center min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Frequency</span>
            <span className={`text-sm font-mono font-bold ${frequencyHz < 49.8 || frequencyHz > 50.2 ? "text-amber-400" : "text-emerald-400"}`}>
              {frequencyHz.toFixed(2)} Hz
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
