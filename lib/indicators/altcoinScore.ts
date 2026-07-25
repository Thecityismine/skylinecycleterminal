import type { CoinWeeklyClose } from '@/lib/api/coingecko';
import type { AltcoinSnapshot } from '@/lib/api/altcoinSnapshot';

// Trend-only scoring engine for altcoins — same SMA/percentile/ATH approach as
// lib/indicators/equityScore.ts, but self-contained since there's no equity-style
// valuation (P/E, EV/EBITDA) or quality (margins, ROE) data for tokens.

// ── SMA / percentile helpers ────────────────────────────────────────────────

function sma(prices: number[], i: number, window: number): number | null {
  if (i < window - 1) return null;
  let sum = 0;
  for (let j = i - window + 1; j <= i; j++) sum += prices[j];
  return sum / window;
}

function percentileOf(values: number[], current: number): number {
  if (!values.length) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  let below = 0;
  for (const v of sorted) if (v <= current) below++;
  return Math.round((below / sorted.length) * 100);
}

// ── Zone segmentation (drives the chart's background shading) ──────────────

export type AltcoinZone = 'green' | 'amber' | 'red' | 'none';
export type AltcoinZoneSegment = { zone: AltcoinZone; x1: number; x2: number };

function getZone(close: number, ma50w: number | null, ma200w: number | null): AltcoinZone {
  if (!ma50w) return 'none';
  if (close < ma50w) return 'green';
  if (!ma200w) return 'amber';
  if (close > ma200w * 1.4) return 'red';
  return 'amber';
}

function computeZoneSegments(points: AltcoinPoint[]): AltcoinZoneSegment[] {
  const segs: AltcoinZoneSegment[] = [];
  let cur: AltcoinZone | null = null;
  let x1 = 0;
  for (const p of points) {
    if (p.zone !== cur) {
      if (cur !== null) segs.push({ zone: cur, x1, x2: p.ts });
      cur = p.zone;
      x1  = p.ts;
    }
  }
  if (cur !== null && points.length > 0) {
    segs.push({ zone: cur, x1, x2: points[points.length - 1].ts });
  }
  return segs;
}

// ── Point / trend types ─────────────────────────────────────────────────────

export type AltcoinPoint = {
  time:   string;
  ts:     number;
  close:  number;
  ma50w:  number | null;
  ma200w: number | null;
  ath:    number;   // rolling ATH at this point
  zone:   AltcoinZone;
};

export type AltcoinTrendMetrics = {
  ma50w:           number | null;
  ma200w:          number | null;
  priceVs50w:      number | null;
  priceVs200w:     number | null;
  vs50wPct:        number | null;
  vs200wPct:       number | null;
  ath:             number;
  drawdownFromAth: number | null;
  drawdownPct:     number | null;
  high52w:         number | null;
  low52w:          number | null;
  pctFrom52wHigh:  number | null;
  pctFrom52wLow:   number | null;
};

export type AltcoinScoreResult = {
  trend:      number;   // 0-100, higher = more extended above trend
  trendLabel: string;
};

export type AltcoinData = {
  id:        string;
  symbol:    string;
  name:      string;
  sector:    string;
  group:     string;
  color:     string;
  points:    AltcoinPoint[];
  segments:  AltcoinZoneSegment[];
  trend:     AltcoinTrendMetrics;
  scores:    AltcoinScoreResult;
  snapshot:  AltcoinSnapshot;
};

function computeTrendScore(m: AltcoinTrendMetrics): number {
  const components: (number | null)[] = [m.vs200wPct, m.vs50wPct, m.drawdownPct];
  const weights = [0.40, 0.30, 0.30];
  let score = 0, totalW = 0;
  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    if (c != null) { score += c * weights[i]; totalW += weights[i]; }
  }
  return totalW > 0 ? Math.round(score / totalW) : 50;
}

// ── Main compute function ────────────────────────────────────────────────────

export function buildAltcoinData(
  id: string,
  symbol: string,
  name: string,
  sector: string,
  group: string,
  color: string,
  closes: CoinWeeklyClose[],
  snapshot: AltcoinSnapshot,
): AltcoinData {
  const prices = closes.map((c) => c.close);
  let runningAth = 0;

  const points: AltcoinPoint[] = closes.map((c, i) => {
    runningAth = Math.max(runningAth, c.close);
    const ma50  = sma(prices, i, 50);
    const ma200 = sma(prices, i, 200);
    return {
      time:   c.time,
      ts:     c.ts,
      close:  c.close,
      ma50w:  ma50,
      ma200w: ma200,
      ath:    runningAth,
      zone:   getZone(c.close, ma50, ma200),
    };
  });

  const segments = computeZoneSegments(points);

  const last  = points[points.length - 1];
  const ath   = last?.ath ?? 0;
  const price = last?.close ?? 0;

  const pointsW50  = points.filter((p) => p.ma50w != null);
  const pointsW200 = points.filter((p) => p.ma200w != null);

  const ratios200 = pointsW200.map((p) => p.close / p.ma200w!);
  const ratios50  = pointsW50.map((p) => p.close / p.ma50w!);
  const draws     = pointsW200.map((p) => p.close / p.ath);

  const priceVs200 = last?.ma200w != null ? price / last.ma200w : null;
  const priceVs50  = last?.ma50w  != null ? price / last.ma50w  : null;
  const drawdown   = ath > 0 ? (price - ath) / ath : null;
  const drawRatio  = ath > 0 ? price / ath : null;

  const vs200Pct = priceVs200 != null ? percentileOf(ratios200, priceVs200) : null;
  const vs50Pct  = priceVs50  != null ? percentileOf(ratios50, priceVs50)   : null;
  const drawPct  = drawRatio  != null ? percentileOf(draws, drawRatio)      : null;

  // 52w high/low computed directly from the weekly series (~52 most recent points)
  const trailing52 = points.slice(-52).map((p) => p.close);
  const high52w = trailing52.length ? Math.max(...trailing52) : null;
  const low52w  = trailing52.length ? Math.min(...trailing52) : null;

  const trend: AltcoinTrendMetrics = {
    ma50w:           last?.ma50w ?? null,
    ma200w:          last?.ma200w ?? null,
    priceVs50w:      priceVs50,
    priceVs200w:     priceVs200,
    vs50wPct:        vs50Pct,
    vs200wPct:       vs200Pct,
    ath,
    drawdownFromAth: drawdown,
    drawdownPct:     drawPct,
    high52w,
    low52w,
    pctFrom52wHigh:  high52w && price ? (price - high52w) / high52w : null,
    pctFrom52wLow:   low52w && price && low52w > 0 ? (price - low52w) / low52w : null,
  };

  const trendScore = computeTrendScore(trend);
  const trendLabel =
    trendScore < 25 ? 'Deeply Depressed' :
    trendScore < 45 ? 'Below Trend' :
    trendScore < 55 ? 'Near Trend' :
    trendScore < 75 ? 'Extended' :
                       'Very Extended';

  return {
    id, symbol, name, sector, group, color,
    points,
    segments,
    trend,
    scores: { trend: trendScore, trendLabel },
    snapshot,
  };
}
