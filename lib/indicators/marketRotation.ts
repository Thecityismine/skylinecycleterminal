function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ── Moving averages ──────────────────────────────────────────────────────────

export function calculateEMA(values: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let ema: number | null = null;
  let seedSum = 0;
  let seedCount = 0;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      result[i] = ema;
      continue;
    }
    if (ema == null) {
      seedSum += v;
      seedCount++;
      if (seedCount === period) {
        ema = seedSum / period;
        result[i] = ema;
      }
      continue;
    }
    ema = v * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

export type MAPeriod = 50 | 100 | 200;

// ── Rotation score (0-100 weighted composite) ────────────────────────────────
// Same shape as calculateAltseasonScore in altseasonIndex.ts: hand-tuned bands
// over trend-vs-MA, momentum (rate of change), and MA slope.

export type RotationScoreInputs = {
  value:        number;
  ma:           number | null;
  priorValue:   number | null;  // value `lookback` periods ago
  priorMA:      number | null;  // ma `lookback` periods ago
};

export function calculateRotationScore({ value, ma, priorValue, priorMA }: RotationScoreInputs): number {
  const trendScore = ma != null && ma > 0
    ? clamp(((value - ma) / ma) * 200 + 50, 0, 100) // ±25% from MA -> 0..100
    : 50;

  const roc = priorValue != null && priorValue > 0
    ? ((value - priorValue) / priorValue) * 100
    : 0;
  const momentumScore = clamp((roc + 40) / 80 * 100, 0, 100); // -40%..+40% -> 0..100

  const maSlope = ma != null && priorMA != null && priorMA > 0
    ? ((ma - priorMA) / priorMA) * 100
    : 0;
  const slopeScore = clamp((maSlope + 20) / 40 * 100, 0, 100); // -20%..+20% -> 0..100

  return Math.round(trendScore * 0.45 + momentumScore * 0.35 + slopeScore * 0.20);
}

// ── Regime bands ──────────────────────────────────────────────────────────────

export type RegimeBand = {
  key:   string;
  label: string;
  range: [number, number];
  color: string;
};

export const BULLISH_NEUTRAL_BEARISH: RegimeBand[] = [
  { key: 'bearish', label: 'Bearish', range: [0, 40],  color: '#FF5C5C' },
  { key: 'neutral', label: 'Neutral', range: [40, 60], color: '#E6B450' },
  { key: 'bullish', label: 'Bullish', range: [60, 101], color: '#35D07F' },
];

export const WEAK_NEUTRAL_STRONG_EXPLOSIVE: RegimeBand[] = [
  { key: 'weak',      label: 'Weak',      range: [0, 35],   color: '#FF5C5C' },
  { key: 'neutral',   label: 'Neutral',   range: [35, 55],  color: '#E6B450' },
  { key: 'strong',    label: 'Strong',    range: [55, 80],  color: '#35D07F' },
  { key: 'explosive', label: 'Explosive', range: [80, 101], color: '#45F3FF' },
];

export function getRegime(score: number, table: RegimeBand[]): RegimeBand {
  return table.find((r) => score >= r.range[0] && score < r.range[1]) ?? table[table.length - 1];
}

// ── Cycle-phase timeline ──────────────────────────────────────────────────────
// Heuristic classification off drawdown-from-rolling-ATH + 12-period rate of change.
// Not a precise model — a readable approximation of where a rotation series sits
// in a bottom -> accumulation -> expansion -> distribution -> correction -> recovery loop.

export type CyclePhase = 'bottom' | 'accumulation' | 'expansion' | 'distribution' | 'correction' | 'recovery';

export const PHASE_LABEL: Record<CyclePhase, string> = {
  bottom:       'Bottom',
  accumulation: 'Accumulation',
  expansion:    'Expansion',
  distribution: 'Distribution',
  correction:   'Correction',
  recovery:     'Recovery',
};

export const PHASE_COLOR: Record<CyclePhase, string> = {
  bottom:       '#FF5C5C',
  accumulation: '#3B82F6',
  expansion:    '#35D07F',
  distribution: '#E6B450',
  correction:   '#FF8A5C',
  recovery:     '#45F3FF',
};

function classifyPoint(drawdownPct: number, roc12: number): CyclePhase {
  if (drawdownPct <= -75) return 'bottom';
  if (drawdownPct <= -55) return roc12 > 5 ? 'accumulation' : 'bottom';
  if (drawdownPct <= -25) return roc12 > 8 ? 'recovery' : 'correction';
  if (drawdownPct <= -8)  return roc12 > 0 ? 'expansion' : 'correction';
  return roc12 > -3 ? 'expansion' : 'distribution';
}

export type CycleSegment = {
  phase:     CyclePhase;
  startTime: string;
  endTime:   string;
  days:      number;
};

export function buildCycleTimeline(points: { time: string; ts: number; value: number }[]): CycleSegment[] {
  if (points.length < 8) return [];

  const LOOKBACK = 12;
  let ath = 0;
  const phases: CyclePhase[] = points.map((p, i) => {
    ath = Math.max(ath, p.value);
    const drawdown = ath > 0 ? ((p.value - ath) / ath) * 100 : 0;
    const priorIdx = Math.max(0, i - LOOKBACK);
    const prior = points[priorIdx].value;
    const roc12 = prior > 0 ? ((p.value - prior) / prior) * 100 : 0;
    return classifyPoint(drawdown, roc12);
  });

  const segments: CycleSegment[] = [];
  let segStart = 0;
  for (let i = 1; i <= phases.length; i++) {
    if (i === phases.length || phases[i] !== phases[segStart]) {
      const startTime = points[segStart].time;
      const endTime = points[i - 1].time;
      const days = Math.round((points[i - 1].ts - points[segStart].ts) / 86_400_000);
      segments.push({ phase: phases[segStart], startTime, endTime, days });
      segStart = i;
    }
  }
  return segments;
}

// ── Historical similarity ─────────────────────────────────────────────────────
// Compares the trailing `windowWeeks` normalized-shape feature vector (% change
// from window start) against every past window of the same length via Euclidean
// distance, returning the closest non-overlapping matches plus their forward return.

export type SimilarityMatch = {
  startTime:        string;
  endTime:          string;
  similarity:       number; // 0-100
  forwardReturnPct: number;
};

export function findHistoricalSimilarity(
  points: { time: string; ts: number; value: number }[],
  windowWeeks = 12,
  forwardWeeks = 12,
  maxMatches = 2,
): SimilarityMatch[] {
  if (points.length < windowWeeks * 3 + forwardWeeks) return [];
  const values = points.map((p) => p.value);

  function featureVector(endIdx: number): number[] | null {
    const startIdx = endIdx - windowWeeks + 1;
    if (startIdx < 0) return null;
    const slice = values.slice(startIdx, endIdx + 1);
    const first = slice[0];
    // Normalize by |first| rather than first so signed series (e.g. a dominance
    // spread that can be negative) still produce a meaningful shape vector —
    // only true division-by-zero needs a guard, not the sign of the value.
    const denom = Math.abs(first) > 1e-9 ? Math.abs(first) : 1;
    return slice.map((v) => (v - first) / denom);
  }

  const currentIdx = values.length - 1;
  const currentVec = featureVector(currentIdx);
  if (!currentVec) return [];

  const candidates: { idx: number; dist: number }[] = [];
  for (let i = windowWeeks - 1; i <= currentIdx - forwardWeeks - windowWeeks; i++) {
    const vec = featureVector(i);
    if (!vec) continue;
    let sumSq = 0;
    for (let k = 0; k < vec.length; k++) {
      const d = vec[k] - currentVec[k];
      sumSq += d * d;
    }
    candidates.push({ idx: i, dist: Math.sqrt(sumSq) });
  }
  if (!candidates.length) return [];

  candidates.sort((a, b) => a.dist - b.dist);

  const picked: typeof candidates = [];
  for (const c of candidates) {
    if (picked.some((p) => Math.abs(p.idx - c.idx) < windowWeeks)) continue;
    picked.push(c);
    if (picked.length === maxMatches) break;
  }

  const maxDist = Math.max(...candidates.map((c) => c.dist), 1e-9);

  return picked.map((c) => {
    const startIdx = c.idx - windowWeeks + 1;
    const endValue = values[c.idx];
    const fwdValue = values[c.idx + forwardWeeks] ?? endValue;
    const forwardReturnPct = endValue > 0 ? ((fwdValue - endValue) / endValue) * 100 : 0;
    const similarity = Math.round(clamp((1 - c.dist / maxDist) * 100, 0, 100));
    return {
      startTime:        points[startIdx].time,
      endTime:           points[c.idx].time,
      similarity,
      forwardReturnPct: +forwardReturnPct.toFixed(1),
    };
  });
}
