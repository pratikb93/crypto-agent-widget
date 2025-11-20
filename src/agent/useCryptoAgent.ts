import { useEffect, useState } from 'react';
import { fetchCandles, type Candle, type Timeframe } from '../lib/api';
import { computeRsi, computeMacd, computeMa, extractCloses } from '../lib/indicators';

export type SymbolCode = 'BTCUSDT' | 'ETHUSDT';

export interface IndicatorSnapshot {
  lastPrice: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  maFast: number | null;
  maSlow: number | null;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

export interface AgentState {
  symbol: SymbolCode;
  timeframe: Timeframe;
  candles: Candle[];
  indicators: IndicatorSnapshot | null;
  loading: boolean;
  error: string | null;
}

const REFRESH_MS = 15000;

function deriveSignal(snapshot: IndicatorSnapshot): 'BUY' | 'SELL' | 'NEUTRAL' {
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

export function useCryptoAgent(initialSymbol: SymbolCode, initialTimeframe: Timeframe): {
  state: AgentState;
  setSymbol: (s: SymbolCode) => void;
  setTimeframe: (t: Timeframe) => void;
} {
  const [symbol, setSymbol] = useState<SymbolCode>(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [state, setState] = useState<AgentState>({
    symbol: initialSymbol,
    timeframe: initialTimeframe,
    candles: [],
    indicators: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function reasonAndAct() {
      setState((prev) => ({ ...prev, loading: true, error: null, symbol, timeframe }));
      try {
        const candles = await fetchCandles(symbol, timeframe, 300);
        if (cancelled) return;

        const closes = extractCloses(candles);
        const rsiRes = computeRsi(closes, 14);
        const macdRes = computeMacd(closes, 12, 26, 9);
        const maFast = computeMa(closes, 20);
        const maSlow = computeMa(closes, 50);

        const lastPrice = closes[closes.length - 1] ?? null;
        const lastRsi = rsiRes.rsi[rsiRes.rsi.length - 1] ?? null;
        const lastMacd = macdRes.macd[macdRes.macd.length - 1] ?? null;
        const lastSignal = macdRes.signal[macdRes.signal.length - 1] ?? null;
        const lastHist = macdRes.histogram[macdRes.histogram.length - 1] ?? null;
        const lastMaFast = maFast.ma[maFast.ma.length - 1] ?? null;
        const lastMaSlow = maSlow.ma[maSlow.ma.length - 1] ?? null;

        const snapshot: IndicatorSnapshot = {
          lastPrice,
          rsi: lastRsi,
          macd: lastMacd,
          macdSignal: lastSignal,
          macdHistogram: lastHist,
          maFast: lastMaFast,
          maSlow: lastMaSlow,
          signal: 'NEUTRAL',
        };

        const signal = deriveSignal(snapshot);
        snapshot.signal = signal;

        setState({
          symbol,
          timeframe,
          candles,
          indicators: snapshot,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err?.message ?? 'Failed to update agent',
        }));
      }
    }

    reasonAndAct();
    const id = setInterval(reasonAndAct, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, timeframe]);

  return {
    state,
    setSymbol,
    setTimeframe,
  };
}
