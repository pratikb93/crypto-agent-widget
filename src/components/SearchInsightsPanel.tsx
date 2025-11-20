import React from 'react';
import { useSearchAgent } from '../agent/useSearchAgent';

export const SearchInsightsPanel: React.FC = () => {
  const { query, setQuery, submit, state } = useSearchAgent();

  const snapshot = state.snapshot;

  const signalColor =
    snapshot?.signal === 'BUY'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
      : snapshot?.signal === 'SELL'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/60'
      : 'bg-slate-500/10 text-slate-200 border-slate-600/60';

  return (
    <div className="w-full max-w-3xl mt-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-lg shadow-slate-950/50 backdrop-blur-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/70">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-slate-400 mb-1">Search insights</div>
          <div className="text-sm text-slate-200">Stocks, crypto, bonds (Alpha Vantage)</div>
        </div>
        <div className="text-[0.65rem] text-slate-500">30m intraday snapshot</div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol (e.g. AAPL, TSLA, BTCUSD, MSFT)"
            className="flex-1 rounded-lg bg-slate-950/80 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-400/60"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            Analyze
          </button>
        </form>

        {state.loading && (
          <div className="text-xs text-slate-400">Analyzing instrument…</div>
        )}
        {state.error && !state.loading && (
          <div className="text-xs text-rose-300">{state.error}</div>
        )}

        {snapshot && !state.loading && !state.error && (
          <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Instrument
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm sm:text-base font-semibold text-slate-50">
                      {snapshot.symbol}
                    </span>
                    {snapshot.lastPrice != null && (
                      <span className="text-xs sm:text-sm font-mono text-slate-200">
                        ${snapshot.lastPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 mb-1">
                    Signal
                  </div>
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-semibold ${signalColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-2" />
                    {snapshot.signal}
                  </div>
                </div>
              </div>

              {snapshot.summary && (
                <div className="rounded-lg bg-slate-900/80 border border-slate-800/80 p-3 text-[0.7rem] text-slate-300 leading-relaxed max-h-32 overflow-y-auto">
                  {snapshot.summary}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800/80 p-3 sm:p-4 text-xs space-y-2">
              <div className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 mb-1">
                Indicators (30m)
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>RSI (14)</span>
                <span className="font-mono text-slate-100">
                  {snapshot.rsi != null ? snapshot.rsi.toFixed(1) : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>MACD</span>
                <span className="font-mono text-slate-100">
                  {snapshot.macd != null ? snapshot.macd.toFixed(2) : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Signal</span>
                <span className="font-mono text-slate-100">
                  {snapshot.macdSignal != null ? snapshot.macdSignal.toFixed(2) : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Hist</span>
                <span className="font-mono text-slate-100">
                  {snapshot.macdHistogram != null ? snapshot.macdHistogram.toFixed(2) : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>MA 20</span>
                <span className="font-mono text-slate-100">
                  {snapshot.maFast != null ? snapshot.maFast.toFixed(2) : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>MA 50</span>
                <span className="font-mono text-slate-100">
                  {snapshot.maSlow != null ? snapshot.maSlow.toFixed(2) : '--'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
