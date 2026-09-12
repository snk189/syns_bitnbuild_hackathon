"use client";

import React from "react";
import { MessageSquare, Bot, AlertCircle, CheckCircle2, Shield, ArrowRight } from "lucide-react";
import { AgentMessage } from "../types";

interface AgentActivityFeedProps {
  messages: AgentMessage[];
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({ messages }) => {
  const getAgentColor = (sender: string) => {
    switch (sender) {
      case "ForecastAgent":
        return "text-cyan-400 border-cyan-500/30 bg-cyan-950/30";
      case "GridAgent":
        return "text-amber-400 border-amber-500/30 bg-amber-950/30";
      case "SolarAgent":
        return "text-yellow-400 border-yellow-500/30 bg-yellow-950/30";
      case "BatteryAgent":
        return "text-emerald-400 border-emerald-500/30 bg-emerald-950/30";
      case "ConsumerAgent":
        return "text-indigo-400 border-indigo-500/30 bg-indigo-950/30";
      case "EVAgent":
        return "text-teal-400 border-teal-500/30 bg-teal-950/30";
      case "MarketAgent":
        return "text-purple-400 border-purple-500/30 bg-purple-950/30";
      default:
        return "text-rose-400 border-rose-500/30 bg-rose-950/30";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "EMERGENCY":
        return "bg-rose-600 text-white font-black animate-pulse";
      case "HIGH":
        return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
      default:
        return "bg-slate-800 text-slate-300";
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-[340px]">
      <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">
            Autonomous Agent Communication & Negotiation Feed
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
          Live Inter-Agent Bus
        </span>
      </div>

      {/* Scrollable message feed */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
            <span>Awaiting agent communication triggers...</span>
          </div>
        ) : (
          messages.slice(-25).reverse().map((msg) => (
            <div
              key={msg.id}
              className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/70 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${getAgentColor(msg.sender)}`}>
                    {msg.sender}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                    {msg.receiver}
                  </span>
                  <span className="text-[9px] font-mono text-purple-300 uppercase tracking-wide px-1.5 py-0.2 rounded bg-purple-950/40 border border-purple-800/40">
                    {msg.message_type.replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px]">
                  <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${getPriorityBadge(msg.priority)}`}>
                    {msg.priority}
                  </span>
                  <span className="text-slate-500 font-mono">{msg.time_str}</span>
                </div>
              </div>

              <p className="text-xs text-slate-200 font-medium pl-1 leading-relaxed">
                {msg.content}
              </p>

              {msg.reasoning && (
                <div className="mt-1.5 pl-2 border-l-2 border-slate-700 text-[11px] text-slate-400 italic">
                  <span className="text-slate-500 font-semibold not-italic">Reasoning: </span>
                  &ldquo;{msg.reasoning}&rdquo;
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
