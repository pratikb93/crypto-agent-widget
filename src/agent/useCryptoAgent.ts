import { useEffect, useState, useCallback } from 'react';
import { fetchCandles, fetchProfile, fetchNews, searchSymbols, type Candle, type Timeframe, type AssetProfile, type SearchResult, type NewsItem } from '../lib/api';
import { computeRsi, computeMacd, computeMa, extractCloses } from '../lib/indicators';

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
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  indicators: IndicatorSnapshot | null;
  profile: AssetProfile | null;
  news: NewsItem[];
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

export function useCryptoAgent(initialSymbol: string, initialTimeframe: Timeframe) {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [state, setState] = useState<AgentState>({
    symbol: initialSymbol,
    timeframe: initialTimeframe,
    candles: [],
    indicators: null,
    profile: null,
    news: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function reasonAndAct() {
      // Don't set loading to true on every refresh, only if it's a symbol/timeframe change
      // But here we can just keep it simple or optimize later.
      // For now, let's not flicker loading state on auto-refresh if we already have data
      // setState((prev) => ({ ...prev, loading: true, error: null, symbol, timeframe }));

      try {
        const [candles, profile, news] = await Promise.all([
          fetchCandles(symbol, timeframe),
          fetchProfile(symbol),
          fetchNews(symbol)
        ]);

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

        snapshot.signal = deriveSignal(snapshot);

        setState({
          symbol,
          timeframe,
          candles,
          indicators: snapshot,
          profile,
          news,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        if (cancelled) return;
        console.error(err);
        setState((prev) => ({ ...prev, loading: false, error: err.message || 'Failed to fetch data' }));
      }
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    reasonAndAct();

    const interval = setInterval(reasonAndAct, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol, timeframe]);

  const search = useCallback(async (query: string) => {
    const res = await searchSymbols(query);
    return res;
  }, []);

  return {
    state,
    setSymbol,
    setTimeframe,
    search,
  };
}


