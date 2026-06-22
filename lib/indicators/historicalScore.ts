import type { PricePoint } from '@/lib/api/coinmetrics';
import type { ScoreZone } from './skylineScore';

// Computes a price-based proxy for the Skyline Cycle Score across full BTC history.
// Uses the 4 indicators derivable from price-only data.
//
// Indicators:
//   1. Pi Cycle Top ratio:   111DMA / (2 × 350DMA)
//   2. MVRV proxy:           price / 200DMA
//   3. 2Y MA Multiplier:     price / 730DMA
//   4. Log Regression:       price / powerLawFair
//
// All 4 are scored as percentiles within their own full historical distribution
// so the model self-calibrates — diminishing cycle returns are handled
// automatically without ever touching this file again.

export type HistoricalScorePoint = {
  time:     string;
  ts:       number;
  score:    number;    // 0–100 composite
  zone:     ScoreZone;
  btcClose: number;
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

// Where does `current` rank within `series`? Returns 0–100.
function pct(current: number, series: number[]): number {
  if (series.length < 30) return 50;
  const below = series.filter((v) => v <= current).length;
  return Math.round((below / series.length) * 100);
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

  // ── Build full distributions (used for percentile scoring below) ──────────
  // Each series contains every valid value across all of BTC history.
  // Scoring a day against the full distribution is "hindsight" but gives the
  // most accurate cycle-level picture — it shows where each reading sits
  // within the complete historical range Bitcoin has ever produced.

  const piDist:    number[] = [];
  const mvrvDist:  number[] = [];
  const twoYDist:  number[] = [];
  const powerDist: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    const p = closes[i];
    if (ma111[i] != null && ma350[i] != null && ma350[i]! > 0)
      piDist.push(ma111[i]! / (2 * ma350[i]!));
    if (ma200[i] != null && ma200[i]! > 0)
      mvrvDist.push(p / ma200[i]!);
    if (ma730[i] != null && ma730[i]! > 0)
      twoYDist.push(p / ma730[i]!);
    const fair = powerLawFair(prices[i].time);
    if (fair > 0 && p > 0)
      powerDist.push(p / fair);
  }

  // ── Score each day ────────────────────────────────────────────────────────

  const all: HistoricalScorePoint[] = [];

  for (let i = 0; i < prices.length; i++) {
    const { time } = prices[i];
    const price    = closes[i];
    const scores:  number[] = [];

    // 1. Pi Cycle Top — percentile of 111DMA / (2 × 350DMA)
    if (ma111[i] != null && ma350[i] != null && ma350[i]! > 0) {
      scores.push(pct(ma111[i]! / (2 * ma350[i]!), piDist));
    }

    // 2. MVRV proxy — percentile of price / 200DMA
    if (ma200[i] != null && ma200[i]! > 0) {
      scores.push(pct(price / ma200[i]!, mvrvDist));
    }

    // 3. 2Y MA Multiplier — percentile of price / 730DMA
    if (ma730[i] != null && ma730[i]! > 0) {
      scores.push(pct(price / ma730[i]!, twoYDist));
    }

    // 4. Log Regression / Power Law — percentile of price / fair value
    const fair = powerLawFair(time);
    if (fair > 0 && price > 0) {
      scores.push(pct(price / fair, powerDist));
    }

    if (!scores.length) continue;

    const score = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    all.push({
      time,
      ts:       new Date(time + 'T00:00:00').getTime(),
      score,
      zone:     zoneFromScore(score),
      btcClose: price,
    });
  }

  // Weekly downsample — keeps the chart responsive
  return all.filter((_, i) => i % 7 === 0 || i === all.length - 1);
}
