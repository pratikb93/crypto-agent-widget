export type Timeframe = '30m' | '1h' | '2h' | '4h' | '1d';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
  currency: string;
}

export interface AssetProfile {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  regularMarketPrice: number | null;
  website?: string;
  industry?: string;
  sector?: string;
  country?: string;
  longBusinessSummary?: string;
}

const BASE_URL = 'http://localhost:4000/api';

export async function fetchCandles(
  symbol: string,
  timeframe: Timeframe,
  _limit = 200 // limit is handled by range in server for now, or we can pass it
): Promise<Candle[]> {
  // Map timeframe to range for Yahoo
  // 30m -> 5d (gives enough candles)
  // 1h -> 1mo
  // 4h -> 6mo
  // 1d -> 1y
  let range = '1mo';
  if (timeframe === '30m') range = '5d';
  if (timeframe === '1h') range = '1mo';
  if (timeframe === '2h') range = '3mo';
  if (timeframe === '4h') range = '6mo';
  if (timeframe === '1d') range = '2y';

  const url = `${BASE_URL}/candles?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}&range=${range}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch candles: ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }

  // Server returns { results: [{ t, o, h, l, c, v }] }
  // We need to map to Candle interface
  return (json.results || []).map((c: any) => ({
    openTime: c.t,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
    volume: c.v,
  }));
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  const json = await res.json();
  return json.results || [];
}

export async function fetchProfile(symbol: string): Promise<AssetProfile | null> {
  const url = `${BASE_URL}/profile?symbol=${encodeURIComponent(symbol)}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  const json = await res.json();
  return json || null;
}
export interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  type: string;
  thumbnail?: string;
}

export async function fetchNews(symbol: string): Promise<NewsItem[]> {
  const res = await fetch(`${BASE_URL}/news?q=${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    throw new Error('Failed to fetch news');
  }
  const data = await res.json();
  return data.news || [];
}
