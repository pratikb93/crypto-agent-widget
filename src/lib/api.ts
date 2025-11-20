export type Timeframe = '1d' | '4h';

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BASE_URL = 'https://api.binance.com/api/v3/klines';

const intervalMap: Record<Timeframe, string> = {
  '1d': '1d',
  '4h': '4h',
};

export async function fetchCandles(
  symbol: 'BTCUSDT' | 'ETHUSDT',
  timeframe: Timeframe,
  limit = 200
): Promise<Candle[]> {
  const url = `${BASE_URL}?symbol=${symbol}&interval=${intervalMap[timeframe]}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch candles: ${res.status}`);
  }
  const data: any[] = await res.json();
  return data.map((c) => ({
    openTime: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}
