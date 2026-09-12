"use client";

import React, { useState, useEffect } from "react";
import { X, Key, CheckCircle2, AlertCircle, RefreshCw, Cpu, ShieldCheck, Sparkles, ExternalLink } from "lucide-react";
import { LLMStatus } from "../types";

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: LLMStatus) => void;
}

export const AIConfigModal: React.FC<AIConfigModalProps> = ({ isOpen, onClose, onStatusChange }) => {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<LLMStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch status on open
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/llm/status");
      if (res.ok) {
        const data: LLMStatus = await res.json();
        setStatus(data);
        if (data.model) setModel(data.model);
        if (onStatusChange) onStatusChange(data);
      }
    } catch (e) {
      console.error("Failed to fetch LLM status", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() && !status?.configured) return;

    setIsLoading(true);
    setSaveSuccess(false);
    setTestResult(null);
    try {
      const res = await fetch("/api/llm/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey.trim() || undefined,
          model,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data.llm_status);
        if (onStatusChange) onStatusChange(data.llm_status);
        setSaveSuccess(true);
        setApiKey("");
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Failed to configure LLM", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/llm/test", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        fetchStatus();
      }
    } catch (e) {
      setTestResult({ success: false, message: `Test failed: ${e}` });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">
                OpenAI LLM Integration Setup
              </h2>
              <p className="text-xs text-slate-400">Power GridMind AI Copilot, Reasoning & Executive Audits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            status?.configured
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {status?.configured ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            )}
            <div>
              <div className="font-semibold">
                {status?.configured ? "OpenAI Connected & Active" : "No Active API Key Set"}
              </div>
              <div className="text-[11px] opacity-80">
                {status?.configured
                  ? `Active Model: ${status.model} (Key: ${status.masked_key})`
                  : "Running in domain fallback mode. Enter your key below to unlock GPT-4o."}
              </div>
            </div>
          </div>

          {status?.configured && (
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? "animate-spin" : ""}`} />
              <span>{isTesting ? "Testing..." : "Test"}</span>
            </button>
          )}
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed ${
              testResult.success
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                : "bg-rose-950/60 border-rose-500/40 text-rose-200"
            }`}
          >
            <strong>{testResult.success ? "✓ Test Passed: " : "✕ Test Failed: "}</strong>
            {testResult.message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>OpenAI API Key</span>
              </span>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 underline"
              >
                <span>Get API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={status?.configured ? "Enter new key to replace existing..." : "sk-proj-..."}
                className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono pr-16"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Your key is saved locally in <code className="text-cyan-300">backend/.env</code> and never exposed publicly.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Model Selection</span>
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="gpt-4o-mini">gpt-4o-mini (Recommended: Fast, low latency, cost-effective)</option>
              <option value="gpt-4o">gpt-4o (Maximum reasoning & deep multi-agent synthesis)</option>
            </select>
          </div>

          {/* Features Supported */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
            <div className="font-semibold text-cyan-300 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Features Unlocked with LLM:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
              <li>Interactive AI Energy Copilot Chatbot with live grid telemetry</li>
              <li>Explainable AI (XAI) for any autonomous agent decision</li>
              <li>Executive Scenario Comparison & Strategic Audit Reports</li>
              <li>Refined, dynamic natural language agent negotiation messages</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (!apiKey.trim() && model === status?.model)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save & Connect</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
