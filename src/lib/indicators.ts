import type { Candle } from './api';

export interface RsiResult {
  rsi: number[];
}

export interface MacdResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export interface MaResult {
  ma: number[];
}

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];

  let emaPrev = values[0];
  result.push(emaPrev);

  for (let i = 1; i < values.length; i++) {
    const value = values[i] * k + emaPrev * (1 - k);
    result.push(value);
    emaPrev = value;
  }

  return result;
}

export function computeRsi(closes: number[], period = 14): RsiResult {
  if (closes.length <= period) {
    return { rsi: [] };
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(Math.max(diff, 0));
    losses.push(Math.max(-diff, 0));
  }

  const avgGains: number[] = [];
  const avgLosses: number[] = [];

  let sumGain = 0;
  let sumLoss = 0;

  for (let i = 0; i < period; i++) {
    sumGain += gains[i];
    sumLoss += losses[i];
  }

  avgGains.push(sumGain / period);
  avgLosses.push(sumLoss / period);

  for (let i = period; i < gains.length; i++) {
    const prevAvgGain = avgGains[avgGains.length - 1];
    const prevAvgLoss = avgLosses[avgLosses.length - 1];
    const gain = gains[i];
    const loss = losses[i];

    avgGains.push((prevAvgGain * (period - 1) + gain) / period);
    avgLosses.push((prevAvgLoss * (period - 1) + loss) / period);
  }

  const rsi: number[] = [];
  for (let i = 0; i < avgGains.length; i++) {
    const avgGain = avgGains[i];
    const avgLoss = avgLosses[i];
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return { rsi };
}

export function computeMacd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdResult {
  if (closes.length < slowPeriod + signalPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  const emaFast = ema(closes, fastPeriod);
  const emaSlow = ema(closes, slowPeriod);

  const macd: number[] = [];
  const start = slowPeriod - 1;

  for (let i = start; i < closes.length; i++) {
    macd.push(emaFast[i] - emaSlow[i]);
  }

  const signal = ema(macd, signalPeriod);
  const histogram = macd.map((m, i) => m - (signal[i] ?? 0));

  return { macd, signal, histogram };
}

export function computeMa(closes: number[], period = 20): MaResult {
  if (closes.length < period) {
    return { ma: [] };
  }

  const ma: number[] = [];
  let sum = 0;

  for (let i = 0; i < closes.length; i++) {
    sum += closes[i];
    if (i >= period) {
      sum -= closes[i - period];
    }
    if (i >= period - 1) {
      ma.push(sum / period);
    }
  }

  return { ma };
}

export function extractCloses(candles: Candle[]): number[] {
  return candles.map((c) => c.close);
}
