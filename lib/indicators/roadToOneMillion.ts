import { HALVINGS, type Halving } from '@/lib/indicators/halvingCycles';

// ─── Extended halving timeline (local — does not mutate the shared HALVINGS) ──

export const H6: Halving = {
  label: 'H6 (est.)',
  number: 6,
  date: '2032-04-19',
  ts: new Date('2032-04-19T00:00:00Z').getTime(),
  estimated: true,
};

export const PROJECTION_HALVINGS: Halving[] = [...HALVINGS, H6];

const H5 = HALVINGS.find((h) => h.number === 5)!;

// ─── Scenario model ─────────────────────────────────────────────────────────
// Anchors + multipliers below are illustrative modeled assumptions, not
// predictions. Peak targets are the midpoints of the ranges outlined in the
// Road to 1M brainstorm; trough multipliers loosely follow the compressing
// peak-to-next-low drawdown pattern seen across H1–H4 (~87% → 84% → 77%).

export type Scenario = 'base' | 'moderate' | 'optimistic';
export const SCENARIOS: Scenario[] = ['base', 'moderate', 'optimistic'];

export const SCENARIO_META: Record<Scenario, { label: string; color: string; glowId: string }> = {
  base:       { label: 'Base',       color: '#3B82F6', glowId: 'r1m-glow-blue'  },
  moderate:   { label: 'Moderate',   color: '#22C55E', glowId: 'r1m-glow-green' },
  optimistic: { label: 'Optimistic', color: '#F59E0B', glowId: 'r1m-glow-amber' },
};

export const SCENARIO_TARGETS: Record<Scenario, { peak2028: number; peak2032: number }> = {
  base:       { peak2028: 220_000, peak2032: 375_000   },
  moderate:   { peak2028: 400_000, peak2032: 750_000   },
  optimistic: { peak2028: 750_000, peak2032: 1_500_000 },
};

const PRE_H5_TROUGH_MULT:  Record<Scenario, number> = { base: 0.75, moderate: 0.85, optimistic: 0.95 };
const POST_2028_TROUGH_MULT: Record<Scenario, number> = { base: 0.45, moderate: 0.55, optimistic: 0.65 };
const TAIL_MULT: Record<Scenario, number> = { base: 0.80, moderate: 0.82, optimistic: 0.85 };

export const MILESTONES: { label: string; price: number; emphasize?: boolean }[] = [
  { label: '$100K', price: 100_000 },
  { label: '$250K', price: 250_000 },
  { label: '$500K', price: 500_000 },
  { label: '$1M',   price: 1_000_000, emphasize: true },
];

export const Y_DOMAIN_MIN = 1;
export const Y_DOMAIN_MAX = 3_000_000;

export type ProjectionPoint = { ts: number; price: number };

const DAY_MS  = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

// Historical cycle tops have landed roughly 12–18 months after the halving —
// use 14 months (~426 days) as a fixed offset, not calendar-month arithmetic.
const PEAK_OFFSET_MS  = 426 * DAY_MS;
// Deep-accumulation lows have historically landed ~65 weeks before a halving.
const TROUGH_OFFSET_MS = 65 * 7 * DAY_MS;
// Trailing-off tail after the final modeled peak, purely for visual closure.
const TAIL_OFFSET_MS  = 1.4 * YEAR_MS;

const SAMPLE_STEP_MS = 14 * DAY_MS; // biweekly

function smoothstep(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Interpolates in log-price space between two anchors using smoothstep easing. */
function interpolateSegment(
  a: ProjectionPoint,
  b: ProjectionPoint,
  step = SAMPLE_STEP_MS,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const span = b.ts - a.ts;
  if (span <= 0) return points;

  const logA = Math.log10(Math.max(Y_DOMAIN_MIN, a.price));
  const logB = Math.log10(Math.max(Y_DOMAIN_MIN, b.price));

  for (let ts = a.ts + step; ts < b.ts; ts += step) {
    const t = (ts - a.ts) / span;
    const eased = smoothstep(t);
    const logPrice = logA + (logB - logA) * eased;
    points.push({ ts, price: Math.pow(10, logPrice) });
  }
  points.push({ ts: b.ts, price: b.price });
  return points;
}

function buildFromAnchors(anchors: ProjectionPoint[]): ProjectionPoint[] {
  const out: ProjectionPoint[] = [anchors[0]];
  for (let i = 0; i < anchors.length - 1; i++) {
    out.push(...interpolateSegment(anchors[i], anchors[i + 1]));
  }
  return out;
}

/**
 * Builds a smooth forward scenario path from the last real price point,
 * through the pre-H5 accumulation trough, the H5/H6 halvings, both future
 * cycle peaks, a post-2028-peak drawdown trough, and a short closing tail.
 */
export function buildScenarioProjection(
  lastRealPoint: ProjectionPoint,
  scenario: Scenario,
): ProjectionPoint[] {
  const targets = SCENARIO_TARGETS[scenario];

  const preH5Trough: ProjectionPoint = {
    ts: H5.ts - TROUGH_OFFSET_MS,
    price: lastRealPoint.price * PRE_H5_TROUGH_MULT[scenario],
  };
  const atH5: ProjectionPoint = {
    ts: H5.ts,
    price: lastRealPoint.price * ((PRE_H5_TROUGH_MULT[scenario] + 1) / 2),
  };
  const peak2028: ProjectionPoint = {
    ts: H5.ts + PEAK_OFFSET_MS,
    price: targets.peak2028,
  };
  const postPeakTrough: ProjectionPoint = {
    ts: H6.ts - TROUGH_OFFSET_MS,
    price: targets.peak2028 * POST_2028_TROUGH_MULT[scenario],
  };
  const atH6: ProjectionPoint = {
    ts: H6.ts,
    price: targets.peak2028 * ((POST_2028_TROUGH_MULT[scenario] + 1) / 2),
  };
  const peak2032: ProjectionPoint = {
    ts: H6.ts + PEAK_OFFSET_MS,
    price: targets.peak2032,
  };
  const tailEnd: ProjectionPoint = {
    ts: H6.ts + PEAK_OFFSET_MS + TAIL_OFFSET_MS,
    price: targets.peak2032 * TAIL_MULT[scenario],
  };

  // Anchors must be strictly increasing in ts; if the last real point is
  // already past a given anchor (e.g. we're already near the H5 trough
  // window), skip anchors that would go backwards in time.
  const anchors = [lastRealPoint, preH5Trough, atH5, peak2028, postPeakTrough, atH6, peak2032, tailEnd]
    .filter((p, i, arr) => i === 0 || p.ts > arr[i - 1].ts);

  return buildFromAnchors(anchors);
}

export function buildAllScenarios(
  lastRealPoint: ProjectionPoint,
): Record<Scenario, ProjectionPoint[]> {
  return {
    base:       buildScenarioProjection(lastRealPoint, 'base'),
    moderate:   buildScenarioProjection(lastRealPoint, 'moderate'),
    optimistic: buildScenarioProjection(lastRealPoint, 'optimistic'),
  };
}

/** Linearly interpolates the date a projected path first crosses targetPrice. */
export function estimateCrossingDate(points: ProjectionPoint[], targetPrice: number): string | null {
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev.price < targetPrice && curr.price >= targetPrice) {
      const span = curr.price - prev.price;
      const t = span === 0 ? 0 : (targetPrice - prev.price) / span;
      const ts = prev.ts + t * (curr.ts - prev.ts);
      return new Date(ts).toISOString().slice(0, 7); // YYYY-MM
    }
  }
  return null;
}

export function fmtCrossingLabel(iso: string | null): string {
  if (!iso) return 'Not Reached';
  const d = new Date(iso + '-01T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
