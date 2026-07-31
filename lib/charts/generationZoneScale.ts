import type { WeeklyPoint, ZoneEpisode } from '@/lib/indicators/generationZone';

// Axis and range helpers shared by the live chart and the share card. They live
// here rather than in either component so the two cannot drift: a share card
// whose axes disagree with the chart it claims to be a picture of is worse than
// no share card.

export const RANGES = [
  { key: '2Y', years: 2 },
  { key: '4Y', years: 4 },
  { key: '8Y', years: 8 },
  { key: 'All', years: null },
] as const;

export type RangeKey = (typeof RANGES)[number]['key'];

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export function filterByRange(points: WeeklyPoint[], range: RangeKey): WeeklyPoint[] {
  const years = RANGES.find((r) => r.key === range)?.years;
  if (!years || !points.length) return points;
  const cutoff = points[points.length - 1].ts - years * YEAR_MS;
  const out = points.filter((p) => p.ts >= cutoff);
  return out.length ? out : points;
}

/** Episodes that overlap the visible window, so a shaded band never hangs off the axis. */
export function filterEpisodes(episodes: ZoneEpisode[], from: number, to: number): ZoneEpisode[] {
  return episodes.filter((ep) => {
    const s = Date.parse(ep.start + 'T00:00:00Z');
    const e = Date.parse(ep.end + 'T00:00:00Z');
    return e >= from && s <= to;
  });
}

/** Clamp a band to the window, otherwise Recharts drops an area that starts off-domain. */
export function episodeBounds(ep: ZoneEpisode, from: number, to: number): [number, number] {
  const s = Math.max(Date.parse(ep.start + 'T00:00:00Z'), from);
  const e = Math.min(Date.parse(ep.end + 'T00:00:00Z'), to);
  return [s, e];
}

/**
 * Ticks derived from the series rather than hardcoded, for the reason recorded in
 * lib/indicators/historicalScore.ts: a tick outside the domain silently shifts
 * every label by a year. Short windows get half-year ticks, since a 2Y view
 * carrying two labels is not an axis.
 */
export function xTicks(points: Pick<WeeklyPoint, 'ts'>[]): number[] {
  if (!points.length) return [];
  const from = points[0].ts;
  const to = points[points.length - 1].ts;
  const spanYears = (to - from) / YEAR_MS;
  const firstYear = new Date(from).getUTCFullYear();
  const lastYear = new Date(to).getUTCFullYear();

  const out: number[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    if (spanYears <= 3) {
      out.push(Date.UTC(y, 0, 1), Date.UTC(y, 6, 1));
    } else {
      out.push(Date.UTC(y, 0, 1));
    }
  }
  return out.filter((t) => t >= from && t <= to);
}

export function fmtXTick(ts: number, spanYears: number): string {
  const d = new Date(ts);
  if (spanYears > 3) return d.getUTCFullYear().toString();
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} '${String(d.getUTCFullYear()).slice(2)}`;
}

export function spanYears(points: Pick<WeeklyPoint, 'ts'>[]): number {
  if (points.length < 2) return 0;
  return (points[points.length - 1].ts - points[0].ts) / YEAR_MS;
}

/** Log-scale price domain covering price and both averages, with a little headroom. */
export function priceDomain(points: WeeklyPoint[]): [number, number] {
  const values: number[] = [];
  for (const p of points) {
    if (p.close > 0) values.push(p.close);
    if (p.ema200 != null && p.ema200 > 0) values.push(p.ema200);
    if (p.smma230 != null && p.smma230 > 0) values.push(p.smma230);
  }
  if (!values.length) return [1, 10];
  return [Math.max(0.01, Math.min(...values) * 0.8), Math.max(...values) * 1.35];
}

/**
 * Log ticks thinned to the span. A decade-only set leaves a two-year window with
 * a single label; the full 1/2/3/5/7 set turns full history into thirty.
 */
export function logTicks(min: number, max: number): number[] {
  const decades = Math.log10(max / min);
  const mantissas = decades > 3 ? [1] : decades > 1.5 ? [1, 3] : [1, 2, 3, 5, 7];
  const out: number[] = [];
  for (let e = -2; e <= 7; e++) {
    for (const m of mantissas) {
      const v = m * 10 ** e;
      if (v >= min && v <= max) out.push(v);
    }
  }
  return out;
}

export function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1) return `$${v.toFixed(0)}`;
  return `$${v}`;
}
