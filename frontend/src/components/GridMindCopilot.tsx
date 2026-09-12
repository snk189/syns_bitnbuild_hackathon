"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Zap,
  Clock,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Info,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ChatMessage, GridState } from "../types";

interface GridMindCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  gridState: GridState | null;
  currentScenario: string;
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
  onOpenConfig?: () => void;
}

export const GridMindCopilot: React.FC<GridMindCopilotProps> = ({
  isOpen,
  onClose,
  gridState,
  currentScenario,
  externalPrompt,
  onClearExternalPrompt,
  onOpenConfig,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "👋 **Welcome to GridMind AI Copilot!**\n\nI am your intelligent energy operations co-pilot, connected in real-time to your **6 autonomous agents**, microgrid physics engine, and P2P trading ledger.\n\nAsk me anything about live transformer loading, battery dispatch logic, EV deferrals, prosumer cost savings, or scenario comparisons!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      suggestions: [
        "Why is transformer load peaking at 18:30?",
        "How does BatteryAgent guard the 25% floor?",
        "Calculate prosumer P2P trading savings",
        "Why did EVAgent defer vehicle charging?",
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Handle external prompt injection (e.g. from "Explain Decision" button)
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      handleSend(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          history: historyPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isLiveLLM: data.is_live_llm,
          model: data.model,
          suggestions: data.suggestions || [],
          notice: data.notice,
          contextSummary: data.context_summary,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Unable to reach the AI engine right now. Please ensure the FastAPI backend is running.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (err) {
      console.error("Chat error", err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "⚠️ Network error connecting to GridMind AI service. Please verify backend connectivity.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content:
          "✨ **Chat memory reset.**\n\nI am ready with fresh context from the active simulation step. Ask any question about your microgrid agents or telemetry!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestions: [
          "Why did transformer load peak at 18:30?",
          "Explain how P2P energy trading works",
          "What happened during the crisis shock?",
        ],
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 flex flex-col bg-slate-950/95 border border-cyan-500/30 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        isExpanded
          ? "inset-4 md:inset-8"
          : "bottom-4 right-4 w-[95vw] sm:w-[480px] h-[640px] max-h-[88vh]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 rounded-t-2xl">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">
                GridMind AI Copilot
              </h3>
              <span className="flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Grounded</span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center space-x-1.5">
              <span>Clock: {gridState?.time_str || "00:00"}</span>
              <span>•</span>
              <span>Load: {gridState?.transformer_load_pct.toFixed(1) || 0}%</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleResetChat}
            title="Clear Chat History"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            title="Close Copilot"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Telemetry Mini-Ribbon */}
      <div className="px-4 py-1.5 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 overflow-x-auto gap-2">
        <div className="flex items-center space-x-3 shrink-0">
          <span className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Solar: <strong className="text-slate-200">{gridState?.solar_total_kw.toFixed(1) || 0} kW</strong></span>
          </span>
          <span className="flex items-center space-x-1">
            <Bot className="w-3 h-3 text-cyan-400" />
            <span>Battery: <strong className="text-slate-200">{gridState?.battery.soc_pct.toFixed(0) || 50}%</strong></span>
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>P2P Rate: <strong className="text-slate-200">₹{gridState?.p2p_clearing_price_kwh.toFixed(1) || 8.5}/kWh</strong></span>
          </span>
        </div>

        {onOpenConfig && (
          <button
            onClick={onOpenConfig}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold shrink-0 underline"
          >
            OpenAI Key
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {/* Sender / Role Header */}
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mb-1 px-1">
              {msg.role === "user" ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-cyan-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-purple-400" />
                  <span className="font-semibold text-slate-300">
                    {msg.isLiveLLM ? `OpenAI (${msg.model || "GPT-4o"})` : "GridMind Copilot"}
                  </span>
                  {msg.isLiveLLM && (
                    <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                      GPT-4o
                    </span>
                  )}
                  <span>{msg.timestamp}</span>
                </>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`relative max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed transition-all shadow-md ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-cyan-600 to-indigo-600 text-white rounded-tr-none border border-cyan-400/30"
                  : "bg-slate-900/90 text-slate-200 rounded-tl-none border border-slate-800"
              }`}
            >
              {/* Message Content with Markdown parsing */}
              <div className="prose-chat whitespace-pre-line break-words space-y-2">
                {msg.content}
              </div>

              {/* Notice / Fallback alert if key not set */}
              {msg.notice && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] text-amber-300/90 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>{msg.notice}</span>
                </div>
              )}

              {/* Actions on Assistant Message */}
              {msg.role === "assistant" && (
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-mono text-[9px] text-slate-400">
                    {msg.contextSummary?.clock ? `Context @ ${msg.contextSummary.clock}` : ""}
                  </span>
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex items-center space-x-1 hover:text-cyan-300 transition-colors"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Dynamic Suggestions below assistant turn */}
            {msg.suggestions && msg.suggestions.length > 0 && msg.id === messages[messages.length - 1].id && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                {msg.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(s)}
                    className="text-[11px] font-medium bg-slate-900/80 hover:bg-cyan-950/40 text-cyan-300 hover:text-cyan-200 border border-cyan-500/25 hover:border-cyan-400/50 rounded-full px-3 py-1 transition-all text-left shadow-sm"
                  >
                    ⚡ {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 px-1">
              <Bot className="w-3 h-3 text-purple-400 animate-spin" />
              <span>GridMind AI is analyzing live telemetry & agent logs...</span>
            </div>
            <div className="bg-slate-900/90 border border-cyan-500/20 rounded-2xl rounded-tl-none p-3.5 max-w-[70%] space-y-2">
              <div className="h-2.5 bg-slate-800 rounded w-3/4 animate-pulse" />
              <div className="h-2.5 bg-slate-800 rounded w-full animate-pulse" />
              <div className="h-2.5 bg-slate-800 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 rounded-b-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end space-x-2"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about agent decisions, 18:30 peak shaving, P2P prices..."
            className="flex-1 bg-slate-950/90 border border-slate-700/80 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-sans"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white disabled:opacity-40 disabled:hover:from-cyan-500 disabled:hover:to-indigo-600 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
          <span>Press Enter to send, Shift+Enter for newline</span>
          <span className="flex items-center space-x-1 text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Multi-Agent Memory Connected</span>
          </span>
        </div>
      </div>
    </div>
  );
};
