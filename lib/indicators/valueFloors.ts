import type { ValuationDataPoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValueFloorPoint = {
  time:          string;
  ts:            number;
  btcClose:      number;
  realizedPrice: number | null;   // price / MVRV (free on-chain cost basis)
  deltaPrice:    number | null;   // (realized cap − average cap) / supply
  ma200w:        number | null;   // 1400-day SMA (200-week MA)
  ma2y:          number | null;   // 730-day SMA
  powerLaw:      number;          // log regression central value
  powerLawLow:   number;          // log regression lower support (×0.5)
  mvrv:          number;          // MVRV ratio
  mvrvBandLow:   number | null;   // realized price × 5th-percentile MVRV
  mvrvBandHigh:  number | null;   // realized price × 95th-percentile MVRV
  ath:           number;          // rolling ATH to this date
  drawdownPct:   number;          // % drawdown from ATH
  vsRealized:    number | null;   // price / realizedPrice ratio
  vsDelta:       number | null;   // price / deltaPrice ratio
  vs200w:        number | null;   // price / 200W MA ratio
  vs2y:          number | null;   // price / 2Y MA ratio
  vsPowerLaw:    number;          // price / power law ratio
};

export type FloorZone = 'deep-value' | 'approaching' | 'neutral' | 'expansion' | 'extended';

export type FloorProximityScore = {
  score:      number;    // 0–100: 100 = historically deepest value territory
  zone:       FloorZone;
  label:      string;
  color:      string;
  description: string;
  breakdown: {
    realizedFloor: number;   // 0–100 component score
    deltaFloor:    number;
    ma200wFloor:   number;
    ma2yFloor:     number;
    drawdown:      number;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GENESIS_MS = new Date('2009-01-03').getTime();

function powerLawCentral(dateStr: string): number {
  const days = (new Date(dateStr + 'T00:00:00').getTime() - GENESIS_MS) / 86_400_000;
  return Math.pow(10, 5.8 * Math.log10(Math.max(days, 1)) - 17.3);
}

function smaArr(values: number[], period: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= period) sum -= values[i - period];
    return i >= period - 1 ? sum / period : null;
  });
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function percentileScore(current: number, history: number[]): number {
  if (history.length < 30) return 50;
  const below = history.filter((v) => v <= current).length;
  return Math.round((below / history.length) * 100);
}

// Nearest-rank percentile of an unsorted sample.
function percentileOf(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(Math.round((p / 100) * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
}

// ─── Build floor series ───────────────────────────────────────────────────────

// `raw` must start at the beginning of CoinMetrics history (2010-07-18). Delta Price
// depends on Average Cap — the cumulative mean of market cap since day one — so a
// later start date silently biases the whole series.
export function buildValueFloorPoints(raw: ValuationDataPoint[]): ValueFloorPoint[] {
  const sorted = [...raw].sort((a, b) => a.time.localeCompare(b.time));

  const prices = sorted.map((d) => d.price);
  const ma200w = smaArr(prices, 1400);   // 200-week MA
  const ma2y   = smaArr(prices, 730);    // 2-year MA

  // MVRV band multiples are fixed reference levels taken from the full-history
  // distribution, so the same two multiples apply to every date on the chart.
  const mvrvLow  = percentileOf(sorted.map((d) => d.mvrv), 5);
  const mvrvHigh = percentileOf(sorted.map((d) => d.mvrv), 95);

  let runningATH = 0;
  let cumMarketCap = 0;

  return sorted.map((d, i) => {
    const realizedCap   = d.marketCap / d.mvrv;
    const realizedPrice = realizedCap / d.splyCur;

    // Average Cap = mean market cap over every day of history to date.
    cumMarketCap += d.marketCap;
    const averageCap = cumMarketCap / (i + 1);
    // Delta Price = (realized cap − average cap) / supply. Negative early in history
    // when average cap still exceeds realized cap; treated as unavailable there.
    const rawDelta   = (realizedCap - averageCap) / d.splyCur;
    const deltaPrice = rawDelta > 0 ? rawDelta : null;

    const central = powerLawCentral(d.time);

    runningATH = Math.max(runningATH, d.price);
    const drawdownPct = runningATH > 0 ? ((d.price - runningATH) / runningATH) * 100 : 0;

    return {
      time:          d.time,
      ts:            new Date(d.time + 'T00:00:00').getTime(),
      btcClose:      d.price,
      realizedPrice: realizedPrice > 0 ? realizedPrice : null,
      deltaPrice,
      ma200w:        ma200w[i],
      ma2y:          ma2y[i],
      powerLaw:      central,
      powerLawLow:   central * 0.5,
      mvrv:          d.mvrv,
      mvrvBandLow:   mvrvLow  != null && realizedPrice > 0 ? realizedPrice * mvrvLow  : null,
      mvrvBandHigh:  mvrvHigh != null && realizedPrice > 0 ? realizedPrice * mvrvHigh : null,
      ath:           runningATH,
      drawdownPct,
      vsRealized:    realizedPrice > 0 ? d.price / realizedPrice : null,
      vsDelta:       deltaPrice != null ? d.price / deltaPrice : null,
      vs200w:        ma200w[i] != null && ma200w[i]! > 0 ? d.price / ma200w[i]! : null,
      vs2y:          ma2y[i]   != null && ma2y[i]!   > 0 ? d.price / ma2y[i]!   : null,
      vsPowerLaw:    central > 0 ? d.price / central : 1,
    };
  });
}

// MVRV band multiples, recovered from the built series for display in the UI.
export function getMvrvBandMultiples(points: ValueFloorPoint[]): { low: number; high: number } | null {
  const p = [...points].reverse().find((x) => x.realizedPrice != null && x.mvrvBandLow != null && x.mvrvBandHigh != null);
  if (!p) return null;
  return { low: p.mvrvBandLow! / p.realizedPrice!, high: p.mvrvBandHigh! / p.realizedPrice! };
}

// ─── Floor Proximity Score ────────────────────────────────────────────────────
// 0 = price far above all value floors
// 100 = price at or below historical value floor levels

export function getFloorProximityScore(points: ValueFloorPoint[]): FloorProximityScore {
  if (points.length < 400) {
    return {
      score: 50, zone: 'neutral', label: 'Insufficient Data', color: '#6B7280',
      description: 'Need 400+ days of history.',
      breakdown: { realizedFloor: 50, deltaFloor: 50, ma200wFloor: 50, ma2yFloor: 50, drawdown: 50 },
    };
  }

  const last = points[points.length - 1];

  // Build full-history distributions for percentile scoring
  const realizedRatios: number[] = [];
  const deltaRatios:    number[] = [];
  const ma200wRatios:   number[] = [];
  const ma2yRatios:     number[] = [];
  const drawdowns:      number[] = [];

  for (const p of points) {
    if (p.vsRealized != null) realizedRatios.push(p.vsRealized);
    if (p.vsDelta    != null) deltaRatios.push(p.vsDelta);
    if (p.vs200w     != null) ma200wRatios.push(p.vs200w);
    if (p.vs2y       != null) ma2yRatios.push(p.vs2y);
    drawdowns.push(p.drawdownPct);
  }

  // For price/floor ratios: LOWER ratio = closer to floor = higher proximity score.
  // percentileScore(1/ratio, ...) inverts so that lower price-to-floor = higher score.
  const realizedFloor = last.vsRealized != null
    ? 100 - percentileScore(last.vsRealized, realizedRatios)
    : 50;
  const deltaFloor = last.vsDelta != null
    ? 100 - percentileScore(last.vsDelta, deltaRatios)
    : 50;
  const ma200wFloor = last.vs200w != null
    ? 100 - percentileScore(last.vs200w, ma200wRatios)
    : 50;
  const ma2yFloor = last.vs2y != null
    ? 100 - percentileScore(last.vs2y, ma2yRatios)
    : 50;
  // For drawdown: DEEPER drawdown = closer to floor = higher proximity score.
  // percentileScore of negative drawdown: more negative values = lower percentile → invert.
  const drawdown = last.drawdownPct < -0.1
    ? 100 - percentileScore(last.drawdownPct, drawdowns)
    : 0;

  // Delta Price shares top billing with realized price: across 2015, 2018 and 2022 it
  // sat closer to the eventual low than any other free-tier model on this page.
  const score = clamp(
    Math.round(
      realizedFloor * 0.30 + deltaFloor * 0.30 + ma200wFloor * 0.15 + ma2yFloor * 0.10 + drawdown * 0.15,
    ),
    0, 100,
  );

  let zone: FloorZone, label: string, color: string, description: string;

  if (score >= 80) {
    zone = 'deep-value';
    label = 'Historical Bottom Zone';
    color = '#3B82F6';
    description = 'Price is near or below multiple historical value floors. This zone has historically aligned with major bear-market lows and long-term accumulation conditions.';
  } else if (score >= 60) {
    zone = 'approaching';
    label = 'Approaching Deep Value';
    color = '#35D07F';
    description = 'Price is moving toward historical value reference levels. Not yet at extreme floor territory but meaningful discount to long-term averages.';
  } else if (score >= 40) {
    zone = 'neutral';
    label = 'Pullback / Neutral';
    color = '#6B7280';
    description = 'Price is in a normal range relative to value floors. No strong floor proximity or extreme extension signal.';
  } else if (score >= 20) {
    zone = 'expansion';
    label = 'Normal Expansion';
    color = '#E6B450';
    description = 'Price is comfortably above long-term value floors, consistent with an ongoing bull market expansion phase.';
  } else {
    zone = 'extended';
    label = 'Far Above Value Floors';
    color = '#FF5C5C';
    description = 'Price is historically extended above all value reference lines. This zone has preceded past cycle peaks.';
  }

  return {
    score, zone, label, color, description,
    breakdown: { realizedFloor, deltaFloor, ma200wFloor, ma2yFloor, drawdown },
  };
}

// ─── Cycle-low reference table (computed, not hardcoded) ─────────────────────

export type CycleLowRow = {
  label:         string;
  date:          string;
  btcClose:      number;
  realizedPrice: number | null;
  deltaPrice:    number | null;
  vsRealizedPct: number | null;
  vsDeltaPct:    number | null;
  isCurrent:     boolean;
};

// Reads the real series at each historical low rather than quoting fixed numbers, so
// the table can never drift out of sync with the chart above it.
export function buildCycleLowRows(points: ValueFloorPoint[]): CycleLowRow[] {
  const byTime = new Map(points.map((p) => [p.time, p]));

  const pick = (time: string): ValueFloorPoint | null => {
    // Walk forward up to a week in case the exact date is missing from the series.
    for (let i = 0; i < 7; i++) {
      const d = new Date(time + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + i);
      const hit = byTime.get(d.toISOString().slice(0, 10));
      if (hit) return hit;
    }
    return null;
  };

  const toRow = (label: string, p: ValueFloorPoint, isCurrent: boolean): CycleLowRow => ({
    label,
    date: p.time,
    btcClose:      p.btcClose,
    realizedPrice: p.realizedPrice,
    deltaPrice:    p.deltaPrice,
    vsRealizedPct: p.vsRealized != null ? (p.vsRealized - 1) * 100 : null,
    vsDeltaPct:    p.vsDelta    != null ? (p.vsDelta    - 1) * 100 : null,
    isCurrent,
  });

  const rows = FLOOR_EVENTS
    .map((e) => {
      const p = pick(e.time);
      return p ? toRow(e.label, p, false) : null;
    })
    .filter((r): r is CycleLowRow => r != null);

  const last = points[points.length - 1];
  if (last) rows.push(toRow('Current', last, true));

  return rows;
}

// ─── Key historical floor-touch events ───────────────────────────────────────

export type FloorEvent = {
  time:    string;
  label:   string;
  color:   string;
  btcPrice: string;
};

export const FLOOR_EVENTS: FloorEvent[] = [
  { time: '2011-11-18', label: '2011 Cycle Low', color: '#35D07F', btcPrice: '$2.0' },
  { time: '2015-01-14', label: '2015 Bear Low',  color: '#35D07F', btcPrice: '$175' },
  { time: '2018-12-15', label: '2018 Bear Low',  color: '#35D07F', btcPrice: '$3,122' },
  { time: '2020-03-13', label: 'COVID Crash',    color: '#F2B84B', btcPrice: '$3,858' },
  { time: '2022-11-21', label: '2022 Bear Low',  color: '#35D07F', btcPrice: '$15,476' },
];

export const HALVINGS_CVDD = [
  { ts: new Date('2012-11-28').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19').getTime(), label: 'H4' },
];
