import type { PricePoint } from '@/lib/api/coinmetrics';
import type { ScoreZone } from './skylineScore';

// Computes a price-based proxy for the Skyline Cycle Score across full BTC history.
// Uses the 4 indicators derivable from price-only data, with identical normalization
// ranges as the live score in skylineScore.ts.
//
// Indicators included:
//   1. Pi Cycle Top ratio:   111DMA / (2 × 350DMA), range 0.3 → 1.0
//   2. MVRV proxy:           price / 200DMA,         range 0.5 → 4.0
//   3. 2Y MA Multiplier:     price / 730DMA,         range 0.8 → 5.0
//   4. Log Regression:       price / powerLawFair,   range 0.4 → 3.0

export type HistoricalScorePoint = {
  time:  string;
  ts:    number;
  score: number;   // 0–100 composite of available price-based indicators
  zone:  ScoreZone;
};

const GENESIS_MS = new Date('2009-01-03').getTime();

function powerLawFair(dateStr: string): number {
  const days = (new Date(dateStr + 'T00:00:00').getTime() - GENESIS_MS) / 86_400_000;
  return Math.pow(10, 5.8 * Math.log10(Math.max(days, 1)) - 17.3);
}

function smaArr(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function norm(v: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
}

function zoneFromScore(s: number): ScoreZone {
  if (s < 25) return 'accumulate';
  if (s < 50) return 'build';
  if (s < 75) return 'caution';
  return 'distribution';
}

export function computeHistoricalScore(prices: PricePoint[]): HistoricalScorePoint[] {
  const closes = prices.map((d) => d.price);
  const ma111  = smaArr(closes, 111);
  const ma200  = smaArr(closes, 200);
  const ma350  = smaArr(closes, 350);
  const ma730  = smaArr(closes, 730);

  const all: HistoricalScorePoint[] = [];

  for (let i = 0; i < prices.length; i++) {
    const { time } = prices[i];
    const price    = closes[i];
    const scores:  number[] = [];

    // 1. Pi Cycle Top: 111DMA / (2 × 350DMA) → 0.3–1.0
    if (ma111[i] != null && ma350[i] != null && ma350[i]! > 0) {
      scores.push(norm(ma111[i]! / (2 * ma350[i]!), 0.3, 1.0));
    }

    // 2. MVRV proxy: price / 200DMA → 0.5–4.0
    if (ma200[i] != null && ma200[i]! > 0) {
      scores.push(norm(price / ma200[i]!, 0.5, 4.0));
    }

    // 3. 2Y MA Multiplier: price / 730DMA → 0.8–5.0
    if (ma730[i] != null && ma730[i]! > 0) {
      scores.push(norm(price / ma730[i]!, 0.8, 5.0));
    }

    // 4. Log Regression / Power Law → 0.4–3.0
    const fair = powerLawFair(time);
    if (fair > 0 && price > 0) {
      scores.push(norm(price / fair, 0.4, 3.0));
    }

    if (!scores.length) continue;

    const score = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    all.push({
      time,
      ts:   new Date(time + 'T00:00:00').getTime(),
      score,
      zone: zoneFromScore(score),
    });
  }

  // Weekly downsample — 4000+ daily rows → ~600
  return all.filter((_, i) => i % 7 === 0 || i === all.length - 1);
}
