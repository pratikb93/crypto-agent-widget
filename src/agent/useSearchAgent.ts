import { useEffect, useState } from 'react';
import { computeRsi, computeMacd, computeMa } from '../lib/indicators';
import { searchTickers, fetchStockCandles, fetchProfile } from '../lib/yahoo';
import type { TickerSearchItem } from '../lib/yahoo';

interface SeriesPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchSnapshot {
  symbol: string;
  name?: string;
  lastPrice: number | null;
  currency?: string;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  maFast: number | null;
  maSlow: number | null;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  summary: string | null;
  series: SeriesPoint[];
}

export interface SearchAgentState {
  loading: boolean;
  error: string | null;
  snapshot: SearchSnapshot | null;
}

const FAST_MA_PERIOD = 20;
const SLOW_MA_PERIOD = 50;
const MIN_CANDLES = SLOW_MA_PERIOD + 10;

const INDIA_SUFFIXES = ['.NS', '.NSE', '.BO', '.BSE'];
const INDEX_ALIASES: Record<string, string[]> = {
  NIFTY: ['^NSEI'],
  NIFTY50: ['^NSEI'],
  NIFTY100: ['^CNX100'],
  BANKNIFTY: ['^NSEBANK'],
  NIFTYBANK: ['^NSEBANK'],
  SENSEX: ['^BSESN'],
  SENSEX30: ['^BSESN'],
};

function applyQueryTransforms(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (!lower) return raw;
  if (lower === 'nifty' || lower === 'nifty50') return '^NSEI';
  if (lower === 'sensex') return '^BSESN';
  if (lower.includes('banknifty')) return '^NSEBANK';
  return raw;
}

function normalizeQuery(q: string) {
  return q.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function scoreSearchItem(item: TickerSearchItem, normalizedQuery: string) {
  const symbol = (item.ticker ?? '').toUpperCase();
  if (!symbol) return 0;
  const cleanSymbol = symbol.replace(/[^A-Z0-9]/gi, '');
  let score = 0;
  if (cleanSymbol === normalizedQuery) score += 120;
  if (symbol === `${normalizedQuery}.NS`) score += 100;
  INDIA_SUFFIXES.forEach((suffix, idx) => {
    if (symbol.endsWith(suffix)) {
      score += (INDIA_SUFFIXES.length - idx) * 20;
    }
  });
  if (item.exchange) {
    const exch = item.exchange.toUpperCase();
    if (exch.includes('NS')) score += 40;
    if (exch.includes('BSE')) score += 30;
  }
  if ((item.currency ?? '').toUpperCase() === 'INR') score += 25;
  if (symbol.startsWith(normalizedQuery)) score += 10;
  if (item.name && item.name.toUpperCase().includes(normalizedQuery)) score += 4;
  return score;
}

function pickBestTicker(results: TickerSearchItem[], rawQuery: string): TickerSearchItem | null {
  if (!results.length) return null;
  const normalized = normalizeQuery(rawQuery);
  const aliasMatches = INDEX_ALIASES[normalized];
  if (aliasMatches) {
    const matched = results.find((item) =>
      aliasMatches.some((alias) => alias.toUpperCase() === (item.ticker ?? '').toUpperCase())
    );
    if (matched) {
      return matched;
    }
  }
  const scored = results
    .map((item) => ({ item, score: scoreSearchItem(item, normalized) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.item ?? results[0];
}

function deriveSignal(snapshot: SearchSnapshot): 'BUY' | 'SELL' | 'NEUTRAL' {
  const { rsi, macd, macdSignal, maFast, maSlow } = snapshot;
  if (
    rsi == null ||
    macd == null ||
    macdSignal == null ||
    maFast == null ||
    maSlow == null
  ) {
    return 'NEUTRAL';
  }

  const macdDelta = macd - macdSignal;
  const trendSlope = maFast - maSlow;

  if (macdDelta > 0 && trendSlope > 0 && rsi < 70) {
    return 'BUY';
  }
  if (macdDelta < 0 && trendSlope < 0 && rsi > 30) {
    return 'SELL';
  }
  return 'NEUTRAL';
}

export function useSearchAgent() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [state, setState] = useState<SearchAgentState>({
    loading: false,
    error: null,
    snapshot: null,
  });

  useEffect(() => {
    if (!submittedQuery) return;

    let cancelled = false;

    async function reasonAndAct(rawQuery: string) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const transformedQuery = applyQueryTransforms(rawQuery);
        const searchResults = await searchTickers(transformedQuery);
        let best = pickBestTicker(searchResults, transformedQuery);

        if (
          (!best || (best.currency ?? '').toUpperCase() !== 'INR') &&
          !transformedQuery.includes('.') &&
          !transformedQuery.startsWith('^')
        ) {
          const altQuery = `${transformedQuery}.NS`;
          const altResults = await searchTickers(altQuery);
          const altBest = pickBestTicker(altResults, altQuery);
          if (altBest && (altBest.currency ?? '').toUpperCase() === 'INR') {
            best = altBest;
          }
        }

        if (!best || (best.currency ?? '').toUpperCase() !== 'INR') {
          const directInr = searchResults.find((item) => {
            const ticker = (item.ticker ?? '').toUpperCase();
            const currency = (item.currency ?? '').toUpperCase();
            return currency === 'INR' || ticker.endsWith('.NS') || ticker.endsWith('.BSE') || ticker.endsWith('.BO');
          });
          if (directInr) {
            best = directInr;
          }
        }

        const normalizedSymbol = normalizeQuery(transformedQuery);
        const candidateTickers = Array.from(
          new Set(
            [
              best?.ticker,
              `${normalizedSymbol}.NS`,
              `${normalizedSymbol}.BO`,
              transformedQuery.toUpperCase(),
            ]
              .filter(Boolean)
              .map((t) => t!.trim().toUpperCase())
          )
        );

        async function loadCandlesForSymbol(sym: string) {
          const primary = await fetchStockCandles(sym, { interval: '30m', range: '1mo' });
          if (primary.length >= MIN_CANDLES) {
            return primary;
          }
          return fetchStockCandles(sym, { interval: '1h', range: '3mo' });
        }

        let chosenSymbol: string | null = null;
        let candles: SeriesPoint[] = [];
        let profile = null;

        for (const candidate of candidateTickers) {
          try {
            const [candidateCandles, candidateProfile] = await Promise.all([
              loadCandlesForSymbol(candidate),
              fetchProfile(candidate),
            ]);
            if (candidateCandles.length < MIN_CANDLES) {
              continue;
            }
            chosenSymbol = candidate;
            candles = candidateCandles;
            profile = candidateProfile;
            break;
          } catch (err) {
            continue;
          }
        }

        if (cancelled) return;

        if (!chosenSymbol || candles.length === 0) {
          throw new Error('No price data returned for this symbol');
        }

        const closes = candles.map((c) => c.close);
        if (closes.length < MIN_CANDLES) {
          throw new Error('Not enough data for indicators');
        }

        const displayMeta =
          searchResults.find((item) => (item.ticker ?? '').toUpperCase() === chosenSymbol) ?? best ?? null;

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

        const series: SeriesPoint[] = candles.map((c) => ({
          time: c.time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));

        let summary: string | null = null;
        const currency = profile?.currency ?? displayMeta?.currency ?? undefined;
        const regularMarketPrice = profile?.regularMarketPrice ?? lastPrice;
        if (profile) {
          const parts: string[] = [];
          const name = profile.name ?? displayMeta?.name ?? chosenSymbol;
          parts.push(name);
          const localeLine = [profile.country, profile.exchange].filter(Boolean).join(' | ');
          if (localeLine) {
            parts.push(localeLine);
          }
          if (profile.website) {
            parts.push(profile.website);
          }
          summary = parts.join(' — ');
        }

        const snapshot: SearchSnapshot = {
          symbol: chosenSymbol,
          name: displayMeta?.name ?? chosenSymbol,
          lastPrice: regularMarketPrice,
          currency,
          rsi: lastRsi,
          macd: lastMacd,
          macdSignal: lastSignal,
          macdHistogram: lastHist,
          maFast: lastMaFast,
          maSlow: lastMaSlow,
          signal: 'NEUTRAL',
          summary,
          series,
        };

        snapshot.signal = deriveSignal(snapshot);

        setState({
          loading: false,
          error: null,
          snapshot,
        });
      } catch (err: any) {
        if (cancelled) return;
        const rawMessage: string = err?.message ?? 'Failed to fetch instrument data';
        setState({
          loading: false,
          error: rawMessage,
          snapshot: null,
        });
      }
    }

    reasonAndAct(submittedQuery);

    return () => {
      cancelled = true;
    };
  }, [submittedQuery]);

  function submit() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
  }

  return {
    query,
    setQuery,
    submit,
    state,
  };
}
