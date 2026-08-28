import type { PricePoint } from '@/lib/api/coinmetrics';

// Realized volatility — the annualized standard deviation of daily log returns.
//
// This is backward-looking, measured volatility, not an options-implied forecast.
// Bitcoin has no free, full-history implied-vol series, and the Macro Terminal's
// volatility section was previously all TradFi (VIX, MOVE, VXN, OVX, GVZ) — it
// measured the volatility of everything except the asset the terminal is about.
//
// Why it belongs in a capitulation framework: heavy selling burns through the
// supply of willing sellers, and once they are gone, price stops moving. Volatility
// collapsing *after* a large drawdown is the signature of an exhausted market. It
// is the second of VanEck's twelve capitulation indicators, and in their August 2026
// ChainCheck it read 27.2% against a long-run average near 80%.
//
// The direction is the trap. Compressed volatility on its own is not bullish —
// mid-bull consolidation looks identical on this series alone. Only the pairing
// of deep drawdown *and* collapsed volatility carries the capitulation reading,
// which is why `capitulationSignal` below requires both and never fires on
// volatility alone.
//
// Annualization uses sqrt(365) rather than the sqrt(252) convention from equities:
// Bitcoin trades every calendar day, so there are no non-trading days to exclude.

export type RealizedVolPoint = {
  time:  string;
  ts:    number;
  price: number;
  rv30:  number | null;   // annualized %, 30-day window
  rv90:  number | null;   // annualized %, 90-day window
};

export type VolZone = 'compressed' | 'low' | 'normal' | 'elevated' | 'extreme';

export type RealizedVolCurrent = {
  rv30:         number | null;
  rv90:         number | null;
  longRunMean:  number | null;   // mean rv30 across all available history
  percentile:   number | null;   // 0–100, rank of today's rv30 within that history
  zone:         VolZone;
  /** VanEck-style capitulation read. Requires compressed vol AND a real drawdown. */
  capitulationSignal: boolean;
  price:        number | null;
  drawdownPct:  number | null;   // current % below running ATH, negative
  vsLongRunPct: number | null;   // rv30 as % of the long-run mean (100 = average)
};

export type RealizedVolResult = {
  points:  RealizedVolPoint[];
  current: RealizedVolCurrent;
  /** The rv30 value at the 15th percentile — drawn as the compression band. */
  compressedAt: number | null;
};

// VanEck activates a signal in the bottom 15th percentile of its own history.
// Kept identical here so the reading is comparable to their published framework.
const COMPRESSED_PERCENTILE = 15;

// Volatility compression only reads as capitulation once the market has actually
// fallen. Without this gate the signal fires during quiet mid-bull consolidation,
// which is the opposite of the condition it is meant to identify. VanEck handles
// this by requiring multiple indicators; a single-indicator page has to gate itself.
const MIN_DRAWDOWN_FOR_SIGNAL = -35;

export const VOL_ZONE_META: Record<VolZone, { label: string; color: string; desc: string }> = {
  compressed: {
    label: 'Compressed',
    color: '#35D07F',
    desc: 'Volatility has collapsed to the bottom of its historical range. After a deep drawdown this is the signature of seller exhaustion; without one it is ordinary consolidation.',
  },
  low: {
    label: 'Low',
    color: '#4ADE80',
    desc: 'Volatility is below its historical norm. Markets are quiet but not exhausted.',
  },
  normal: {
    label: 'Normal',
    color: '#E6B450',
    desc: 'Volatility sits in the middle of Bitcoin’s historical range. No information either way.',
  },
  elevated: {
    label: 'Elevated',
    color: '#F97316',
    desc: 'Volatility is running hot. Typical of trending markets and of the early stages of a decline.',
  },
  extreme: {
    label: 'Extreme',
    color: '#FF5C5C',
    desc: 'Volatility is in the top decile of its history. Associated with blow-off tops and forced liquidation, not with bottoms.',
  },
};

// ── Math ──────────────────────────────────────────────────────────────────────

/**
 * Rolling annualized stdev of log returns, expressed in percent.
 *
 * `out[i]` is the volatility of the `window` returns ending at day `i`, so the
 * value is causal: it never uses a price from after the day it is stamped on.
 */
function rollingAnnualizedVol(logReturns: (number | null)[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(logReturns.length).fill(null);
  const ann = Math.sqrt(365) * 100;

  for (let i = 0; i < logReturns.length; i++) {
    if (i < window) continue;

    let n = 0, sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const r = logReturns[j];
      if (r == null || !Number.isFinite(r)) continue;
      sum += r; n++;
    }
    // A partially-filled window would understate volatility rather than report
    // nothing, so require the window to be complete.
    if (n < window) continue;

    const mean = sum / n;
    let sq = 0;
    for (let j = i - window + 1; j <= i; j++) {
      const r = logReturns[j];
      if (r == null || !Number.isFinite(r)) continue;
      sq += (r - mean) ** 2;
    }
    // Sample stdev (n-1): these returns are a sample of the process, not the
    // whole population.
    out[i] = Math.sqrt(sq / (n - 1)) * ann;
  }

  return out;
}

/** Percentile rank of `value` within `sorted` (ascending), 0–100. */
function percentileRank(sorted: number[], value: number): number | null {
  if (!sorted.length) return null;
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1; else hi = mid;
  }
  return (lo / sorted.length) * 100;
}

function zoneFor(percentile: number | null): VolZone {
  if (percentile == null) return 'normal';
  if (percentile < COMPRESSED_PERCENTILE) return 'compressed';
  if (percentile < 35) return 'low';
  if (percentile < 65) return 'normal';
  if (percentile < 85) return 'elevated';
  return 'extreme';
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function computeRealizedVolatility(prices: PricePoint[]): RealizedVolResult {
  const closes = prices.map((p) => p.price);

  // Log returns. Guarded against the zero and missing prices that appear in the
  // earliest vendor history, which would otherwise produce -Infinity.
  const logReturns: (number | null)[] = closes.map((c, i) => {
    if (i === 0) return null;
    const prev = closes[i - 1];
    if (!(prev > 0) || !(c > 0)) return null;
    return Math.log(c / prev);
  });

  const rv30Arr = rollingAnnualizedVol(logReturns, 30);
  const rv90Arr = rollingAnnualizedVol(logReturns, 90);

  const points: RealizedVolPoint[] = prices.map((p, i) => ({
    time:  p.time,
    ts:    new Date(p.time + 'T00:00:00Z').getTime(),
    price: p.price,
    rv30:  rv30Arr[i],
    rv90:  rv90Arr[i],
  }));

  // Running ATH, for the drawdown gate on the capitulation signal.
  let runningATH = 0;
  let drawdownPct: number | null = null;
  for (const c of closes) {
    if (c > runningATH) runningATH = c;
  }
  const lastClose = closes.at(-1) ?? null;
  if (lastClose != null && runningATH > 0) {
    drawdownPct = ((lastClose - runningATH) / runningATH) * 100;
  }

  const history = rv30Arr.filter((v): v is number => v != null);
  const sorted  = [...history].sort((a, b) => a - b);
  const rv30    = rv30Arr.at(-1) ?? null;
  const rv90    = rv90Arr.at(-1) ?? null;

  const longRunMean = history.length
    ? history.reduce((a, b) => a + b, 0) / history.length
    : null;

  const percentile = rv30 != null ? percentileRank(sorted, rv30) : null;
  const zone       = zoneFor(percentile);

  const compressedAt = sorted.length
    ? sorted[Math.floor((COMPRESSED_PERCENTILE / 100) * sorted.length)] ?? null
    : null;

  return {
    points,
    compressedAt,
    current: {
      rv30,
      rv90,
      longRunMean,
      percentile,
      zone,
      capitulationSignal:
        zone === 'compressed' &&
        drawdownPct != null &&
        drawdownPct <= MIN_DRAWDOWN_FOR_SIGNAL,
      price: lastClose,
      drawdownPct,
      vsLongRunPct:
        rv30 != null && longRunMean != null && longRunMean > 0
          ? (rv30 / longRunMean) * 100
          : null,
    },
  };
}
