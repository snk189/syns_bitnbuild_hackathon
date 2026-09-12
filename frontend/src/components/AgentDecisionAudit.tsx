"use client";

import React, { useState } from "react";
import { FileText, Wrench, Shield, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { AgentDecisionLog } from "../types";

interface AgentDecisionAuditProps {
  decisions: AgentDecisionLog[];
}

export const AgentDecisionAudit: React.FC<AgentDecisionAuditProps> = ({ decisions }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-[340px]">
      <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">
            Explainable Decision Audit Trail
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
          Reasoning & Constraints Verifier
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {decisions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <FileText className="w-8 h-8 mb-2 opacity-40" />
            <span>Awaiting autonomous agent decisions...</span>
          </div>
        ) : (
          decisions.slice(0, 15).map((log, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                onClick={() => toggleExpand(idx)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
                      {log.agent}
                    </span>
                    <span className="text-xs font-bold text-slate-100">{log.decision}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <span className="font-mono text-[11px]">{log.time_str}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  <span className="text-slate-500 font-semibold">Reason: </span>
                  {log.reason}
                </p>

                {isExpanded && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] space-y-2 animate-fadeIn">
                    <div>
                      <span className="text-slate-400 font-semibold">Observation: </span>
                      <span className="text-slate-200 font-mono">{log.observation}</span>
                    </div>

                    {log.constraints && log.constraints.length > 0 && (
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-slate-400 font-semibold">Constraints Verified:</span>
                        {log.constraints.map((c, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {log.tools_used && log.tools_used.length > 0 && (
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-slate-400 font-semibold">Tools Executed:</span>
                        {log.tools_used.map((t, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-800/40"
                          >
                            {t}()
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
