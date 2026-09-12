"use client";

import React from "react";
import { DollarSign, ArrowUpRight, TrendingDown, Layers } from "lucide-react";
import { P2PTrade } from "../types";

interface P2PTradingLedgerProps {
  trades: P2PTrade[];
  totalVolumeKwh: number;
  clearingPrice: number;
  gridRetailTariff: number;
}

export const P2PTradingLedger: React.FC<P2PTradingLedgerProps> = ({
  trades,
  totalVolumeKwh,
  clearingPrice,
  gridRetailTariff,
}) => {
  const savingsPerKwh = Math.max(0, gridRetailTariff - clearingPrice);
  const totalCommunitySavings = totalVolumeKwh * savingsPerKwh;

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-[340px]">
      <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">
            P2P Energy Exchange Ledger
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-slate-400">
            Clearing: <strong className="text-purple-300 font-mono">₹{clearingPrice.toFixed(2)}/kWh</strong>
          </span>
          <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded font-mono font-bold">
            Total Saved: ₹{totalCommunitySavings.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Trades Table */}
      <div className="flex-1 overflow-y-auto pr-1">
        {trades.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Layers className="w-8 h-8 mb-2 opacity-40" />
            <span>No P2P bilateral trades executed in current interval.</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800/80 pb-1">
                <th className="py-1.5 px-2">Trade ID</th>
                <th className="py-1.5 px-2">Time</th>
                <th className="py-1.5 px-2">Seller</th>
                <th className="py-1.5 px-2">Buyer</th>
                <th className="py-1.5 px-2 text-right">Energy</th>
                <th className="py-1.5 px-2 text-right">Rate</th>
                <th className="py-1.5 px-2 text-right">Value</th>
                <th className="py-1.5 px-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {trades.slice(-20).reverse().map((t) => {
                const tradeSavings = t.energy_kwh * (gridRetailTariff - t.price_kwh);
                return (
                  <tr key={t.trade_id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-2 px-2 font-mono text-[11px] text-purple-300 font-semibold">{t.trade_id}</td>
                    <td className="py-2 px-2 font-mono text-slate-400 text-[11px]">{t.time_str}</td>
                    <td className="py-2 px-2 text-amber-300 font-medium text-[11px] truncate max-w-[100px]">{t.seller_id}</td>
                    <td className="py-2 px-2 text-cyan-300 font-medium text-[11px] truncate max-w-[100px]">{t.buyer_id}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-200">{t.energy_kwh.toFixed(1)} kWh</td>
                    <td className="py-2 px-2 text-right font-mono text-purple-300">₹{t.price_kwh.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-300">₹{t.total_value.toFixed(1)}</td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
