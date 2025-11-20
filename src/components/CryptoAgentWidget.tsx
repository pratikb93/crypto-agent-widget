import React, { useMemo } from 'react';
import { useCryptoAgent } from '../agent/useCryptoAgent';
import type { Timeframe } from '../lib/api';
import type { SymbolCode } from '../agent/useCryptoAgent';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const timeframeLabels: Record<Timeframe, string> = {
  '1d': '1D',
  '4h': '4H',
};

const symbolLabels: Record<SymbolCode, string> = {
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
};

export const CryptoAgentWidget: React.FC = () => {
  const { state, setSymbol, setTimeframe } = useCryptoAgent('BTCUSDT', '4h');

  const chartData = useMemo(
    () =>
      state.candles.map((c) => ({
        time: new Date(c.openTime).toLocaleString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: '2-digit',
        }),
        close: c.close,
      })),
    [state.candles]
  );

  const indicator = state.indicators;

  const signalColor =
    indicator?.signal === 'BUY'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
      : indicator?.signal === 'SELL'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/60'
      : 'bg-slate-500/10 text-slate-200 border-slate-600/60';

  return (
    <div className="w-full max-w-3xl rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl shadow-slate-900/60 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400 mb-1">Crypto Agent</div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-50">
              {symbolLabels[state.symbol]} <span className="text-xs text-slate-400">({state.symbol})</span>
            </h1>
            {indicator?.lastPrice != null && (
              <span className="text-sm font-mono text-slate-200">
                ${indicator.lastPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex rounded-full bg-slate-900/80 p-1 border border-slate-700/60">
            {(['BTCUSDT', 'ETHUSDT'] as SymbolCode[]).map((sym) => (
              <button
                key={sym}
                onClick={() => setSymbol(sym)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 ${
                  state.symbol === sym
                    ? 'bg-slate-50 text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-slate-50'
                }`}
              >
                {sym.replace('USDT', '')}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-full bg-slate-900/80 p-1 border border-slate-700/60">
            {(['4h', '1d'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-[0.7rem] font-semibold rounded-full tracking-wide transition-all duration-150 ${
                  state.timeframe === tf
                    ? 'bg-emerald-400 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-slate-50'
                }`}
              >
                {timeframeLabels[tf]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="h-64 sm:h-72 md:h-64 lg:h-72">
          <div className="h-full rounded-xl bg-slate-900/80 border border-slate-800/80 px-2 pt-3 pb-2 flex flex-col">
            <div className="flex items-center justify-between px-2 pb-2 text-xs text-slate-400">
              <span>Price chart</span>
              <span className="font-mono text-[0.7rem] text-slate-500">
                auto-refresh {REFRESH_MS / 1000}s
              </span>
            </div>
            <div className="flex-1">
              {state.error && (
                <div className="h-full flex items-center justify-center text-xs text-rose-300">
                  {state.error}
                </div>
              )}
              {!state.error && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="price" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2933" />
                    <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      tickFormatter={(v) => v.toFixed(0)}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderRadius: 12,
                        border: '1px solid #1f2937',
                        padding: '8px 10px',
                      }}
                      labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                      itemStyle={{ color: '#e5e7eb', fontSize: 11 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#22c55e"
                      strokeWidth={1.8}
                      fill="url(#price)"
                      isAnimationActive
                      animationDuration={400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {!state.error && chartData.length === 0 && (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Loading price data...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3 sm:p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 mb-1">Signal</div>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold ${signalColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
                {indicator?.signal ?? 'NEUTRAL'}
              </div>
            </div>
            <div className="text-right text-[0.7rem] text-slate-400 leading-snug">
              <div>RSI-based overbought/oversold</div>
              <div>MACD momentum & MA trend filter</div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3 sm:p-4">
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 mb-3">
              Momentum / Trend
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>RSI (14)</span>
                  <span className="font-mono text-slate-100">
                    {indicator?.rsi != null ? indicator.rsi.toFixed(1) : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>MACD</span>
                  <span className="font-mono text-slate-100">
                    {indicator?.macd != null ? indicator.macd.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Signal</span>
                  <span className="font-mono text-slate-100">
                    {indicator?.macdSignal != null ? indicator.macdSignal.toFixed(2) : '--'}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Hist</span>
                  <span className="font-mono text-slate-100">
                    {indicator?.macdHistogram != null ? indicator.macdHistogram.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>MA 20</span>
                  <span className="font-mono text-slate-100">
                    {indicator?.maFast != null ? indicator.maFast.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>MA 50</span>
                  <span className="font-mono text-slate-100">
                    {indicator?.maSlow != null ? indicator.maSlow.toFixed(2) : '--'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3 sm:p-4 text-[0.7rem] text-slate-400 leading-relaxed">
            <div className="flex items-center justify-between mb-1">
              <span className="uppercase tracking-[0.2em]">ReAct loop</span>
              <span className="text-[0.65rem] text-slate-500">Reason → Act → Update</span>
            </div>
            <p>
              The agent periodically observes BTC/ETH candles, computes RSI, MACD and moving averages, then
              derives a simple buy/sell/neutral bias and updates this widget in real time without page
              reloads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const REFRESH_MS = 15000;
