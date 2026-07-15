import type { PricePoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MaPeriod = 7 | 20 | 50 | 100 | 200;
export type GroupBy = 'weekday' | 'weekOfMonth' | 'month';
export type Metric = 'avgDiscount' | 'medianDiscount' | 'winRate' | 'avgReturn';
export type ForwardWindow = 30 | 90 | 180 | 365;
export type DateRangeKey = 'all' | '2017' | 'currentCycle';

export type DcaDayPoint = {
  time:        string;
  ts:          number;
  price:       number;
  discount:    number | null; // (price - ma) / ma
  weekday:     number;        // 0=Sun .. 6=Sat
  weekOfMonth: number;        // 1-5
  month:       number;        // 1-12
  fwd30:       number | null;
  fwd90:       number | null;
  fwd180:      number | null;
  fwd365:      number | null;
};

export type BucketStat = {
  key:            number;      // weekday 0-6, weekOfMonth 1-5, or month 1-12
  label:          string;
  avgDiscount:    number | null;
  medianDiscount: number | null;
  avgFwd30:       number | null;
  avgFwd90:       number | null;
  avgFwd180:      number | null;
  avgFwd365:      number | null;
  winRate:        number | null; // % positive over the configured forward window
  occurrences:    number;
};

// ─── Labels ───────────────────────────────────────────────────────────────────

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_LABELS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEK_OF_MONTH_LABELS: Record<number, string> = { 1: '1st Week', 2: '2nd Week', 3: '3rd Week', 4: '4th Week', 5: '5th Week' };

export const CURRENT_CYCLE_START = '2024-04-19'; // 4th halving

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  all:          'All Time',
  '2017':       '2017–Present',
  currentCycle: 'Current Cycle',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── Series computation ─────────────────────────────────────────────────────
// Computed once over the FULL history so moving averages and forward returns
// never truncate at a date-range boundary — range filtering happens afterward
// in aggregateByBucket.

export function computeDcaSeries(prices: PricePoint[], maPeriod: MaPeriod): DcaDayPoint[] {
  const closes = prices.map((p) => p.price);
  const ma     = smaArr(closes, maPeriod);

  const FWD: ForwardWindow[] = [30, 90, 180, 365];

  return prices.map((p, i) => {
    const date  = new Date(p.time + 'T00:00:00Z');
    const price = closes[i];
    const m     = ma[i];

    const fwd: Record<ForwardWindow, number | null> = { 30: null, 90: null, 180: null, 365: null };
    for (const w of FWD) {
      const future = closes[i + w];
      if (future != null) fwd[w] = (future - price) / price;
    }

    return {
      time:        p.time,
      ts:          date.getTime(),
      price,
      discount:    m != null && m > 0 ? (price - m) / m : null,
      weekday:     date.getUTCDay(),
      weekOfMonth: Math.min(5, Math.ceil(date.getUTCDate() / 7)),
      month:       date.getUTCMonth() + 1,
      fwd30:       fwd[30],
      fwd90:       fwd[90],
      fwd180:      fwd[180],
      fwd365:      fwd[365],
    };
  });
}

// ─── Date range filtering ───────────────────────────────────────────────────

export function filterByDateRange(series: DcaDayPoint[], range: DateRangeKey): DcaDayPoint[] {
  if (range === 'all') return series;
  if (range === '2017') return series.filter((d) => d.time >= '2017-01-01');
  return series.filter((d) => d.time >= CURRENT_CYCLE_START);
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

function bucketKeyLabel(groupBy: GroupBy, key: number): string {
  if (groupBy === 'weekday') return WEEKDAY_LABELS[key];
  if (groupBy === 'month') return MONTH_LABELS[key - 1];
  return WEEK_OF_MONTH_LABELS[key];
}

function bucketOf(d: DcaDayPoint, groupBy: GroupBy): number {
  if (groupBy === 'weekday') return d.weekday;
  if (groupBy === 'month') return d.month;
  return d.weekOfMonth;
}

export function aggregateByBucket(
  series: DcaDayPoint[],
  groupBy: GroupBy,
  range: DateRangeKey,
  winWindow: ForwardWindow = 90,
): BucketStat[] {
  const filtered = filterByDateRange(series, range);
  const keys = groupBy === 'weekday'
    ? [0, 1, 2, 3, 4, 5, 6]
    : groupBy === 'month'
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : [1, 2, 3, 4, 5];

  return keys.map((key) => {
    const rows = filtered.filter((d) => bucketOf(d, groupBy) === key);
    const discounts = rows.map((d) => d.discount).filter((v): v is number => v != null);
    const fwd30  = rows.map((d) => d.fwd30).filter((v): v is number => v != null);
    const fwd90  = rows.map((d) => d.fwd90).filter((v): v is number => v != null);
    const fwd180 = rows.map((d) => d.fwd180).filter((v): v is number => v != null);
    const fwd365 = rows.map((d) => d.fwd365).filter((v): v is number => v != null);

    const winSample = rows
      .map((d) => (winWindow === 30 ? d.fwd30 : winWindow === 90 ? d.fwd90 : winWindow === 180 ? d.fwd180 : d.fwd365))
      .filter((v): v is number => v != null);

    return {
      key,
      label:          bucketKeyLabel(groupBy, key),
      avgDiscount:    average(discounts),
      medianDiscount: median(discounts),
      avgFwd30:       average(fwd30),
      avgFwd90:       average(fwd90),
      avgFwd180:      average(fwd180),
      avgFwd365:      average(fwd365),
      winRate:        winSample.length ? (winSample.filter((v) => v > 0).length / winSample.length) * 100 : null,
      occurrences:    rows.length,
    };
  });
}

// ─── Best-bucket selection ──────────────────────────────────────────────────
// "Better" direction depends on the metric: discount metrics favor lower
// (more negative — cheaper relative to trend); win rate and avg return favor higher.

export function metricValue(b: BucketStat, metric: Metric, winWindow: ForwardWindow): number | null {
  if (metric === 'avgDiscount') return b.avgDiscount;
  if (metric === 'medianDiscount') return b.medianDiscount;
  if (metric === 'winRate') return b.winRate;
  return winWindow === 30 ? b.avgFwd30 : winWindow === 90 ? b.avgFwd90 : winWindow === 180 ? b.avgFwd180 : b.avgFwd365;
}

export function pickBest(buckets: BucketStat[], metric: Metric, winWindow: ForwardWindow = 90): BucketStat | null {
  const withValue = buckets.filter((b) => metricValue(b, metric, winWindow) != null && b.occurrences >= 10);
  if (withValue.length === 0) return null;

  const better = metric === 'avgDiscount' || metric === 'medianDiscount'
    ? (a: number, b: number) => a < b // lower (more negative) discount is better
    : (a: number, b: number) => a > b; // higher win rate / return is better

  return withValue.reduce((best, cur) => {
    const bestVal = metricValue(best, metric, winWindow)!;
    const curVal  = metricValue(cur, metric, winWindow)!;
    return better(curVal, bestVal) ? cur : best;
  });
}
