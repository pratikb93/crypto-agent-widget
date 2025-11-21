export interface FinnhubCandle {
  time: number; // Unix timestamp (seconds)
  open: number;
  shareOutstanding?: number;
  logo?: string;
  weburl?: string;
  finnhubIndustry?: string;
}

export interface FinnhubSearchResultItem {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface FinnhubSearchResponse {
  count: number;
  result: FinnhubSearchResultItem[];
}

export async function searchSymbols(query: string): Promise<FinnhubSearchResultItem[]> {
  const url = `/api/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  const json: FinnhubSearchResponse | { error?: string } = await res.json();
  if ('error' in json && json.error) {
    throw new Error(json.error);
  }
  return (json as FinnhubSearchResponse).result ?? [];
}

export async function fetchStockCandles(symbol: string): Promise<FinnhubCandle[]> {
  const params = new URLSearchParams({ symbol, resolution: 'D', count: '300' });
  const res = await fetch(`/api/candles?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Candles request failed: ${res.status}`);
  }
  const json: any = await res.json();
  if (json.s !== 'ok') {
    throw new Error(json.error || 'No candles returned for symbol');
  }
  const t: number[] = json.t ?? [];
  const o: number[] = json.o ?? [];
  const h: number[] = json.h ?? [];
  const l: number[] = json.l ?? [];
  const c: number[] = json.c ?? [];
  const v: number[] = json.v ?? [];

  const len = Math.min(t.length, o.length, h.length, l.length, c.length, v.length);
  const candles: FinnhubCandle[] = [];
  for (let i = 0; i < len; i += 1) {
    candles.push({
      time: t[i],
      open: o[i],
      high: h[i],
      low: l[i],
      close: c[i],
      volume: v[i],
    });
  }
  return candles;
}

export async function fetchProfile(symbol: string): Promise<FinnhubProfile | null> {
  const params = new URLSearchParams({ symbol });
  const res = await fetch(`/api/profile?${params.toString()}`);
  if (!res.ok) {
    return null;
  }
  const json: FinnhubProfile | { error?: string } = await res.json();
  if ('error' in json && json.error) {
    return null;
  }
  return json as FinnhubProfile;
}
