"use client";

import React, { useState } from "react";
import { Zap, Shield, ArrowRight, User, Key, Sparkles, Building2, BatteryCharging } from "lucide-react";

interface LoginPortalProps {
  onLogin: (name: string, role: "admin" | "user") => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({ onLogin }) => {
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError("Please enter a name to continue.");
      return;
    }

    if (trimmed.toLowerCase() === "admin") {
      onLogin("admin", "admin");
    } else {
      onLogin(trimmed, "user");
    }
  };

  const handleQuickSelect = (name: string) => {
    setNameInput(name);
    setError(null);
    if (name.toLowerCase() === "admin") {
      onLogin("admin", "admin");
    } else {
      onLogin(name, "user");
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 border border-slate-700/80 shadow-2xl relative z-10 backdrop-blur-xl animate-fadeIn">
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-cyan-500/25 mb-4 animate-pulse">
            <Zap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            GRIDMIND
          </h1>
          <p className="text-xs text-cyan-300/80 uppercase tracking-widest font-bold mt-1">
            Autonomous Multi-Agent Microgrid & P2P Energy
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
            Decentralized community power balancing, autonomous market clearing & peak shaving.
          </p>
        </div>

        {/* Name Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Enter Your Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. admin or Rahul"
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2 group"
          >
            <span>Continue to Platform</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Demo Roles Quick Pick */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center mb-3">
            Quick Select Demo Mode
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleQuickSelect("admin")}
              className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-cyan-500/30 hover:border-cyan-400 text-left transition-all group"
            >
              <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-bold mb-0.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Mode</span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-300">
                Full microgrid control & agent telemetry
              </p>
            </button>

            <button
              onClick={() => handleQuickSelect("Rahul")}
              className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-purple-500/30 hover:border-purple-400 text-left transition-all group"
            >
              <div className="flex items-center space-x-1.5 text-purple-400 text-xs font-bold mb-0.5">
                <BatteryCharging className="w-3.5 h-3.5" />
                <span>Normal User</span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-300">
                P2P trading marketplace & energy orders
              </p>
            </button>
          </div>
        </div>

        {/* Mode Explainer Notice */}
        <div className="mt-6 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Role Separation:</span>
          </div>
          <p>
            • Type <strong className="text-cyan-300">admin</strong> → Opens Admin Control Center with multi-agent orchestration, energy controls & simulation.
          </p>
          <p>
            • Type any other name → Opens clean P2P Energy Trading portal without engineering complexity.
          </p>
        </div>
      </div>
    </div>
  );
};
