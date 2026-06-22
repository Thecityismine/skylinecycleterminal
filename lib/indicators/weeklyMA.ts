import type { PricePoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeeklyPoint = {
  time: string;      // Monday of the week, YYYY-MM-DD
  close: number;
  ma50:  number | null;
  ma100: number | null;
  ma200: number | null;
  distanceFrom100W: number | null;  // % above/below 100W MA
  trendRegime: 'bullish' | 'testing' | 'bearish' | null;
};

export type MATrendScore = {
  score: number;
  label: string;
  color: string;
  description: string;
};

export type ReclaimStatus = {
  status: 'below' | 'attempting' | 'confirmed' | 'holding';
  weeksAbove: number;
  weeksBelow: number;
  distancePct: number | null;
  label: string;
  color: string;
};

export type RegimeSegment = {
  start: string;
  end:   string;
  regime: 'bullish' | 'testing' | 'bearish';
};

export type HistoricalTouchpoint = {
  event:       string;
  date:        string;
  price:       number | null;
  ma100:       number | null;
  distancePct: number | null;
  result:      string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Return the Monday (YYYY-MM-DD) of the ISO week containing `dateStr`.
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

// ─── Weekly aggregation ───────────────────────────────────────────────────────

function aggregateWeeklyCloses(daily: PricePoint[]): { time: string; close: number }[] {
  // For each ISO week take the latest available daily close.
  const map = new Map<string, { latest: string; price: number }>();
  for (const p of daily) {
    const key = mondayOf(p.time);
    const ex  = map.get(key);
    if (!ex || p.time > ex.latest) map.set(key, { latest: p.time, price: p.price });
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monday, { price }]) => ({ time: monday, close: price }));
}

// ─── SMA ──────────────────────────────────────────────────────────────────────

function sma(closes: number[], period: number): (number | null)[] {
  let sum = 0;
  return closes.map((v, i) => {
    sum += v;
    if (i >= period) sum -= closes[i - period];
    if (i < period - 1) return null;
    return sum / period;
  });
}

// ─── Regime ───────────────────────────────────────────────────────────────────

function regime(close: number, ma100: number): 'bullish' | 'testing' | 'bearish' {
  const d = ((close - ma100) / ma100) * 100;
  if (d >  5) return 'bullish';
  if (d < -5) return 'bearish';
  return 'testing';
}

// ─── Public: build weekly points ─────────────────────────────────────────────

export function calculateWeeklyPoints(daily: PricePoint[]): WeeklyPoint[] {
  const candles = aggregateWeeklyCloses(daily);
  const closes  = candles.map((c) => c.close);
  const ma50v   = sma(closes, 50);
  const ma100v  = sma(closes, 100);
  const ma200v  = sma(closes, 200);

  return candles.map((c, i) => {
    const ma100 = ma100v[i];
    return {
      time:  c.time,
      close: c.close,
      ma50:  ma50v[i],
      ma100,
      ma200: ma200v[i],
      distanceFrom100W: ma100 != null ? ((c.close - ma100) / ma100) * 100 : null,
      trendRegime:      ma100 != null ? regime(c.close, ma100) : null,
    };
  });
}

// ─── 100W MA slope (% change over `lookback` weeks) ──────────────────────────

export function calculateMA100Slope(points: WeeklyPoint[], lookback = 20): number | null {
  const lastIdx = points.findLastIndex((p) => p.ma100 != null);
  if (lastIdx < lookback) return null;
  const prevIdx = lastIdx - lookback;
  const last    = points[lastIdx].ma100!;
  const prev    = points[prevIdx].ma100;
  if (!prev) return null;
  return ((last - prev) / prev) * 100;
}

// ─── Trend score ──────────────────────────────────────────────────────────────

export function calculateTrendScore(points: WeeklyPoint[]): MATrendScore {
  const lastIdx = points.findLastIndex((p) => p.ma100 != null);
  const last    = lastIdx >= 0 ? points[lastIdx] : null;
  if (!last) return { score: 50, label: 'No Data', color: '#94A3B8', description: 'Insufficient data.' };

  const parts: { score: number; weight: number }[] = [];

  // 1. Price vs 100W MA (40%) — centred at MA; ±30% maps to 0–100
  if (last.distanceFrom100W != null) {
    parts.push({ score: clamp(50 + last.distanceFrom100W * (50 / 30), 0, 100), weight: 0.40 });
  }

  // 2. 100W MA slope over 20 weeks (25%) — ±10% maps to 0–100
  const prevIdx = Math.max(0, lastIdx - 20);
  const prevMA  = points[prevIdx].ma100;
  if (prevMA && last.ma100) {
    const slope = ((last.ma100 - prevMA) / prevMA) * 100;
    parts.push({ score: clamp(50 + slope * 5, 0, 100), weight: 0.25 });
  }

  // 3. Price vs 50W MA (15%)
  if (last.ma50) {
    const d = ((last.close - last.ma50) / last.ma50) * 100;
    parts.push({ score: clamp(50 + d * 2, 0, 100), weight: 0.15 });
  }

  // 4. Price vs 200W MA (15%)
  if (last.ma200) {
    const d = ((last.close - last.ma200) / last.ma200) * 100;
    parts.push({ score: clamp(50 + d * 1, 0, 100), weight: 0.15 });
  }

  // 5. 4-week momentum (5%)
  if (lastIdx >= 4) {
    const mom = ((last.close - points[lastIdx - 4].close) / points[lastIdx - 4].close) * 100;
    parts.push({ score: clamp(50 + mom * 1.5, 0, 100), weight: 0.05 });
  }

  const total = parts.reduce((s, p) => s + p.weight, 0);
  const score = Math.round(parts.reduce((s, p) => s + p.score * (p.weight / total), 0));

  if (score >= 75) return {
    score, color: '#35D07F', label: 'Extended Above Trend',
    description: 'Bitcoin is well above a rising 100-week MA — historically associated with late bull market expansion.',
  };
  if (score >= 60) return {
    score, color: '#3B82F6', label: 'Healthy Trend',
    description: 'Bitcoin holds above a rising 100-week MA. Medium-term structure is constructive.',
  };
  if (score >= 40) return {
    score, color: '#E6B450', label: 'Trend Test Zone',
    description: 'Bitcoin is near the 100-week MA — a historically critical support and resistance level.',
  };
  if (score >= 25) return {
    score, color: '#F97316', label: 'Weakening / Recovery',
    description: 'Bitcoin is below or near its 100-week MA. Medium-term momentum is under pressure.',
  };
  return {
    score, color: '#FF5C5C', label: 'Deeply Below Trend',
    description: 'Bitcoin is significantly below a flattening/falling 100-week MA — historically a deep bear signal.',
  };
}

// ─── Regime segments (for ReferenceArea shading) ─────────────────────────────

export function findRegimeSegments(points: WeeklyPoint[]): RegimeSegment[] {
  const segments: RegimeSegment[] = [];
  let current: RegimeSegment | null = null;

  for (const p of points) {
    if (!p.trendRegime) continue;
    if (!current || current.regime !== p.trendRegime) {
      if (current) segments.push(current);
      current = { start: p.time, end: p.time, regime: p.trendRegime };
    } else {
      current.end = p.time;
    }
  }
  if (current) segments.push(current);
  return segments;
}

// ─── 100W MA reclaim status ───────────────────────────────────────────────────

export function calculateReclaimStatus(points: WeeklyPoint[]): ReclaimStatus {
  // Scan from end to count the current consecutive above/below run.
  let weeksAbove = 0;
  let weeksBelow = 0;
  let direction: 'above' | 'below' | null = null;

  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    if (p.ma100 == null) continue;
    const above = p.close >= p.ma100;

    if (direction === null) direction = above ? 'above' : 'below';
    if (above && direction === 'above')  weeksAbove++;
    else if (!above && direction === 'below') weeksBelow++;
    else break;
  }

  const lastValid = points.findLast((p) => p.ma100 != null);
  const distancePct = lastValid?.distanceFrom100W ?? null;

  if (direction === 'below') {
    return { status: 'below', weeksAbove: 0, weeksBelow, distancePct: null, label: 'Below 100W MA', color: '#FF5C5C' };
  }

  // Was there a "below" period before this above run? → reclaim scenario
  const hadBelow = points.slice(0, Math.max(0, points.length - weeksAbove))
    .some((p) => p.ma100 != null && p.close < p.ma100);

  if (weeksAbove >= 4 && hadBelow) {
    return { status: 'confirmed', weeksAbove, weeksBelow: 0, distancePct, label: 'Reclaim Confirmed', color: '#35D07F' };
  }
  if (weeksAbove >= 4) {
    return { status: 'holding', weeksAbove, weeksBelow: 0, distancePct, label: 'Support Holding', color: '#35D07F' };
  }
  return { status: 'attempting', weeksAbove, weeksBelow: 0, distancePct, label: 'Above (< 4 weeks)', color: '#3B82F6' };
}

// ─── Historical touchpoints ───────────────────────────────────────────────────

const EVENTS: Array<{ event: string; approxDate: string; result: string }> = [
  { event: '2015 Bear Bottom',  approxDate: '2015-01-12', result: 'Recovery below 100W MA; reclaim took months' },
  { event: '2018 Bear Bottom',  approxDate: '2018-12-10', result: 'Broke 100W MA — deepest bear since 2015' },
  { event: '2020 COVID Crash',  approxDate: '2020-03-09', result: 'Briefly below; fast reclaim within 3 weeks' },
  { event: '2022 Bear Market',  approxDate: '2022-06-13', result: '100W MA broke down — first since 2015' },
  { event: '2017 Cycle Peak',   approxDate: '2017-12-18', result: 'Far above trend — late-stage distribution' },
  { event: '2021 Cycle Peak',   approxDate: '2021-11-08', result: 'Far above trend — late-stage distribution' },
];

export function findHistoricalTouchpoints(points: WeeklyPoint[]): HistoricalTouchpoint[] {
  return EVENTS.map(({ event, approxDate, result }) => {
    const target  = new Date(approxDate).getTime();
    const closest = points.reduce<WeeklyPoint | null>((best, p) => {
      if (!best) return p;
      return Math.abs(new Date(p.time).getTime() - target) <
             Math.abs(new Date(best.time).getTime() - target) ? p : best;
    }, null);

    return {
      event,
      date:        closest?.time ?? approxDate,
      price:       closest?.close ?? null,
      ma100:       closest?.ma100 ?? null,
      distancePct: closest?.distanceFrom100W ?? null,
      result,
    };
  });
}
