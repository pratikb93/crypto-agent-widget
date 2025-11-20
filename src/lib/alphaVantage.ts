const AV_BASE_URL = 'https://www.alphavantage.co/query';

export interface AvTimeSeriesPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AvSeriesResponse {
  meta: {
    symbol: string;
    information?: string;
  } | null;
  series: AvTimeSeriesPoint[];
}

function getApiKey(): string {
  const key = import.meta.env.VITE_ALPHA_VANTAGE_KEY as string | undefined;
  if (!key) {
    throw new Error('Alpha Vantage API key missing. Set VITE_ALPHA_VANTAGE_KEY in your .env file.');
  }
  return key;
}

export async function fetchIntradaySeries(symbol: string): Promise<AvSeriesResponse> {
  const apiKey = getApiKey();
  const url = `${AV_BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(
    symbol
  )}&interval=30min&outputsize=compact&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Alpha Vantage request failed: ${res.status}`);
  }
  const json = await res.json();

  const meta = json['Meta Data'] ?? null;
  const rawSeries = json['Time Series (30min)'];
  if (!rawSeries) {
    throw new Error(json['Note'] || json['Error Message'] || 'No time series returned for symbol');
  }

  const entries: AvTimeSeriesPoint[] = Object.entries(rawSeries).map(([time, value]: [string, any]) => ({
    time,
    open: parseFloat(value['1. open']),
    high: parseFloat(value['2. high']),
    low: parseFloat(value['3. low']),
    close: parseFloat(value['4. close']),
    volume: parseFloat(value['5. volume']),
  }));

  entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return {
    meta: meta
      ? {
          symbol: meta['2. Symbol'] ?? symbol,
          information: meta['1. Information'],
        }
      : null,
    series: entries,
  };
}

export async function fetchOverview(symbol: string): Promise<string | null> {
  const apiKey = getApiKey();
  const url = `${AV_BASE_URL}?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  const json = await res.json();
  if (!json || Object.keys(json).length === 0 || json['Note'] || json['Error Message']) {
    return null;
  }

  const name = json['Name'] ?? symbol;
  const description: string | undefined = json['Description'];
  const sector: string | undefined = json['Sector'];
  const industry: string | undefined = json['Industry'];

  const parts: string[] = [];
  parts.push(name);
  if (sector || industry) {
    parts.push([sector, industry].filter(Boolean).join(' | '));
  }
  if (description) {
    parts.push(description.slice(0, 220) + (description.length > 220 ? '…' : ''));
  }

  return parts.join(' — ');
}
