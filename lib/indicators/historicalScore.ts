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
// All 4 are scored as percentiles within a historical distribution so the model
// self-calibrates — diminishing cycle returns are handled automatically without
// ever touching this file again.
//
// ── Two normalization modes ──────────────────────────────────────────────────
//
// 'full-distribution' (default): each day is ranked against every value in the
//   series, including days that came after it. This is hindsight, and it is the
//   right framing for a retrospective "where does this sit in all of Bitcoin's
//   history" chart — which is what /cycle renders.
//
// 'point-in-time': each day is ranked only against values available up to and
//   including that day. Slower, but it answers "what would the score have read
//   on the day?" — the only defensible basis for a published track record.
//   /track-record uses this.
//
// Measured difference at the five cycle turning points, 2012-01-01 reference
// window: four of five agree, but the 2021 top reads 75 (Distribution Risk)
// under full-distribution and 68 (Caution) point-in-time. The hindsight mode
// turns a miss into a hit — which is the whole reason /track-record does not
// use it. See docs/track-record-scope.md.

export type ScoreMode = 'full-distribution' | 'point-in-time';

export type HistoricalScorePoint = {
  time:     string;
  ts:       number;
  score:    number;    // 0–100 composite
  zone:     ScoreZone;
  btcClose: number;
};

export type HistoricalScoreOptions = {
  mode?: ScoreMode;
  /** Weekly-downsample the output. Default true — keeps charts responsive. */
  downsample?: boolean;
  /** Dates (YYYY-MM-DD) that must survive downsampling, e.g. cycle anchors. */
  keepDates?: readonly string[];
};

const GENESIS_MS   = new Date('2009-01-03').getTime();
const PL_SLOPE     = 5.82;
const PL_INTERCEPT = -16.73;

function powerLawFair(dateStr: string): number {
  const days = (new Date(dateStr + 'T00:00:00').getTime() - GENESIS_MS) / 86_400_000;
  return Math.pow(10, PL_SLOPE * Math.log10(Math.max(days, 1)) + PL_INTERCEPT);
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
// Below 30 samples the distribution is too thin to mean anything, so the
// indicator abstains at neutral rather than inventing a reading.
function pct(current: number, series: number[]): number {
  if (series.length < 30) return 50;
  let below = 0;
  for (const v of series) if (v <= current) below++;
  return Math.round((below / series.length) * 100);
}

function zoneFromScore(s: number): ScoreZone {
  if (s < 25) return 'accumulate';
  if (s < 50) return 'build';
  if (s < 75) return 'caution';
  return 'distribution';
}

const KEYS = ['pi', 'mvrv', 'twoY', 'power'] as const;
type IndicatorKey = typeof KEYS[number];

type RawDay = { time: string; price: number } & Record<IndicatorKey, number | null>;

// Raw indicator values per day, before any normalization. Shared by both modes
// so the two can never drift apart on the underlying maths.
function rawSeries(prices: PricePoint[]): RawDay[] {
  const closes = prices.map((d) => d.price);
  const ma111  = smaArr(closes, 111);
  const ma200  = smaArr(closes, 200);
  const ma350  = smaArr(closes, 350);
  const ma730  = smaArr(closes, 730);

  return prices.map((p, i) => {
    const price = closes[i];
    const fair  = powerLawFair(p.time);
    return {
      time:  p.time,
      price,
      pi:    ma111[i] != null && ma350[i] != null && ma350[i]! > 0 ? ma111[i]! / (2 * ma350[i]!) : null,
      mvrv:  ma200[i] != null && ma200[i]! > 0 ? price / ma200[i]! : null,
      twoY:  ma730[i] != null && ma730[i]! > 0 ? price / ma730[i]! : null,
      power: fair > 0 && price > 0 ? price / fair : null,
    };
  });
}

function compose(scores: number[]): number | null {
  if (!scores.length) return null;
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
}

export function computeHistoricalScore(
  prices: PricePoint[],
  options: HistoricalScoreOptions = {},
): HistoricalScorePoint[] {
  const { mode = 'full-distribution', downsample = true, keepDates } = options;

  const raw = rawSeries(prices);
  const all: HistoricalScorePoint[] = [];

  if (mode === 'point-in-time') {
    // Expanding window — each distribution only ever contains the past.
    const grown: Record<IndicatorKey, number[]> = { pi: [], mvrv: [], twoY: [], power: [] };

    for (const day of raw) {
      const scores: number[] = [];
      for (const k of KEYS) {
        const v = day[k];
        if (v == null) continue;
        grown[k].push(v);
        scores.push(pct(v, grown[k]));
      }
      const score = compose(scores);
      if (score == null) continue;
      all.push({
        time:     day.time,
        ts:       new Date(day.time + 'T00:00:00').getTime(),
        score,
        zone:     zoneFromScore(score),
        btcClose: day.price,
      });
    }
  } else {
    // Full distribution — every value in the series, past and future.
    const dist: Record<IndicatorKey, number[]> = { pi: [], mvrv: [], twoY: [], power: [] };
    for (const day of raw) {
      for (const k of KEYS) {
        const v = day[k];
        if (v != null) dist[k].push(v);
      }
    }

    for (const day of raw) {
      const scores: number[] = [];
      for (const k of KEYS) {
        const v = day[k];
        if (v != null) scores.push(pct(v, dist[k]));
      }
      const score = compose(scores);
      if (score == null) continue;
      all.push({
        time:     day.time,
        ts:       new Date(day.time + 'T00:00:00').getTime(),
        score,
        zone:     zoneFromScore(score),
        btcClose: day.price,
      });
    }
  }

  return downsample ? downsampleWeekly(all, keepDates) : all;
}

// Weekly downsample — keeps the chart responsive. Anchor dates are pinned so a
// cycle top never gets smoothed out of the series it is meant to evidence.
// Exported so callers that already hold a daily series can thin it without
// paying to recompute the whole thing.
export function downsampleWeekly(
  points: HistoricalScorePoint[],
  keepDates?: readonly string[],
): HistoricalScorePoint[] {
  const keep = new Set(keepDates ?? []);
  return points.filter((p, i) => i % 7 === 0 || i === points.length - 1 || keep.has(p.time));
}
