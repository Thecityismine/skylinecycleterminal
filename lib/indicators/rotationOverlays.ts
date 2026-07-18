import { calculateEMA } from './marketRotation';

type SeriesPoint = { time: string; ts: number; value: number };

// ── Swing high/low pivots (N-bar fractal) ─────────────────────────────────────

export type SwingPoint = { idx: number; time: string; ts: number; value: number; type: 'high' | 'low' };

export function detectSwingPoints(points: SeriesPoint[], lookback = 2): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let i = lookback; i < points.length - lookback; i++) {
    const v = points[i].value;
    let isHigh = true;
    let isLow = true;
    for (let k = 1; k <= lookback; k++) {
      if (points[i - k].value >= v || points[i + k].value >= v) isHigh = false;
      if (points[i - k].value <= v || points[i + k].value <= v) isLow = false;
    }
    if (isHigh) swings.push({ idx: i, time: points[i].time, ts: points[i].ts, value: v, type: 'high' });
    else if (isLow) swings.push({ idx: i, time: points[i].time, ts: points[i].ts, value: v, type: 'low' });
  }
  return swings;
}

// Collapses consecutive same-type swings to the more extreme one, giving a
// strictly alternating high/low/high/low sequence to reason about structure with.
function alternate(swings: SwingPoint[]): SwingPoint[] {
  const sorted = swings.slice().sort((a, b) => a.idx - b.idx);
  const out: SwingPoint[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (!last) { out.push(s); continue; }
    if (last.type === s.type) {
      const moreExtreme = s.type === 'high' ? s.value > last.value : s.value < last.value;
      if (moreExtreme) out[out.length - 1] = s;
    } else {
      out.push(s);
    }
  }
  return out;
}

// ── CHOCH — change of character ───────────────────────────────────────────────
// Simplified smart-money-concepts style structure-break detector: a bullish CHOCH
// fires the first time a swing low prints higher than the swing low two-back while
// the market wasn't already trending up (mirrored for bearish). Not a literal
// clone of any commercial indicator — a direct, documented read of swing structure.

export type ChochEvent = {
  idx:         number;
  time:        string;
  ts:          number;
  direction:   'bullish' | 'bearish';
  brokenLevel: number;
};

export function detectCHOCH(swings: SwingPoint[]): ChochEvent[] {
  const seq = alternate(swings);
  const events: ChochEvent[] = [];
  if (seq.length < 3) return events;

  let trend: 'up' | 'down' | null = null;

  for (let i = 2; i < seq.length; i++) {
    const twoBack = seq[i - 2];
    const cur     = seq[i];

    if (twoBack.type === 'low' && cur.type === 'low' && cur.value > twoBack.value) {
      if (trend !== 'up') {
        events.push({ idx: cur.idx, time: cur.time, ts: cur.ts, direction: 'bullish', brokenLevel: twoBack.value });
      }
      trend = 'up';
    } else if (twoBack.type === 'high' && cur.type === 'high' && cur.value < twoBack.value) {
      if (trend !== 'down') {
        events.push({ idx: cur.idx, time: cur.time, ts: cur.ts, direction: 'bearish', brokenLevel: twoBack.value });
      }
      trend = 'down';
    }
  }

  return events;
}

// ── Trend cloud ────────────────────────────────────────────────────────────────
// Dual-EMA envelope (21-period fast / 50-period slow) shaded between the two lines.

export type CloudPoint = { time: string; ts: number; upper: number | null; lower: number | null };

export function buildTrendCloud(points: SeriesPoint[], fastPeriod = 21, slowPeriod = 50): CloudPoint[] {
  const values = points.map((p) => p.value);
  const fast = calculateEMA(values, fastPeriod);
  const slow = calculateEMA(values, slowPeriod);
  return points.map((p, i) => {
    const f = fast[i];
    const s = slow[i];
    return {
      time:  p.time,
      ts:    p.ts,
      upper: f != null && s != null ? Math.max(f, s) : null,
      lower: f != null && s != null ? Math.min(f, s) : null,
    };
  });
}

// ── Momentum oscillator (rate of change) ──────────────────────────────────────

export function calculateMomentum(points: SeriesPoint[], period = 10): (number | null)[] {
  const values = points.map((p) => p.value);
  return values.map((v, i) => {
    const prior = values[i - period];
    if (prior == null || prior === 0) return null;
    return ((v - prior) / prior) * 100;
  });
}

// ── Skyline Wave Oscillator ────────────────────────────────────────────────────
// Built from the public-domain WaveTrend formula (originally published as an open
// Pine Script by LazyBear) — deliberately NOT named after any commercial indicator
// product, since this isn't a clone of one, just built on the same public technique.

export type WavePoint = { time: string; ts: number; wt1: number | null; wt2: number | null };

export function calculateWaveOscillator(points: SeriesPoint[], n1 = 10, n2 = 21): WavePoint[] {
  const ap = points.map((p) => p.value);
  const esa = calculateEMA(ap, n1);
  const dev = ap.map((v, i) => (esa[i] != null ? Math.abs(v - esa[i]!) : null));
  const d = calculateEMA(dev, n1);
  const ci = ap.map((v, i) => {
    const e = esa[i];
    const dd = d[i];
    if (e == null || dd == null || dd === 0) return null;
    return (v - e) / (0.015 * dd);
  });
  const tci = calculateEMA(ci, n2);
  const wt2 = tci.map((_, i) => {
    if (i < 3) return null;
    const window = tci.slice(i - 3, i + 1);
    if (window.some((w) => w == null)) return null;
    return (window as number[]).reduce((a, b) => a + b, 0) / 4;
  });

  return points.map((p, i) => ({ time: p.time, ts: p.ts, wt1: tci[i], wt2: wt2[i] }));
}

// ── Macro oscillator ───────────────────────────────────────────────────────────
// Composite of DXY 1-month momentum (60%) and M2 YoY growth (40%), reusing the
// exact scoring bands from lib/api/fred.ts's snapshot macroScore, recombined into
// a rolling series and inverted so higher = more bullish for risk assets (same
// direction convention as the rotation score).

function clamp01to100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export type MacroOscillatorPoint = { time: string; value: number };

export function calculateMacroOscillator(
  dxy: { date: string; value: number }[],
  m2: { date: string; value: number }[],
): MacroOscillatorPoint[] {
  if (dxy.length < 35) return [];
  const m2Sorted = m2.slice().sort((a, b) => a.date.localeCompare(b.date));

  function m2YoYAt(dateStr: string): number {
    let i = m2Sorted.findIndex((d) => d.date >= dateStr);
    if (i === -1) i = m2Sorted.length - 1;
    const cur = m2Sorted[i]?.value;
    const prior = m2Sorted[Math.max(0, i - 12)]?.value;
    if (!cur || !prior) return 0;
    return ((cur - prior) / prior) * 100;
  }

  return dxy.map((d, i) => {
    const dxy1MAgo = dxy[Math.max(0, i - 30)]?.value ?? d.value;
    const dxyChange1M = dxy1MAgo !== 0 ? ((d.value - dxy1MAgo) / dxy1MAgo) * 100 : 0;
    const dxyScore = clamp01to100(((dxyChange1M + 3) / 6) * 100);
    const m2Score = clamp01to100(((5 - m2YoYAt(d.date)) / 20) * 100);
    const macroScore = Math.round(dxyScore * 0.6 + m2Score * 0.4);
    return { time: d.date, value: 100 - macroScore };
  });
}
