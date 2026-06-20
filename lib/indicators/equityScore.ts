import type { WeeklyClose } from '@/lib/api/yahoo';
import type { YahooFundamentals } from '@/lib/api/yahoo';

// ── SMA helpers ──────────────────────────────────────────────────────────────

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

// ── Zone segmentation ─────────────────────────────────────────────────────────

export type EquityZone = 'green' | 'amber' | 'red' | 'none';

export type ZoneSegment = { zone: EquityZone; x1: number; x2: number };

function getZone(close: number, ma50w: number | null, ma200w: number | null): EquityZone {
  if (!ma50w) return 'none';
  if (close < ma50w) return 'green';
  if (!ma200w) return 'amber';
  if (close > ma200w * 1.4) return 'red';
  return 'amber';
}

function computeZoneSegments(points: EquityPoint[]): ZoneSegment[] {
  const segs: ZoneSegment[] = [];
  let cur: EquityZone | null = null;
  let x1 = 0;
  for (const p of points) {
    const z = p.zone;
    if (z !== cur) {
      if (cur !== null) segs.push({ zone: cur, x1, x2: p.ts });
      cur = z;
      x1  = p.ts;
    }
  }
  if (cur !== null && points.length > 0) {
    segs.push({ zone: cur, x1, x2: points[points.length - 1].ts });
  }
  return segs;
}

// ── Main point type ───────────────────────────────────────────────────────────

export type EquityPoint = {
  time:    string;
  ts:      number;
  close:   number;
  ma50w:   number | null;
  ma200w:  number | null;
  ath:     number;           // rolling ATH at this point
  zone:    EquityZone;
};

// ── Scores ───────────────────────────────────────────────────────────────────

export type TrendMetrics = {
  ma50w:             number | null;
  ma200w:            number | null;
  priceVs50w:        number | null;  // ratio  e.g. 1.18
  priceVs200w:       number | null;  // ratio
  vs50wPct:          number | null;  // percentile in own history
  vs200wPct:         number | null;
  ath:               number;
  drawdownFromAth:   number | null;  // negative pct e.g. -0.28
  drawdownPct:       number | null;  // percentile (0=deep drawdown, 100=near ATH)
  high52w:           number | null;
  low52w:            number | null;
  pctFrom52wHigh:    number | null;
  pctFrom52wLow:     number | null;
};

export type ValuationMetrics = {
  trailingPE:    number | null;
  forwardPE:     number | null;
  evToEbitda:    number | null;
  priceToSales:  number | null;
  priceToBook:   number | null;
  pegRatio:      number | null;
  fcfYield:      number | null;   // %
  fcfYieldPct:   number | null;   // score 0-100 (higher = more expensive / lower yield)
  pePct:         number | null;   // higher = more expensive
  evEbitdaPct:   number | null;
  psPct:         number | null;
};

export type QualityMetrics = {
  revenueGrowth:   number | null;   // 0-1
  earningsGrowth:  number | null;
  grossMargin:     number | null;
  operatingMargin: number | null;
  profitMargin:    number | null;
  returnOnEquity:  number | null;
  debtToFcf:       number | null;
  netDebt:         number | null;   // totalDebt - totalCash
};

export type ScoreResult = {
  trend:          number;  // 0-100 (higher = more extended above trend)
  trendLabel:     string;
  valuation:      number;  // 0-100 (higher = more expensive)
  valuationLabel: string;
  quality:        number;  // 0-100 (higher = better business)
  qualityLabel:   string;
  quadrant:       'opportunity' | 'value_trap' | 'expensive_quality' | 'avoid' | 'neutral';
  quadrantLabel:  string;
  quadrantColor:  string;
  summary:        string;
};

// ── Normalization helpers ─────────────────────────────────────────────────────

// Clamp a value to [0, 1] where low input = 0, high input = 1
function norm(v: number | null, low: number, high: number): number | null {
  if (v == null) return null;
  return Math.max(0, Math.min(1, (v - low) / (high - low)));
}

// Average non-null numbers
function avg(vals: (number | null)[]): number | null {
  const clean = vals.filter((v): v is number => v != null);
  if (!clean.length) return null;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

// ── Trend score (from price history) ─────────────────────────────────────────

function computeTrendScore(metrics: TrendMetrics): number {
  const components: (number | null)[] = [
    metrics.vs200wPct,                        // 40%
    metrics.vs50wPct,                         // 30%
    metrics.drawdownPct,                      // 30% (100 = near ATH = extended)
  ];
  const weights = [0.40, 0.30, 0.30];
  let score = 0, totalW = 0;
  for (let i = 0; i < components.length; i++) {
    if (components[i] != null) { score += (components[i] as number) * weights[i]; totalW += weights[i]; }
  }
  return totalW > 0 ? Math.round(score / totalW) : 50;
}

// ── Valuation score (from fundamentals) ──────────────────────────────────────
// Returns a 0-100 "expensiveness" score. Higher = pricier.

function peScore(pe: number | null): number | null {
  if (pe == null || pe < 0) return null;
  // < 10 = very cheap, 10-18 fair, 18-30 premium, 30-50 expensive, 50+ extreme
  return Math.round(Math.min(100, Math.max(0,
    pe < 10  ? (pe / 10) * 25 :
    pe < 18  ? 25 + ((pe - 10) / 8) * 25 :
    pe < 30  ? 50 + ((pe - 18) / 12) * 20 :
    pe < 50  ? 70 + ((pe - 30) / 20) * 20 :
               90 + Math.min(10, (pe - 50) / 10 * 10)
  )));
}

function evEbitdaScore(ev: number | null): number | null {
  if (ev == null || ev < 0) return null;
  // < 6 cheap, 6-12 fair, 12-20 premium, 20+ expensive
  return Math.round(Math.min(100, Math.max(0,
    ev < 6   ? (ev / 6) * 25 :
    ev < 12  ? 25 + ((ev - 6) / 6) * 25 :
    ev < 20  ? 50 + ((ev - 12) / 8) * 30 :
               80 + Math.min(20, (ev - 20) / 10 * 20)
  )));
}

function fcfYieldScore(yield_: number | null): number | null {
  if (yield_ == null) return null;
  // Higher yield = cheaper. Inverted.
  // > 8% = deeply cheap, 4-8 = fair, 2-4 = pricey, < 2 = expensive
  return Math.round(Math.min(100, Math.max(0,
    yield_ > 8 ? 5 :
    yield_ > 4 ? 5 + ((8 - yield_) / 4) * 25 :
    yield_ > 2 ? 30 + ((4 - yield_) / 2) * 30 :
    yield_ > 0 ? 60 + ((2 - yield_) / 2) * 30 :
                 90
  )));
}

function psScore(ps: number | null): number | null {
  if (ps == null || ps < 0) return null;
  // < 1 cheap, 1-5 fair, 5-15 premium, 15+ expensive
  return Math.round(Math.min(100, Math.max(0,
    ps < 1   ? ps * 15 :
    ps < 5   ? 15 + ((ps - 1) / 4) * 30 :
    ps < 15  ? 45 + ((ps - 5) / 10) * 35 :
               80 + Math.min(20, (ps - 15) / 5 * 20)
  )));
}

// ── Quality score (from fundamentals) ────────────────────────────────────────
// Returns 0-100, higher = better business quality.

function growthScore(g: number | null): number | null {
  if (g == null) return null;
  const pct = g * 100;
  // > 30% excellent, 15-30 good, 5-15 ok, 0-5 weak, <0 declining
  return Math.round(Math.min(100, Math.max(0,
    pct > 30  ? 90 + Math.min(10, (pct - 30) / 10 * 10) :
    pct > 15  ? 70 + ((pct - 15) / 15) * 20 :
    pct > 5   ? 50 + ((pct - 5) / 10) * 20 :
    pct > 0   ? 25 + (pct / 5) * 25 :
                Math.max(0, 25 + pct * 2)  // negative growth
  )));
}

function marginScore(m: number | null): number | null {
  if (m == null) return null;
  const pct = m * 100;
  // Operating margin: > 30% excellent, 15-30 good, 5-15 ok, <5 weak
  return Math.round(Math.min(100, Math.max(0,
    pct > 30  ? 90 :
    pct > 15  ? 60 + ((pct - 15) / 15) * 30 :
    pct > 5   ? 30 + ((pct - 5) / 10) * 30 :
    pct > 0   ? pct * 6 :
                0
  )));
}

function debtScore(netDebt: number | null, marketCap: number | null): number | null {
  if (netDebt == null || marketCap == null || marketCap === 0) return null;
  const ratio = netDebt / marketCap;
  // Net debt / market cap: < 0 (net cash) = excellent, 0-0.2 good, 0.2-0.5 ok, > 0.5 weak
  return Math.round(Math.min(100, Math.max(0,
    ratio < -0.1 ? 90 :
    ratio < 0    ? 80 + ((-ratio) / 0.1) * 10 :
    ratio < 0.2  ? 60 + ((0.2 - ratio) / 0.2) * 20 :
    ratio < 0.5  ? 30 + ((0.5 - ratio) / 0.3) * 30 :
                   Math.max(0, 30 - (ratio - 0.5) * 40)
  )));
}

// ── Main compute function ─────────────────────────────────────────────────────

export type EquityData = {
  ticker:          string;
  name:            string;
  sector:          string;
  type:            string;
  color:           string;
  points:          EquityPoint[];
  segments:        ZoneSegment[];
  trend:           TrendMetrics;
  valuation:       ValuationMetrics;
  quality:         QualityMetrics;
  scores:          ScoreResult;
  fundamentals:    YahooFundamentals;
};

export function buildEquityData(
  ticker: string,
  name: string,
  sector: string,
  type: string,
  color: string,
  closes: WeeklyClose[],
  fund: YahooFundamentals,
): EquityData {
  // ── Weekly chart points ────────────────────────────────────────────────
  const prices = closes.map((c) => c.close);
  let runningAth = 0;

  const points: EquityPoint[] = closes.map((c, i) => {
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

  // ── Trend metrics ──────────────────────────────────────────────────────
  const last  = points[points.length - 1];
  const ath   = last.ath;
  const price = last.close;

  // Compute historical ratios for percentile
  const pointsW50  = points.filter((p) => p.ma50w != null);
  const pointsW200 = points.filter((p) => p.ma200w != null);

  const ratios200 = pointsW200.map((p) => p.close / p.ma200w!);
  const ratios50  = pointsW50 .map((p) => p.close / p.ma50w!);
  const draws     = pointsW200.map((p) => p.close / p.ath);  // 0-1, 1 = at ATH

  const priceVs200 = last.ma200w != null ? price / last.ma200w : null;
  const priceVs50  = last.ma50w  != null ? price / last.ma50w  : null;
  const drawdown   = ath > 0 ? (price - ath) / ath : null;
  const drawRatio  = ath > 0 ? price / ath : null;

  const vs200Pct   = priceVs200 != null ? percentileOf(ratios200, priceVs200) : null;
  const vs50Pct    = priceVs50  != null ? percentileOf(ratios50,  priceVs50)  : null;
  const drawPct    = drawRatio   != null ? percentileOf(draws, drawRatio)      : null;  // high = near ATH

  const high52w = fund.high52w;
  const low52w  = fund.low52w;

  const trendMetrics: TrendMetrics = {
    ma50w:           last.ma50w,
    ma200w:          last.ma200w,
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
    pctFrom52wLow:   low52w  && price && low52w > 0 ? (price - low52w) / low52w : null,
  };

  // ── Valuation metrics ──────────────────────────────────────────────────
  const fcfYield = (fund.freeCashflow != null && fund.marketCap != null && fund.marketCap > 0)
    ? (fund.freeCashflow / fund.marketCap) * 100 : null;

  const fcfScore    = fcfYieldScore(fcfYield);
  const _peScore    = peScore(fund.forwardPE ?? fund.trailingPE);
  const _evScore    = evEbitdaScore(fund.evToEbitda);
  const _psScore    = psScore(fund.priceToSales);

  const valuationMetrics: ValuationMetrics = {
    trailingPE:   fund.trailingPE,
    forwardPE:    fund.forwardPE,
    evToEbitda:   fund.evToEbitda,
    priceToSales: fund.priceToSales,
    priceToBook:  fund.priceToBook,
    pegRatio:     fund.pegRatio,
    fcfYield,
    fcfYieldPct:  fcfScore,
    pePct:        _peScore,
    evEbitdaPct:  _evScore,
    psPct:        _psScore,
  };

  // ── Quality metrics ────────────────────────────────────────────────────
  const netDebt = (fund.totalDebt != null && fund.totalCash != null)
    ? fund.totalDebt - fund.totalCash : null;

  const qualityMetrics: QualityMetrics = {
    revenueGrowth:   fund.revenueGrowth,
    earningsGrowth:  fund.earningsGrowth,
    grossMargin:     fund.grossMargin,
    operatingMargin: fund.operatingMargin,
    profitMargin:    fund.profitMargin,
    returnOnEquity:  fund.returnOnEquity,
    debtToFcf:       (fund.totalDebt != null && fund.freeCashflow != null && fund.freeCashflow > 0)
                       ? fund.totalDebt / fund.freeCashflow : null,
    netDebt,
  };

  // ── Scores ────────────────────────────────────────────────────────────
  const trendScore = computeTrendScore(trendMetrics);

  const valuationComponents = [_peScore, _evScore, fcfScore, _psScore];
  const valuationScore = type === 'etf'
    ? trendScore  // for ETFs, valuation = same as trend (no fundamentals)
    : Math.round(avg(valuationComponents) ?? 50);

  const qualityComponents = [
    growthScore(fund.revenueGrowth),
    growthScore(fund.earningsGrowth),
    marginScore(fund.operatingMargin),
    debtScore(netDebt, fund.marketCap),
  ];
  const qualityScore = type === 'etf'
    ? 50
    : Math.round(avg(qualityComponents) ?? 50);

  // Quadrant: x = valuation (low=cheap, high=expensive), y = quality (low=bad, high=good)
  const isExpensive = valuationScore >= 55;
  const isHighQuality = qualityScore >= 55;
  let quadrant: ScoreResult['quadrant'];
  let quadrantLabel: string;
  let quadrantColor: string;

  if (!isExpensive && isHighQuality) {
    quadrant = 'opportunity'; quadrantLabel = 'Opportunity Zone'; quadrantColor = '#35D07F';
  } else if (!isExpensive && !isHighQuality) {
    quadrant = 'value_trap'; quadrantLabel = 'Value Trap Risk'; quadrantColor = '#E6B450';
  } else if (isExpensive && isHighQuality) {
    quadrant = 'expensive_quality'; quadrantLabel = 'Great Business · Wait'; quadrantColor = '#3B82F6';
  } else {
    quadrant = 'avoid'; quadrantLabel = 'Avoid'; quadrantColor = '#FF5C5C';
  }
  if (type === 'etf') { quadrant = 'neutral'; quadrantLabel = 'ETF — Trend Only'; quadrantColor = '#A9B4C0'; }

  const trendLabel =
    trendScore < 25 ? 'Deeply Depressed' :
    trendScore < 45 ? 'Below Trend' :
    trendScore < 55 ? 'Near Trend' :
    trendScore < 75 ? 'Extended' :
                       'Very Extended';

  const valuationLabel =
    type === 'etf' ? 'N/A – ETF' :
    valuationScore < 25 ? 'Deep Discount' :
    valuationScore < 45 ? 'Attractive' :
    valuationScore < 55 ? 'Fair Value' :
    valuationScore < 75 ? 'Premium' :
                           'Expensive';

  const qualityLabel =
    type === 'etf' ? 'N/A – ETF' :
    qualityScore < 30 ? 'Weak Business' :
    qualityScore < 50 ? 'Below Average' :
    qualityScore < 70 ? 'Solid' :
    qualityScore < 85 ? 'High Quality' :
                         'Excellent';

  const summary = buildSummary(type, trendLabel, valuationLabel, qualityLabel, quadrantLabel, trendMetrics);

  return {
    ticker, name, sector, type, color,
    points,
    segments,
    trend: trendMetrics,
    valuation: valuationMetrics,
    quality: qualityMetrics,
    scores: {
      trend: trendScore,
      trendLabel,
      valuation: valuationScore,
      valuationLabel,
      quality: qualityScore,
      qualityLabel,
      quadrant,
      quadrantLabel,
      quadrantColor,
      summary,
    },
    fundamentals: fund,
  };
}

function buildSummary(
  type: string,
  trend: string,
  valuation: string,
  quality: string,
  quadrant: string,
  metrics: TrendMetrics,
): string {
  if (type === 'etf') {
    const v200 = metrics.priceVs200w;
    const ext  = v200 != null ? (v200 > 1.15 ? 'extended above its 200W average' : v200 < 0.95 ? 'below its 200W average' : 'near its 200W average') : '';
    return `Trend is ${trend.toLowerCase()}${ext ? ', ' + ext : ''}. As an ETF, valuation and quality analysis are not applicable.`;
  }
  return `${trend} trend · ${valuation} valuation · ${quality} business. ${quadrant}.`;
}
