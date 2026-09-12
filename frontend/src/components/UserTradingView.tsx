"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  TrendingUp,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sun,
  Battery,
  Layers,
  IndianRupee,
  Activity,
  PlusCircle,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { GridState, SimulationMetrics, P2PTrade, MarketOrder } from "../types";

interface UserTradingViewProps {
  gridState: GridState | null;
  metrics: SimulationMetrics | null;
  trades: P2PTrade[];
  onTradeExecuted?: () => void;
  initialUserName?: string;
  onLogout?: () => void;
}

export const UserTradingView: React.FC<UserTradingViewProps> = ({
  gridState,
  metrics,
  trades,
  onTradeExecuted,
  initialUserName = "Rahul",
  onLogout,
}) => {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  // User Identity State (User can simply enter or change their name)
  const [userName, setUserName] = useState<string>(initialUserName);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(initialUserName);

  // Buy Order Form
  const [buyEnergy, setBuyEnergy] = useState<number>(5.0);
  const [buyMaxPrice, setBuyMaxPrice] = useState<number>(9.5);
  const [buyDuration, setBuyDuration] = useState<number>(60);
  const [buyPriority, setBuyPriority] = useState<string>("HIGH");

  // Sell Offer Form
  const [sellEnergy, setSellEnergy] = useState<number>(4.0);
  const [sellMinPrice, setSellMinPrice] = useState<number>(7.5);
  const [sellDuration, setSellDuration] = useState<number>(60);

  // Marketplace & Submission Status
  const [marketOrders, setMarketOrders] = useState<MarketOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState<string | null>(null);

  // Fetch active market orders
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch(`${BACKEND_URL}/api/market/orders`);
      if (res.ok) {
        const data = await res.json();
        setMarketOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch market orders", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Place Buy Order
  const handlePlaceBuyOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert("Please specify a user name first.");
      return;
    }
    setIsSubmitting(true);
    setTradeSuccessMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/market/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: userName.trim(),
          order_type: "BUY",
          energy_kwh: buyEnergy,
          price_kwh: buyMaxPrice,
          duration_minutes: buyDuration,
          priority: buyPriority,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.all_orders) setMarketOrders(data.all_orders);
        setTradeSuccessMsg(
          `✅ Buy order matched and executed: ${buyEnergy} kWh @ ₹${buyMaxPrice}/kWh`
        );
        if (onTradeExecuted) onTradeExecuted();
      }
    } catch (err) {
      console.error("Failed to place buy order", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Place Sell Offer
  const handlePlaceSellOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert("Please specify a user name first.");
      return;
    }
    setIsSubmitting(true);
    setTradeSuccessMsg(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/market/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: userName.trim(),
          order_type: "SELL",
          energy_kwh: sellEnergy,
          price_kwh: sellMinPrice,
          duration_minutes: sellDuration,
          priority: "NORMAL",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.all_orders) setMarketOrders(data.all_orders);
        setTradeSuccessMsg(
          `✅ Sell offer matched and cleared: ${sellEnergy} kWh @ ₹${sellMinPrice}/kWh`
        );
        if (onTradeExecuted) onTradeExecuted();
      }
    } catch (err) {
      console.error("Failed to place sell offer", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Trade from Marketplace Order book
  const handleDirectTrade = async (order: MarketOrder) => {
    setIsSubmitting(true);
    setTradeSuccessMsg(null);
    const oppositeType = order.type === "BUY" ? "SELL" : "BUY";
    try {
      const res = await fetch(`${BACKEND_URL}/api/market/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: userName.trim(),
          order_type: oppositeType,
          energy_kwh: order.energy_kwh,
          price_kwh: order.price_kwh,
          duration_minutes: 60,
          priority: "HIGH",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.all_orders) setMarketOrders(data.all_orders);
        setTradeSuccessMsg(
          `🎉 Trade executed directly with ${order.user_name} for ${order.energy_kwh} kWh @ ₹${order.price_kwh}/kWh!`
        );
        if (onTradeExecuted) onTradeExecuted();
      }
    } catch (err) {
      console.error("Direct trade execution failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter My Trades (where buyer_id or seller_id matches user, or if none, recent trades)
  const myTrades = trades.filter(
    (t) =>
      t.buyer_id.toLowerCase().includes(userName.toLowerCase()) ||
      t.seller_id.toLowerCase().includes(userName.toLowerCase())
  );
  const displayTrades = myTrades.length > 0 ? myTrades : trades.slice(-8);

  // Trading Analytics Calculations
  const userTotalBought = myTrades
    .filter((t) => t.buyer_id.toLowerCase().includes(userName.toLowerCase()))
    .reduce((acc, t) => acc + t.energy_kwh, 0);

  const userTotalSold = myTrades
    .filter((t) => t.seller_id.toLowerCase().includes(userName.toLowerCase()))
    .reduce((acc, t) => acc + t.energy_kwh, 0);

  const totalMoneySpent = myTrades
    .filter((t) => t.buyer_id.toLowerCase().includes(userName.toLowerCase()))
    .reduce((acc, t) => acc + t.total_value, 0);

  const totalMoneyEarned = myTrades
    .filter((t) => t.seller_id.toLowerCase().includes(userName.toLowerCase()))
    .reduce((acc, t) => acc + t.total_value, 0);

  const avgP2PPrice =
    trades.length > 0
      ? (trades.reduce((acc, t) => acc + t.price_kwh, 0) / trades.length).toFixed(2)
      : (gridState?.p2p_clearing_price_kwh || 8.5).toFixed(2);

  const totalEnergyTraded = metrics?.p2p_energy_traded_kwh || 0;
  const gridAvoidedKwh = totalEnergyTraded * 0.95;
  const p2pPercentage =
    metrics && metrics.total_grid_import_kwh + totalEnergyTraded > 0
      ? ((totalEnergyTraded / (metrics.total_grid_import_kwh + totalEnergyTraded)) * 100).toFixed(1)
      : "18.4";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Banner: User Identity & Market State */}
      <div className="glass-panel p-4 md:p-5 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-slate-900/95 via-purple-950/20 to-slate-950/95 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <ShoppingBag className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-wide">
                  P2P Decentralized Energy Exchange
                </h2>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Market Active (Mid-market Clearing)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Participate directly in peer-to-peer solar and battery energy trading without utility intermediaries.
              </p>
            </div>
          </div>

          {/* User Name Tag & Editor */}
          <div className="flex items-center space-x-2 bg-slate-950/80 border border-purple-500/30 px-3.5 py-2 rounded-xl">
            <User className="w-4 h-4 text-purple-400" />
            {isEditingName ? (
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-slate-900 border border-purple-400 text-xs text-white rounded px-2 py-0.5 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (tempName.trim()) setUserName(tempName.trim());
                    setIsEditingName(false);
                  }}
                  className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded hover:bg-purple-500"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Trading as:</span>
                <span className="text-xs font-bold text-cyan-300">{userName}</span>
                <button
                  onClick={() => {
                    setTempName(userName);
                    setIsEditingName(true);
                  }}
                  className="text-[10px] text-slate-500 hover:text-purple-300 underline ml-1"
                >
                  Change
                </button>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold transition-all ml-1.5"
                title="Return to Login / Switch User"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>

        {tradeSuccessMsg && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <span>{tradeSuccessMsg}</span>
            <button
              onClick={() => setTradeSuccessMsg(null)}
              className="text-slate-400 hover:text-white text-xs ml-3"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1: Energy Status Overview */}
      <div>
        <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real-Time Energy Status & Tariff</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Current Consumption */}
          <div className="glass-panel p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Consumption</span>
            <div className="text-sm font-extrabold text-white mt-1">
              {(gridState?.total_demand_kw || 72.4).toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">kW</span>
            </div>
            <span className="text-[9px] text-slate-500">Live Microgrid Demand</span>
          </div>

          {/* Solar Generation */}
          <div className="glass-panel p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-amber-400 uppercase font-semibold block">Solar Gen</span>
            <div className="text-sm font-extrabold text-amber-300 mt-1">
              {(gridState?.solar_total_kw || 45.0).toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">kW</span>
            </div>
            <span className="text-[9px] text-slate-500">Rooftop + Farm</span>
          </div>

          {/* Battery SOC */}
          <div className="glass-panel p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Battery SOC</span>
            <div className="text-sm font-extrabold text-emerald-300 mt-1">
              {(gridState?.battery?.soc_pct || 64.0).toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">%</span>
            </div>
            <span className="text-[9px] text-slate-500">Usable Storage</span>
          </div>

          {/* Grid Import/Export */}
          <div className="glass-panel p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Grid Flow</span>
            <div className="text-sm font-extrabold text-cyan-300 mt-1">
              {gridState && gridState.grid_import_kw > 0
                ? `Import ${gridState.grid_import_kw.toFixed(1)} kW`
                : gridState && gridState.grid_export_kw > 0
                ? `Export ${gridState.grid_export_kw.toFixed(1)} kW`
                : "Balanced"}
            </div>
            <span className="text-[9px] text-slate-500">Main Substation</span>
          </div>

          {/* Energy Available to Sell */}
          <div className="glass-panel p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
            <span className="text-[10px] text-emerald-300 uppercase font-semibold block">Avail to Sell</span>
            <div className="text-sm font-extrabold text-emerald-400 mt-1">
              {Math.max(0, (gridState?.solar_total_kw || 0) * 0.45).toFixed(1)}{" "}
              <span className="text-[10px] text-slate-400 font-normal">kWh</span>
            </div>
            <span className="text-[9px] text-emerald-500/80">Prosumer Surplus</span>
          </div>

          {/* Energy Required to Buy */}
          <div className="glass-panel p-3 rounded-xl border border-rose-500/20 bg-rose-950/10">
            <span className="text-[10px] text-rose-300 uppercase font-semibold block">Required to Buy</span>
            <div className="text-sm font-extrabold text-rose-400 mt-1">
              {Math.max(0, (gridState?.household_base_total_kw || 0) * 0.25).toFixed(1)}{" "}
              <span className="text-[10px] text-slate-400 font-normal">kWh</span>
            </div>
            <span className="text-[9px] text-rose-500/80">Active Deficit</span>
          </div>

          {/* Current P2P Price */}
          <div className="glass-panel p-3 rounded-xl border border-purple-500/30 bg-purple-950/20">
            <span className="text-[10px] text-purple-300 uppercase font-semibold block">Current P2P Price</span>
            <div className="text-sm font-black text-purple-300 mt-1">
              ₹{(gridState?.p2p_clearing_price_kwh || 8.5).toFixed(2)}{" "}
              <span className="text-[10px] text-slate-400 font-normal">/ kWh</span>
            </div>
            <span className="text-[9px] text-slate-400">Retail: ₹13.50</span>
          </div>
        </div>
      </div>

      {/* SECTION 2 & 3: Buy Energy & Sell Energy Forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buy Energy Card */}
        <div className="glass-panel p-4 md:p-5 rounded-2xl border border-cyan-500/30 bg-slate-900/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Buy Clean Energy</h4>
                <p className="text-[11px] text-slate-400">Procure cheaper peer solar & battery power</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
              Buyer Bid
            </span>
          </div>

          <form onSubmit={handlePlaceBuyOrder} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 flex justify-between">
                <span>Energy Required (kWh)</span>
                <span className="text-cyan-300 font-mono font-bold">{buyEnergy} kWh</span>
              </label>
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.5"
                value={buyEnergy}
                onChange={(e) => setBuyEnergy(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 flex justify-between">
                <span>Maximum Willingness to Pay (₹/kWh)</span>
                <span className="text-cyan-300 font-mono font-bold">₹{buyMaxPrice}/kWh</span>
              </label>
              <input
                type="number"
                min="5.0"
                max="13.5"
                step="0.1"
                value={buyMaxPrice}
                onChange={(e) => setBuyMaxPrice(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                required
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Min Ask: ₹6.00</span>
                <span>Grid Utility Retail: ₹13.50</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block">Time Duration</label>
                <select
                  value={buyDuration}
                  onChange={(e) => setBuyDuration(parseInt(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={120}>2 Hours</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block">Order Priority</label>
                <select
                  value={buyPriority}
                  onChange={(e) => setBuyPriority(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="NORMAL">Standard</option>
                  <option value="HIGH">High (Immediate)</option>
                  <option value="EMERGENCY">Critical Backup</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Max Order Value:</span>
              <span className="font-extrabold text-cyan-300 font-mono">
                ₹{(buyEnergy * buyMaxPrice).toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Matching with Peers..." : "Place Buy Order"}</span>
            </button>
          </form>
        </div>

        {/* Sell Energy Card */}
        <div className="glass-panel p-4 md:p-5 rounded-2xl border border-emerald-500/30 bg-slate-900/60 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Sell Surplus Energy</h4>
                <p className="text-[11px] text-slate-400">Monetize solar surplus above grid feed-in rates</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
              Seller Ask
            </span>
          </div>

          <form onSubmit={handlePlaceSellOffer} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-slate-300 flex justify-between">
                <span>Energy Available (kWh)</span>
                <span className="text-emerald-300 font-mono font-bold">{sellEnergy} kWh</span>
              </label>
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.5"
                value={sellEnergy}
                onChange={(e) => setSellEnergy(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 flex justify-between">
                <span>Minimum Selling Price (₹/kWh)</span>
                <span className="text-emerald-300 font-mono font-bold">₹{sellMinPrice}/kWh</span>
              </label>
              <input
                type="number"
                min="4.0"
                max="12.0"
                step="0.1"
                value={sellMinPrice}
                onChange={(e) => setSellMinPrice(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Utility Feed-in: ₹4.00</span>
                <span>P2P Clearing: ₹{gridState?.p2p_clearing_price_kwh?.toFixed(2) || "8.50"}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block">Available Time Period</label>
              <select
                value={sellDuration}
                onChange={(e) => setSellDuration(parseInt(e.target.value))}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value={30}>Next 30 Minutes</option>
                <option value={60}>Next 1 Hour</option>
                <option value={120}>Next 2 Hours</option>
                <option value={240}>Next 4 Hours</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Min Payout:</span>
              <span className="font-extrabold text-emerald-300 font-mono">
                ₹{(sellEnergy * sellMinPrice).toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? "Publishing to Exchange..." : "Place Sell Offer"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 4: P2P Marketplace Order Book */}
      <div className="glass-panel p-4 md:p-5 rounded-2xl border border-slate-800/80 shadow-lg">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              P2P Marketplace Active Order Book
            </h4>
          </div>

          <button
            onClick={fetchOrders}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
            <span>Refresh Orders</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Party / User</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Energy</th>
                <th className="py-2.5 px-3">Price</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {marketOrders.map((ord) => {
                const isBuy = ord.type === "BUY";
                return (
                  <tr key={ord.order_id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-bold">{ord.order_id}</td>
                    <td className="py-2.5 px-3 text-white font-sans font-medium">{ord.user_name}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBuy
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {ord.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-bold">{ord.energy_kwh} kWh</td>
                    <td className="py-2.5 px-3 text-slate-200">₹{ord.price_kwh.toFixed(2)}/kWh</td>
                    <td className="py-2.5 px-3 text-slate-400">{ord.time}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold ${
                          ord.status === "ACTIVE"
                            ? "text-amber-400"
                            : ord.status === "EXECUTED"
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {ord.status === "ACTIVE" ? (
                        <button
                          onClick={() => handleDirectTrade(ord)}
                          disabled={isSubmitting}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                            isBuy
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                              : "bg-cyan-600 hover:bg-cyan-500 text-white"
                          }`}
                        >
                          {isBuy ? "Sell to Order" : "Buy from Order"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-sans">Matched</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5 & 6: My Trades & Trading Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* My Trades Table (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-4 md:p-5 rounded-2xl border border-slate-800 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                My P2P Trades Ledger
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {displayTrades.length} Confirmed Trades
            </span>
          </div>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-[10px] text-slate-400 uppercase font-bold sticky top-0">
                <tr>
                  <th className="py-2 px-2.5">Trade ID</th>
                  <th className="py-2 px-2.5">Counterparty</th>
                  <th className="py-2 px-2.5">Energy</th>
                  <th className="py-2 px-2.5">Price</th>
                  <th className="py-2 px-2.5">Total Amount</th>
                  <th className="py-2 px-2.5">Time</th>
                  <th className="py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {displayTrades.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No executed trades recorded yet.
                    </td>
                  </tr>
                ) : (
                  displayTrades.map((tr) => (
                    <tr key={tr.trade_id} className="hover:bg-slate-900/40">
                      <td className="py-2 px-2.5 text-slate-400">{tr.trade_id}</td>
                      <td className="py-2 px-2.5 text-white font-sans text-xs">
                        {tr.seller_id} → {tr.buyer_id}
                      </td>
                      <td className="py-2 px-2.5 text-cyan-300 font-bold">{tr.energy_kwh} kWh</td>
                      <td className="py-2 px-2.5 text-slate-300">₹{tr.price_kwh.toFixed(2)}</td>
                      <td className="py-2 px-2.5 text-emerald-300 font-bold">
                        ₹{tr.total_value.toFixed(2)}
                      </td>
                      <td className="py-2 px-2.5 text-slate-400">{tr.time_str}</td>
                      <td className="py-2 px-2.5 text-emerald-400 text-[10px] font-bold">
                        {tr.status}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trading Analytics Cards (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-4 md:p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Trading Analytics & Impact
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Total Energy Traded
              </span>
              <div className="text-base font-extrabold text-cyan-300 mt-0.5">
                {totalEnergyTraded.toFixed(1)} <span className="text-xs text-slate-400">kWh</span>
              </div>
              <span className="text-[9px] text-slate-500">Decentralized Volume</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Average P2P Price
              </span>
              <div className="text-base font-extrabold text-purple-300 mt-0.5">
                ₹{avgP2PPrice} <span className="text-xs text-slate-400">/ kWh</span>
              </div>
              <span className="text-[9px] text-slate-500">Savings vs ₹13.5 Utility</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Grid Energy Avoided
              </span>
              <div className="text-base font-extrabold text-emerald-300 mt-0.5">
                {gridAvoidedKwh.toFixed(1)} <span className="text-xs text-slate-400">kWh</span>
              </div>
              <span className="text-[9px] text-slate-500">Peak Import Prevented</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                P2P Energy Share
              </span>
              <div className="text-base font-extrabold text-amber-300 mt-0.5">
                {p2pPercentage}%
              </div>
              <span className="text-[9px] text-slate-500">Local Microgrid Autonomy</span>
            </div>
          </div>

          {/* User Specific Performance */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-purple-500/20 space-y-2 text-xs">
            <div className="text-[11px] font-bold text-slate-300 uppercase">
              Financial Summary for {userName}
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Energy Purchased:</span>
              <span className="text-cyan-300 font-mono font-bold">{userTotalBought.toFixed(1)} kWh (₹{totalMoneySpent.toFixed(2)})</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Energy Sold:</span>
              <span className="text-emerald-300 font-mono font-bold">{userTotalSold.toFixed(1)} kWh (₹{totalMoneyEarned.toFixed(2)})</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5 text-white font-bold">
              <span>Net Financial Balance:</span>
              <span className={totalMoneyEarned >= totalMoneySpent ? "text-emerald-400 font-mono" : "text-amber-400 font-mono"}>
                {totalMoneyEarned >= totalMoneySpent ? `+₹${(totalMoneyEarned - totalMoneySpent).toFixed(2)} Net Gain` : `-₹${(totalMoneySpent - totalMoneyEarned).toFixed(2)} Net Spend`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
