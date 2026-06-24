import type { PricePoint } from '@/lib/api/coinmetrics';

export const HALVING_DEFS = [
  { id: '2012', label: '2012 Cycle', halvingDate: '2012-11-28', blockReward: 25,    color: '#5B84FF', strokeWidth: 1.5 },
  { id: '2016', label: '2016 Cycle', halvingDate: '2016-07-09', blockReward: 12.5,  color: '#F7931A', strokeWidth: 1.5 },
  { id: '2020', label: '2020 Cycle', halvingDate: '2020-05-11', blockReward: 6.25,  color: '#35D07F', strokeWidth: 1.5 },
  { id: '2024', label: '2024 Cycle', halvingDate: '2024-04-20', blockReward: 3.125, color: '#F5F7FA', strokeWidth: 3   },
] as const;

export type HalvingDef = typeof HALVING_DEFS[number];
export const CURRENT_REWARD = 3.125;

export type AlignedPoint = {
  day: number;
  indexed: number;    // (price / halvingPrice) * 100 — starts at 100
  returnPct: number;  // ((price - halvingPrice) / halvingPrice) * 100
  rewardAdj: number;  // price * (CURRENT_REWARD / blockReward)
  raw: number;
};

export type AlignedCycle = {
  def: HalvingDef;
  halvingPrice: number;
  isActive: boolean;
  points: AlignedPoint[];
  peakReturn: number | null;    // null while active
  daysToPeak: number | null;
  maxDrawdown: number | null;
};

export type MedianPoint = {
  day: number;
  p25: number;
  p50: number;
  p75: number;
};

export type NormMode = 'indexed' | 'returnPct' | 'rewardAdj' | 'raw';

function findPrice(prices: PricePoint[], date: string): number | null {
  const exact = prices.find(p => p.time === date);
  if (exact) return exact.price;
  // Try +1 day for data gaps
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  const nextDay = d.toISOString().slice(0, 10);
  const next = prices.find(p => p.time === nextDay);
  return next ? next.price : null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function alignCycle(prices: PricePoint[], defIdx: number): AlignedCycle | null {
  const def = HALVING_DEFS[defIdx];
  const nextDef = HALVING_DEFS[defIdx + 1] as HalvingDef | undefined;

  const halvingPrice = findPrice(prices, def.halvingDate);
  if (!halvingPrice) return null;

  const halvingMs = new Date(def.halvingDate + 'T00:00:00Z').getTime();
  const today = new Date().toISOString().slice(0, 10);
  const isActive = !nextDef || today < nextDef.halvingDate;

  const endDate = nextDef ? nextDef.halvingDate : null;

  const points: AlignedPoint[] = [];

  for (const p of prices) {
    if (p.time < def.halvingDate) continue;
    if (endDate && p.time >= endDate) continue;

    const pointMs = new Date(p.time + 'T00:00:00Z').getTime();
    const day = Math.floor((pointMs - halvingMs) / 86400000);

    const indexed   = (p.price / halvingPrice) * 100;
    const returnPct = ((p.price - halvingPrice) / halvingPrice) * 100;
    const rewardAdj = p.price * (CURRENT_REWARD / def.blockReward);
    const raw       = p.price;

    points.push({ day, indexed, returnPct, rewardAdj, raw });
  }

  if (points.length === 0) return null;

  // Compute stats only for completed cycles
  let peakReturn: number | null = null;
  let daysToPeak: number | null = null;
  let maxDrawdown: number | null = null;

  if (!isActive) {
    let peak = -Infinity;
    let peakDay = 0;

    for (const pt of points) {
      if (pt.returnPct > peak) {
        peak = pt.returnPct;
        peakDay = pt.day;
      }
    }
    peakReturn = peak;
    daysToPeak = peakDay;

    // Max drawdown from peak
    let runningPeak = points[0].indexed;
    let maxDD = 0;
    for (const pt of points) {
      if (pt.indexed > runningPeak) runningPeak = pt.indexed;
      const dd = ((runningPeak - pt.indexed) / runningPeak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
    maxDrawdown = -maxDD; // negative
  }

  return { def, halvingPrice, isActive, points, peakReturn, daysToPeak, maxDrawdown };
}

export function computeMedianPath(aligned: AlignedCycle[]): MedianPoint[] {
  const completed = aligned.filter(a => !a.isActive);
  if (completed.length === 0) return [];

  // Build per-cycle Maps for fast lookup
  const cycleMaps = completed.map(c => {
    const m = new Map<number, number>();
    for (const pt of c.points) m.set(pt.day, pt.indexed);
    return m;
  });

  // Find max day across all completed cycles
  const maxDay = Math.max(...completed.map(c => c.points[c.points.length - 1]?.day ?? 0));

  const result: MedianPoint[] = [];

  for (let d = 0; d <= maxDay; d += 3) {
    const vals: number[] = [];
    for (const m of cycleMaps) {
      // Try exact day ±2
      let v: number | undefined;
      for (let offset = 0; offset <= 2; offset++) {
        v = m.get(d + offset) ?? m.get(d - offset);
        if (v !== undefined) break;
      }
      if (v !== undefined) vals.push(v);
    }

    if (vals.length === 0) continue;
    const sorted = [...vals].sort((a, b) => a - b);
    result.push({
      day: d,
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
    });
  }

  return result;
}
