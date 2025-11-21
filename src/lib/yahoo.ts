export interface TickerSearchItem {
  ticker: string;
  name?: string;
  exchange?: string;
  type?: string;
  currency?: string;
}

export interface MarketCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketProfile {
  ticker: string;
  name?: string;
  exchange?: string;
  currency?: string;
  regularMarketPrice?: number | null;
  website?: string;
  industry?: string;
  sector?: string;
  country?: string;
  longBusinessSummary?: string;
}

interface BackendSearchResponse {
  results?: TickerSearchItem[];
  error?: string;
}

interface BackendCandleRow {
  t: number;
  o: number | null;
  h: number | null;
  l: number | null;
  c: number | null;
  v: number | null;
}

interface BackendCandleResponse {
  results?: BackendCandleRow[];
  meta?: { ticker: string; interval: string; range: string };
  error?: string;
}

interface BackendProfileResponse extends MarketProfile {
  error?: string;
}

interface CandleOptions {
  interval?: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '1wk' | '1mo' | '3mo';
  range?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max';
}

export async function searchTickers(query: string): Promise<TickerSearchItem[]> {
  const url = `/api/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  const json: BackendSearchResponse = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json.results ?? [];
}

export async function fetchStockCandles(symbol: string, options: CandleOptions = {}): Promise<MarketCandle[]> {
  const params = new URLSearchParams({ symbol });
  if (options.interval) {
    params.set('interval', options.interval);
  }
  if (options.range) {
    params.set('range', options.range);
  }
  const res = await fetch(`/api/candles?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Candles request failed: ${res.status}`);
  }
  const json: BackendCandleResponse = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  const results = json.results ?? [];
  return results.map((row) => ({
    time: row.t,
    open: row.o ?? 0,
    high: row.h ?? 0,
    low: row.l ?? 0,
    close: row.c ?? 0,
    volume: row.v ?? 0,
  }));
}

export async function fetchProfile(symbol: string): Promise<MarketProfile | null> {
  const params = new URLSearchParams({ symbol });
  const res = await fetch(`/api/profile?${params.toString()}`);
  if (!res.ok) {
    return null;
  }
  const json: BackendProfileResponse | null = await res.json();
  if (!json || json.error) {
    return null;
  }
  return json;
}
