import type { PricePoint } from '@/lib/api/coinmetrics';
import { HALVINGS } from '@/lib/indicators/halvingCycles';

const DAY_MS = 86_400_000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValuationZone = 'deep-value' | 'value' | 'neutral' | 'extended' | 'sell-risk';

export type ValuationPoint = {
  time:                 string;
  ts:                   number;
  close:                number;
  ma200:                number | null;
  priceToMa200:         number | null;
  deviation:            number | null;   // priceToMa200 - 1
  daysUntilNextHalving: number | null;
  color:                string;          // halving-countdown color for this point
  zone:                 ValuationZone | null;
};

export type CyclePosition = {
  lastHalvingLabel:     string;
  lastHalvingDate:      string;
  nextHalvingLabel:     string;
  nextHalvingDate:      string;
  nextHalvingEstimated: boolean;
  daysSinceLastHalving: number;
  daysUntilNextHalving: number;
  cycleProgressPct:     number;
};

// ─── Zone thresholds & metadata ───────────────────────────────────────────────
// Thresholds are a starting model, not calibrated guarantees — see page disclaimer.

export const ZONE_META: Record<ValuationZone, { label: string; color: string; description: string }> = {
  'deep-value': {
    label: 'Deep Value',
    color: '#35D07F',
    description: 'Price is more than 20% below its 200-day trend — historically rare, deep-discount territory.',
  },
  'value': {
    label: 'Buy / Accumulation Zone',
    color: '#35D07F',
    description: 'Price is at or modestly below its 200-day trend — a historical accumulation zone.',
  },
  'neutral': {
    label: 'Normal Trend',
    color: '#A9B4C0',
    description: 'Price is trading within a normal range above its 200-day trend.',
  },
  'extended': {
    label: 'Extended',
    color: '#E6B450',
    description: 'Price is 50–100% above its 200-day trend — historically an extended, higher-risk zone.',
  },
  'sell-risk': {
    label: 'Sell-Risk / Extreme Extension',
    color: '#F85149',
    description: 'Price is more than double its 200-day trend — historically associated with late-cycle euphoria.',
  },
};

export function classifyZone(deviation: number | null): ValuationZone | null {
  if (deviation == null) return null;
  if (deviation < -0.20) return 'deep-value';
  if (deviation <  0.05) return 'value';
  if (deviation <  0.50) return 'neutral';
  if (deviation <  1.00) return 'extended';
  return 'sell-risk';
}

// ─── Halving countdown & color scale ─────────────────────────────────────────
// Color sweeps blue → cyan → green → yellow → orange → red as days-until-halving
// falls from ~1,400 (just after a halving) to 0 (halving day).

const HALVING_COLOR_MAX_DAYS = 1400;

export function daysUntilNextHalving(ts: number): number | null {
  const next = HALVINGS.find((h) => h.ts > ts);
  if (!next) return null;
  return Math.round((next.ts - ts) / DAY_MS);
}

export function halvingColor(days: number | null): string {
  if (days == null) return 'rgba(255,255,255,0.35)';
  const clamped = Math.max(0, Math.min(HALVING_COLOR_MAX_DAYS, days));
  const hue = 240 - (clamped / HALVING_COLOR_MAX_DAYS) * 240; // 240=blue → 0=red
  return `hsl(${hue.toFixed(0)}, 75%, 55%)`;
}

export function getCyclePosition(now = Date.now()): CyclePosition | null {
  const past = [...HALVINGS].filter((h) => h.ts <= now).sort((a, b) => b.ts - a.ts)[0];
  const next = HALVINGS.find((h) => h.ts > now);
  if (!past || !next) return null;

  const daysSinceLastHalving = Math.round((now - past.ts) / DAY_MS);
  const daysUntilNext        = Math.round((next.ts - now) / DAY_MS);

  return {
    lastHalvingLabel:     past.label,
    lastHalvingDate:      past.date,
    nextHalvingLabel:     next.label,
    nextHalvingDate:      next.date,
    nextHalvingEstimated: next.estimated,
    daysSinceLastHalving,
    daysUntilNextHalving: daysUntilNext,
    cycleProgressPct:     (daysSinceLastHalving / (daysSinceLastHalving + daysUntilNext)) * 100,
  };
}

// ─── 200D SMA ─────────────────────────────────────────────────────────────────

function sma(values: number[], period: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= period) sum -= values[i - period];
    if (i < period - 1) return null;
    return sum / period;
  });
}

// ─── Public: build valuation points ──────────────────────────────────────────

export function calculateValuationPoints(daily: PricePoint[]): ValuationPoint[] {
  const closes = daily.map((d) => d.price);
  const ma200v = sma(closes, 200);

  return daily.map((d, i) => {
    const ts     = new Date(d.time + 'T00:00:00Z').getTime();
    const ma200  = ma200v[i];
    const priceToMa200 = ma200 != null && ma200 > 0 ? d.price / ma200 : null;
    const deviation    = priceToMa200 != null ? priceToMa200 - 1 : null;
    const days   = daysUntilNextHalving(ts);

    return {
      time:  d.time,
      ts,
      close: d.price,
      ma200,
      priceToMa200,
      deviation,
      daysUntilNextHalving: days,
      color: halvingColor(days),
      zone:  classifyZone(deviation),
    };
  });
}
