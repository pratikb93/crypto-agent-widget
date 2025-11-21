import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const RPM_LIMIT = Number(process.env.YAHOO_RPM_LIMIT || 60);
const WINDOW_MS = 60_000;

const YAHOO_BASE = 'https://query1.finance.yahoo.com';

let windowStart = Date.now();
let usedInWindow = 0;

function resetWindow() {
  windowStart = Date.now();
  usedInWindow = 0;
}

function assertRateLimit() {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) {
    resetWindow();
  }
  if (usedInWindow >= RPM_LIMIT) {
    const retryInMs = WINDOW_MS - (now - windowStart);
    const retryAfter = Math.max(Math.ceil(retryInMs / 1000), 1);
    const error = new Error('Yahoo RPM limit reached');
    (error as any).statusCode = 429;
    (error as any).retryAfter = retryAfter;
    throw error;
  }
  usedInWindow += 1;
}

function getUsageSnapshot() {
  return {
    limit: RPM_LIMIT,
    used: usedInWindow,
    windowEndsAt: windowStart + WINDOW_MS,
  };
}

async function callYahoo(path: string, params?: Record<string, string | number | undefined>) {
  assertRateLimit();
  const url = new URL(YAHOO_BASE + path);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = new Error(`Yahoo error ${response.status}`);
    (error as any).statusCode = response.status;
    throw error;
  }
  return response.json();
}

app.get('/api/usage', (_req, res) => {
  return res.json(getUsageSnapshot());
});

app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Missing query' });
    }
    const data: any = await callYahoo('/v1/finance/search', { q, quotesCount: 15, newsCount: 0 });
    const normalized = (data?.quotes ?? []).map((item: any) => ({
      ticker: item.symbol,
      name: item.shortname || item.longname || item.symbol,
      exchange: item.exchDisp,
      type: item.quoteType,
      currency: item.currency,
    }));
    return res.json({ results: normalized });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return res.status(status).json({ error: err?.message || 'Search failed', retryAfter: err?.retryAfter, usage: getUsageSnapshot() });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ error: 'Missing query' });
    }
    // Fetch news using the search endpoint
    const data: any = await callYahoo('/v1/finance/search', { q, quotesCount: 0, newsCount: 10 });

    const news = (data?.news ?? []).map((item: any) => ({
      uuid: item.uuid,
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      providerPublishTime: item.providerPublishTime,
      type: item.type,
      thumbnail: item.thumbnail?.resolutions?.[0]?.url
    }));

    return res.json({ news });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return res.status(status).json({ error: err?.message || 'News fetch failed', retryAfter: err?.retryAfter, usage: getUsageSnapshot() });
  }
});

app.get('/api/candles', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    const interval = String(req.query.interval || '30m');
    const range = String(req.query.range || '5d');
    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol' });
    }

    const data: any = await callYahoo(`/v8/finance/chart/${symbol}`, {
      interval,
      range,
    });

    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error('No chart data');
    }

    const timestamps: number[] = result.timestamp ?? [];
    const indicators = result.indicators?.quote?.[0];
    if (!indicators || timestamps.length === 0) {
      throw new Error('Incomplete chart data');
    }

    const candles = timestamps.map((ts, idx) => ({
      t: ts * 1000,
      o: indicators.open?.[idx] ?? null,
      h: indicators.high?.[idx] ?? null,
      l: indicators.low?.[idx] ?? null,
      c: indicators.close?.[idx] ?? null,
      v: indicators.volume?.[idx] ?? null,
    })).filter((candle) => candle.o != null && candle.c != null && candle.h != null && candle.l != null);

    return res.json({ results: candles, meta: { ticker: symbol, interval, range } });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return res.status(status).json({ error: err?.message || 'Candles fetch failed', retryAfter: err?.retryAfter, usage: getUsageSnapshot() });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').trim().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'Missing symbol' });
    }
    const data: any = await callYahoo(`/v10/finance/quoteSummary/${symbol}`, { modules: 'price,summaryProfile' });
    const summary = data?.quoteSummary?.result?.[0];
    if (!summary) {
      return res.json(null);
    }
    const price = summary.price ?? {};
    const profile = summary.summaryProfile ?? {};
    return res.json({
      ticker: price.symbol ?? symbol,
      name: price.shortName || price.longName || symbol,
      exchange: price.exchangeName,
      currency: price.currency,
      regularMarketPrice: price.regularMarketPrice?.raw ?? price.regularMarketPrice ?? null,
      website: profile.website,
      industry: profile.industry,
      sector: profile.sector,
      country: profile.country,
      longBusinessSummary: profile.longBusinessSummary,
    });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return res.status(status).json({ error: err?.message || 'Profile fetch failed', retryAfter: err?.retryAfter, usage: getUsageSnapshot() });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Yahoo proxy server listening on http://localhost:${port}`);
});
