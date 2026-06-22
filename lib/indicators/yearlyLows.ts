import type { PricePoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type YearlyLow = {
  year: number;
  lowPrice: number;
  lowDate: string;
  prevYearLow: number | null;
  yoyChange: number | null;       // % vs prior year low
  isPartialYear: boolean;
  halvingYear: boolean;
  cycleContext: string;
};

export type FloorTrendScore = {
  score: number;
  label: string;
  color: string;
  description: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const HALVING_YEARS = new Set([2012, 2016, 2020, 2024]);

const CYCLE_CONTEXT: Record<number, string> = {
  2012: 'Pre-halving',
  2013: 'Bull market',
  2014: 'Post-peak decline',
  2015: 'Bear-market low',
  2016: 'Pre-halving recovery',
  2017: 'Bull market',
  2018: 'Bear-market low',
  2019: 'Recovery',
  2020: 'Halving + expansion',
  2021: 'Bull market',
  2022: 'Bear-market low',
  2023: 'Recovery',
  2024: 'Pre/post-halving',
  2025: 'Early expansion',
  2026: 'Mid cycle',
};

// ─── Computation ──────────────────────────────────────────────────────────────

export function calculateYearlyLows(data: PricePoint[]): YearlyLow[] {
  const currentYear = new Date().getUTCFullYear();
  const byYear = new Map<number, PricePoint[]>();

  for (const p of data) {
    const year = new Date(p.time + 'T00:00:00Z').getUTCFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(p);
  }

  const sorted = Array.from(byYear.entries())
    .filter(([, pts]) => pts.length > 0)
    .sort(([a], [b]) => a - b);

  const result: YearlyLow[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const [year, points] = sorted[i];
    const lowest = points.reduce((a, b) => b.price < a.price ? b : a);
    const prevYearLow = i > 0
      ? sorted[i - 1][1].reduce((a, b) => b.price < a.price ? b : a).price
      : null;

    result.push({
      year,
      lowPrice: lowest.price,
      lowDate: lowest.time,
      prevYearLow,
      yoyChange: prevYearLow != null && prevYearLow > 0
        ? ((lowest.price - prevYearLow) / prevYearLow) * 100
        : null,
      isPartialYear: year === currentYear,
      halvingYear: HALVING_YEARS.has(year),
      cycleContext: CYCLE_CONTEXT[year] ?? 'Active',
    });
  }

  return result;
}

// ─── CAGR ─────────────────────────────────────────────────────────────────────

export function calcCAGR(start: number, end: number, years: number): number {
  if (start <= 0 || years <= 0) return 0;
  return ((end / start) ** (1 / years) - 1) * 100;
}

// ─── Floor Trend Score ────────────────────────────────────────────────────────

export function computeFloorTrendScore(lows: YearlyLow[]): FloorTrendScore {
  const complete = lows.filter((l) => !l.isPartialYear);
  const current = lows.at(-1);

  if (!current || complete.length < 3) {
    return { score: 50, label: 'Insufficient Data', color: '#94A3B8', description: 'Not enough years of data.' };
  }

  let score = 50;
  const notes: string[] = [];

  // Component 1: current year low vs prior year (primary signal)
  if (current.prevYearLow != null) {
    if (current.lowPrice >= current.prevYearLow) {
      score += 20;
      notes.push('floor above prior year');
    } else {
      score -= 20;
      notes.push('floor below prior year');
    }

    // YoY growth quality
    const growth = current.yoyChange ?? 0;
    if (growth > 100) score += 10;
    else if (growth > 20) score += 5;
    else if (growth < -30) score -= 10;
  }

  // Component 2: vs 4-year (prior cycle) low
  const fourYearBack = lows.find((l) => l.year === current.year - 4);
  if (fourYearBack) {
    if (current.lowPrice >= fourYearBack.lowPrice) {
      score += 15;
      notes.push(`above ${fourYearBack.year} cycle low`);
    } else {
      score -= 25;
      notes.push(`below ${fourYearBack.year} cycle low — structural stress`);
    }
  }

  // Component 3: vs 2-year low
  const twoYearBack = lows.find((l) => l.year === current.year - 2);
  if (twoYearBack) {
    if (current.lowPrice >= twoYearBack.lowPrice) score += 5;
    else score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  const s = Math.round(score);

  if (s >= 75) return {
    score: s, label: 'Accelerating Adoption', color: '#35D07F',
    description: `Annual floor structure is strengthening. ${notes.join('; ')}.`,
  };
  if (s >= 50) return {
    score: s, label: 'Healthy Growth', color: '#3B82F6',
    description: `Long-term floor trend intact. ${notes.join('; ')}.`,
  };
  if (s >= 25) return {
    score: s, label: 'Weak / Flat', color: '#E6B450',
    description: `Floor growth slowing or stalling. ${notes.join('; ')}.`,
  };
  return {
    score: s, label: 'Floor Breakdown', color: '#FF5C5C',
    description: `Floor trend under structural stress. ${notes.join('; ')}.`,
  };
}
