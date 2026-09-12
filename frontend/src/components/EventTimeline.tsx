"use client";

import React from "react";
import { Clock, CheckCircle, AlertTriangle, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { AgentMessage } from "../types";

interface EventTimelineProps {
  messages: AgentMessage[];
  currentStep: number;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ messages, currentStep }) => {
  // Filter out high-impact milestone events or fallback to latest coordination checkpoints
  const filtered = messages.filter(
    (m) =>
      m.priority === "HIGH" ||
      m.priority === "EMERGENCY" ||
      m.message_type === "P2P_TRADE_CONFIRM" ||
      m.message_type === "CRISIS_INJECTED" ||
      m.message_type === "AGENT_INIT"
  );
  const timelineEvents = (filtered.length > 0 ? filtered : messages).slice(-12).reverse();

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-[340px]">
      <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">
            Autonomous Incident & Coordination Timeline
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
          Chronological Audit
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {timelineEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <ShieldCheck className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
            <span>Normal operation. No critical crisis events on timeline yet.</span>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {timelineEvents.map((ev, idx) => {
              const isCrisis = ev.priority === "EMERGENCY" || ev.message_type === "CRISIS_INJECTED";
              return (
                <div key={idx} className="relative group">
                  <div
                    className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-slate-950 ${
                      isCrisis ? "bg-rose-500 ring-rose-950/80 animate-ping" : "bg-cyan-400 ring-cyan-950/80"
                    }`}
                  />
                  <div className="flex items-baseline space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{ev.time_str}</span>
                    <span
                      className={`text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded ${
                        isCrisis ? "bg-rose-950/60 text-rose-300 border border-rose-800/50" : "bg-cyan-950/60 text-cyan-300 border border-cyan-800/50"
                      }`}
                    >
                      {ev.sender}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-0.5 font-medium leading-relaxed">
                    {ev.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
