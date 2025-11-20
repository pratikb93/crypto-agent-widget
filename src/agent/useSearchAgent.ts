import { useEffect, useState } from 'react';
import { fetchIntradaySeries, fetchOverview, type AvTimeSeriesPoint } from '../lib/alphaVantage';
import { computeRsi, computeMacd, computeMa } from '../lib/indicators';

export interface SearchSnapshot {
  symbol: string;
  lastPrice: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  maFast: number | null;
  maSlow: number | null;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  summary: string | null;
}

export interface SearchAgentState {
  loading: boolean;
  error: string | null;
  snapshot: SearchSnapshot | null;
}

const FAST_MA_PERIOD = 20;
const SLOW_MA_PERIOD = 50;

function deriveSignal(snapshot: SearchSnapshot): 'BUY' | 'SELL' | 'NEUTRAL' {
  const { rsi, macd, macdSignal, lastPrice, maFast, maSlow } = snapshot;
  if (
    rsi == null ||
    macd == null ||
    macdSignal == null ||
    lastPrice == null ||
    maFast == null ||
    maSlow == null
  ) {
    return 'NEUTRAL';
  }

  const bullish = rsi < 35 && macd > macdSignal && lastPrice > maFast && maFast > maSlow;
  const bearish = rsi > 65 && macd < macdSignal && lastPrice < maFast && maFast < maSlow;

  if (bullish) return 'BUY';
  if (bearish) return 'SELL';
  return 'NEUTRAL';
}

export function useSearchAgent() {
  const [query, setQuery] = useState('');
  const [submittedSymbol, setSubmittedSymbol] = useState<string | null>(null);
  const [state, setState] = useState<SearchAgentState>({
    loading: false,
    error: null,
    snapshot: null,
  });

  useEffect(() => {
    if (!submittedSymbol) return;

    let cancelled = false;

    async function reasonAndAct(symbol: string) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [seriesRes, overview] = await Promise.all([
          fetchIntradaySeries(symbol),
          fetchOverview(symbol),
        ]);
        if (cancelled) return;

        const closes = seriesRes.series.map((p: AvTimeSeriesPoint) => p.close);
        if (closes.length < SLOW_MA_PERIOD + 10) {
          throw new Error('Not enough data for indicators');
        }

        const rsiRes = computeRsi(closes, 14);
        const macdRes = computeMacd(closes, 12, 26, 9);
        const maFast = computeMa(closes, FAST_MA_PERIOD);
        const maSlow = computeMa(closes, SLOW_MA_PERIOD);

        const lastPrice = closes[closes.length - 1] ?? null;
        const lastRsi = rsiRes.rsi[rsiRes.rsi.length - 1] ?? null;
        const lastMacd = macdRes.macd[macdRes.macd.length - 1] ?? null;
        const lastSignal = macdRes.signal[macdRes.signal.length - 1] ?? null;
        const lastHist = macdRes.histogram[macdRes.histogram.length - 1] ?? null;
        const lastMaFast = maFast.ma[maFast.ma.length - 1] ?? null;
        const lastMaSlow = maSlow.ma[maSlow.ma.length - 1] ?? null;

        const snapshot: SearchSnapshot = {
          symbol: seriesRes.meta?.symbol ?? symbol,
          lastPrice,
          rsi: lastRsi,
          macd: lastMacd,
          macdSignal: lastSignal,
          macdHistogram: lastHist,
          maFast: lastMaFast,
          maSlow: lastMaSlow,
          signal: 'NEUTRAL',
          summary: overview,
        };

        snapshot.signal = deriveSignal(snapshot);

        setState({
          loading: false,
          error: null,
          snapshot,
        });
      } catch (err: any) {
        if (cancelled) return;
        setState({
          loading: false,
          error: err?.message ?? 'Failed to fetch instrument data',
          snapshot: null,
        });
      }
    }

    reasonAndAct(submittedSymbol);

    return () => {
      cancelled = true;
    };
  }, [submittedSymbol]);

  function submit() {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;
    setSubmittedSymbol(trimmed);
  }

  return {
    query,
    setQuery,
    submit,
    state,
  };
}
