import type { PricePoint } from '@/lib/api/coinmetrics';

// ─────────────────────────────────────────────────────────────────────────────
// BTC Capital Age Structure — realized-cap HODL wave simulation
//
// No free or currently-connected data provider exposes true UTXO age-cohort
// data (CoinMetrics Community tier returns 403 on SplyAct1yr/2yr/3yr/CapRealUSD
// etc). This module models coin-age distribution and realized-cap-by-cohort
// from first principles instead of faking numbers out of thin air:
//   - Real BTC price history (CoinMetrics) drives everything.
//   - Real Bitcoin issuance schedule (halving epochs) seeds new supply.
//   - A synthetic weekly "respend probability" — higher when price runs hot
//     above its 52-week trend, lower in quiet/declining markets — governs how
//     much supply moves each week and re-enters the network at age zero,
//     carrying that week's price as its new cost basis.
// Coins that respend leave whatever age band they were in and re-enter at the
// current price; coins that don't move keep aging and keep their old cost
// basis. Realized cap per band is quantity × cost basis, so a coin that's
// aged 8 years but last moved when BTC was $200 contributes far less to
// realized cap than to raw supply share — the exact relationship the real
// metric is known for. This is a model, not a data feed; the page discloses
// that plainly.
// ─────────────────────────────────────────────────────────────────────────────

export type AgeBandKey =
  | '1d_1w' | '1w_1m' | '1m_3m' | '3m_6m' | '6m_12m'
  | '1y_2y' | '2y_3y' | '3y_5y' | '5y_7y' | '7y_10y' | '10y_plus';

export type AgeBandMeta = {
  key: AgeBandKey;
  label: string;
  minWeeks: number;
  color: string;
};

// Palette from spec — warm (young) to cool (old)
export const AGE_BANDS: AgeBandMeta[] = [
  { key: '1d_1w',    label: '1D–1W',   minWeeks: 0,   color: '#F85149' },
  { key: '1w_1m',    label: '1W–1M',   minWeeks: 1,   color: '#FF7B72' },
  { key: '1m_3m',    label: '1M–3M',   minWeeks: 5,   color: '#F7931A' },
  { key: '3m_6m',    label: '3M–6M',   minWeeks: 14,  color: '#EAB84D' },
  { key: '6m_12m',   label: '6M–12M',  minWeeks: 27,  color: '#B9D36A' },
  { key: '1y_2y',    label: '1Y–2Y',   minWeeks: 53,  color: '#35D07F' },
  { key: '2y_3y',    label: '2Y–3Y',   minWeeks: 105, color: '#22B8A7' },
  { key: '3y_5y',    label: '3Y–5Y',   minWeeks: 157, color: '#3B82F6' },
  { key: '5y_7y',    label: '5Y–7Y',   minWeeks: 261, color: '#6366F1' },
  { key: '7y_10y',   label: '7Y–10Y',  minWeeks: 365, color: '#8B5CF6' },
  { key: '10y_plus', label: '10Y+',    minWeeks: 521, color: '#A855F7' },
];

const STH_BANDS = new Set<AgeBandKey>(['1d_1w', '1w_1m', '1m_3m', '3m_6m']);

function bandForAgeWeeks(ageWeeks: number): AgeBandKey {
  for (let i = AGE_BANDS.length - 1; i >= 0; i--) {
    if (ageWeeks >= AGE_BANDS[i].minWeeks) return AGE_BANDS[i].key;
  }
  return AGE_BANDS[0].key;
}

function emptyBandRecord(): Record<AgeBandKey, number> {
  const r = {} as Record<AgeBandKey, number>;
  for (const b of AGE_BANDS) r[b.key] = 0;
  return r;
}

export type CapitalAgeWeekSnapshot = {
  time: string;                 // ISO date (start of week)
  ts: number;                   // epoch ms
  price: number;
  totalSupplyBtc: number;
  totalRealizedCapUsd: number;
  ageBandRealizedCapPct: Record<AgeBandKey, number>;
  ageBandSupplyPct: Record<AgeBandKey, number>;
  vintageYearSupplyPct: Record<string, number>;
  sthRealizedCapPct: number;
  lthRealizedCapPct: number;
  dormancyYears: number;
};

// ─── Bitcoin issuance schedule (real) ─────────────────────────────────────────

const GENESIS_TS = Date.UTC(2009, 0, 3);
const WEEK_MS = 7 * 86_400_000;
const BLOCKS_PER_WEEK = 1008; // ~10 min block time

const HALVINGS: { at: number; reward: number }[] = [
  { at: Date.UTC(2009, 0, 3),   reward: 50 },
  { at: Date.UTC(2012, 10, 28), reward: 25 },
  { at: Date.UTC(2016, 6, 9),   reward: 12.5 },
  { at: Date.UTC(2020, 4, 11),  reward: 6.25 },
  { at: Date.UTC(2024, 3, 20),  reward: 3.125 },
  { at: Date.UTC(2028, 3, 17),  reward: 1.5625 },
];

function blockRewardAt(ts: number): number {
  let reward = 50;
  for (const h of HALVINGS) {
    if (ts >= h.at) reward = h.reward;
  }
  return reward;
}

// ─── Simulation ────────────────────────────────────────────────────────────

const RESPEND_DECAY_WEEKS = 170; // ~3.3yr falloff in move probability with age
const BASE_WEEKLY_RESPEND = 0.014;
const MOMENTUM_SENSITIVITY = 0.010;
const MIN_WEEKLY_RESPEND = 0.006;
const MAX_WEEKLY_RESPEND = 0.024;
const MOMENTUM_LOOKBACK_WEEKS = 104;

function dampenMomentum(m: number): number {
  return Math.sign(m) * Math.sqrt(Math.abs(m));
}

export function buildCapitalAgeSeries(pricePoints: PricePoint[], asOfMs: number = Date.now()): CapitalAgeWeekSnapshot[] {
  if (pricePoints.length === 0) return [];
  const sorted = [...pricePoints].sort((a, b) => a.time.localeCompare(b.time));

  const totalWeeks = Math.floor((asOfMs - GENESIS_TS) / WEEK_MS);
  if (totalWeeks < 1) return [];

  // Pre-pass: weekly price via forward-fill from real daily data
  const weekPrice = new Float64Array(totalWeeks + 1);
  {
    let cursor = 0;
    const firstPrice = sorted[0].price;
    for (let t = 0; t <= totalWeeks; t++) {
      const ts = GENESIS_TS + t * WEEK_MS;
      const dateStr = new Date(ts).toISOString().slice(0, 10);
      while (cursor < sorted.length - 1 && sorted[cursor + 1].time <= dateStr) cursor++;
      weekPrice[t] = sorted[cursor].time <= dateStr ? sorted[cursor].price : firstPrice;
    }
  }

  // Rolling 52-week SMA for momentum, O(1) amortized
  const sma = new Float64Array(totalWeeks + 1);
  {
    let runningSum = 0;
    for (let t = 0; t <= totalWeeks; t++) {
      runningSum += weekPrice[t];
      const windowStart = t - MOMENTUM_LOOKBACK_WEEKS + 1;
      if (windowStart > 0) runningSum -= weekPrice[windowStart - 1];
      const windowLen = Math.min(t + 1, MOMENTUM_LOOKBACK_WEEKS);
      sma[t] = runningSum / windowLen;
    }
  }

  const qty = new Float64Array(totalWeeks + 1);
  const costBasis = new Float64Array(totalWeeks + 1);

  const snapshots: CapitalAgeWeekSnapshot[] = [];
  let totalSupplyAccum = 0;
  let totalRealizedCapUsd = 0;

  for (let t = 0; t <= totalWeeks; t++) {
    const ts = GENESIS_TS + t * WEEK_MS;
    const price = weekPrice[t];
    const momentumRaw = sma[t] > 0 ? price / sma[t] - 1 : 0;
    const momentum = dampenMomentum(momentumRaw);

    const respendRate = Math.min(
      MAX_WEEKLY_RESPEND,
      Math.max(MIN_WEEKLY_RESPEND, BASE_WEEKLY_RESPEND + MOMENTUM_SENSITIVITY * momentum)
    );

    const existingSupply = totalSupplyAccum; // supply that existed before this week's issuance
    const targetMovedQty = respendRate * existingSupply;

    // Pass A: total move-weight across existing buckets (older = exponentially less likely to move)
    let totalWeight = 0;
    for (let w = 0; w < t; w++) {
      const q = qty[w];
      if (q <= 0) continue;
      const age = t - w;
      totalWeight += q * Math.exp(-age / RESPEND_DECAY_WEEKS);
    }
    const scale = totalWeight > 0 ? targetMovedQty / totalWeight : 0;

    // Pass B: apply moves, accumulate band/vintage/dormancy aggregates for THIS week
    const ageBandSupply = emptyBandRecord();
    const ageBandRealizedCap = emptyBandRecord();
    const vintageYearSupply: Record<string, number> = {};
    let actualMovedQty = 0;
    let realizedCapRemoved = 0;
    let ageWeightedSum = 0;

    for (let w = 0; w < t; w++) {
      const q = qty[w];
      if (q <= 0) continue;
      const age = t - w;
      const weight = Math.exp(-age / RESPEND_DECAY_WEEKS);
      const moved = Math.min(q * weight * scale, q * 0.95);
      const remaining = q - moved;

      qty[w] = remaining;
      actualMovedQty += moved;
      realizedCapRemoved += moved * costBasis[w];

      if (remaining > 0) {
        const band = bandForAgeWeeks(age);
        ageBandSupply[band] += remaining;
        ageBandRealizedCap[band] += remaining * costBasis[w];

        const vintageYear = new Date(GENESIS_TS + w * WEEK_MS).getUTCFullYear().toString();
        vintageYearSupply[vintageYear] = (vintageYearSupply[vintageYear] ?? 0) + remaining;
        ageWeightedSum += remaining * age;
      }
    }

    // This week's fresh bucket: respent coins + new issuance, both carry today's price
    const issuance = blockRewardAt(ts) * BLOCKS_PER_WEEK;
    qty[t] = actualMovedQty + issuance;
    costBasis[t] = price;

    ageBandSupply['1d_1w'] += qty[t];
    ageBandRealizedCap['1d_1w'] += qty[t] * price;
    const thisYear = new Date(ts).getUTCFullYear().toString();
    vintageYearSupply[thisYear] = (vintageYearSupply[thisYear] ?? 0) + qty[t];

    totalSupplyAccum = existingSupply + issuance;
    totalRealizedCapUsd = totalRealizedCapUsd - realizedCapRemoved + qty[t] * price;

    const totalSupplyBtc = totalSupplyAccum;
    const ageBandSupplyPct = emptyBandRecord();
    const ageBandRealizedCapPct = emptyBandRecord();
    for (const b of AGE_BANDS) {
      ageBandSupplyPct[b.key] = totalSupplyBtc > 0 ? (ageBandSupply[b.key] / totalSupplyBtc) * 100 : 0;
      ageBandRealizedCapPct[b.key] = totalRealizedCapUsd > 0 ? (ageBandRealizedCap[b.key] / totalRealizedCapUsd) * 100 : 0;
    }
    const vintageYearSupplyPct: Record<string, number> = {};
    for (const [y, v] of Object.entries(vintageYearSupply)) {
      vintageYearSupplyPct[y] = totalSupplyBtc > 0 ? (v / totalSupplyBtc) * 100 : 0;
    }

    let sthRealizedCapPct = 0;
    let lthRealizedCapPct = 0;
    for (const b of AGE_BANDS) {
      if (STH_BANDS.has(b.key)) sthRealizedCapPct += ageBandRealizedCapPct[b.key];
      else lthRealizedCapPct += ageBandRealizedCapPct[b.key];
    }

    snapshots.push({
      time: new Date(ts).toISOString().slice(0, 10),
      ts,
      price,
      totalSupplyBtc,
      totalRealizedCapUsd,
      ageBandRealizedCapPct,
      ageBandSupplyPct,
      vintageYearSupplyPct,
      sthRealizedCapPct,
      lthRealizedCapPct,
      dormancyYears: totalSupplyBtc > 0 ? (ageWeightedSum / totalSupplyBtc) / 52 : 0,
    });
  }

  return snapshots;
}

// ─── Derived metrics ─────────────────────────────────────────────────────────

function snapshotWeeksAgo(series: CapitalAgeWeekSnapshot[], weeksAgo: number): CapitalAgeWeekSnapshot | null {
  const idx = series.length - 1 - weeksAgo;
  return idx >= 0 ? series[idx] : null;
}

export function get200WeekMA(series: CapitalAgeWeekSnapshot[]): number | null {
  if (series.length === 0) return null;
  const window = series.slice(-200);
  const sum = window.reduce((acc, s) => acc + s.price, 0);
  return sum / window.length;
}

export type SthRegime = { label: string; color: string; description: string };

export function getSthRegime(sthPct: number): SthRegime {
  if (sthPct < 30) {
    return { label: 'Low Speculative Participation', color: '#3B82F6', description: 'Short-term capital has drained from the network — historically a quiet, accumulation-leaning environment.' };
  }
  if (sthPct < 40) {
    return { label: 'Normal Participation', color: '#35D07F', description: 'Short-term holder capital share sits within its typical neutral range.' };
  }
  if (sthPct < 55) {
    return { label: 'Rising Speculative Participation', color: '#E6B450', description: 'Short-term capital is building — more of the network is being valued at recent, not historical, prices.' };
  }
  return { label: 'High STH Capital Concentration', color: '#FF5C5C', description: 'A large share of realized cap now sits in short-term hands — historically consistent with late-cycle or elevated distribution risk.' };
}

export type HolderTrendRegime = { label: string; color: string; description: string };

export function getHolderTrendRegime(sthChange90d: number, lthChange90d: number): HolderTrendRegime {
  if (sthChange90d < -0.5 && lthChange90d > 0.5) {
    return { label: 'Accumulation / Conviction Strengthening', color: '#3B82F6', description: 'STH share falling while LTH share rises — capital is aging and supply is becoming more patient.' };
  }
  if (sthChange90d > 0.5 && lthChange90d < -0.5) {
    return { label: 'Distribution / Speculation Increasing', color: '#FF5C5C', description: 'STH share rising while LTH share falls — older capital is on the move and speculative participation is building.' };
  }
  return { label: 'Neutral Rotation', color: '#E6B450', description: 'No strong aging or distribution trend — short- and long-term holder capital shares are roughly stable.' };
}

export type CapitalAgingScore = {
  score: number;
  label: string;
  color: string;
  breakdown: { label: string; value: number; weight: number }[];
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerpScore(v: number, loVal: number, loScore: number, hiVal: number, hiScore: number): number {
  if (loVal === hiVal) return loScore;
  const t = clamp((v - loVal) / (hiVal - loVal), 0, 1);
  return loScore + t * (hiScore - loScore);
}

export function getCapitalAgingScore(series: CapitalAgeWeekSnapshot[]): CapitalAgingScore | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1];
  const prior90d = snapshotWeeksAgo(series, 13);
  const sthChange90d = prior90d ? last.sthRealizedCapPct - prior90d.sthRealizedCapPct : 0;
  const lthChange90d = prior90d ? last.lthRealizedCapPct - prior90d.lthRealizedCapPct : 0;
  const ma200w = get200WeekMA(series);
  const priceVsMa = ma200w ? last.price / ma200w : 1;

  const sthComponent = lerpScore(last.sthRealizedCapPct, 15, 100, 55, 0);
  const sthChangeComponent = lerpScore(sthChange90d, 10, 0, -10, 100);
  const lthComponent = lerpScore(last.lthRealizedCapPct, 45, 0, 85, 100);
  const lthChangeComponent = lerpScore(lthChange90d, -10, 0, 10, 100);
  const priceComponent = lerpScore(priceVsMa, 0.8, 100, 2.5, 0);

  const breakdown = [
    { label: 'STH Realized-Cap Share (40%)', value: sthComponent, weight: 0.40 },
    { label: '90D STH Share Change (20%)', value: sthChangeComponent, weight: 0.20 },
    { label: 'LTH Realized-Cap Share (20%)', value: lthComponent, weight: 0.20 },
    { label: '90D LTH Share Change (10%)', value: lthChangeComponent, weight: 0.10 },
    { label: 'Price vs 200W MA (10%)', value: priceComponent, weight: 0.10 },
  ];

  const score = Math.round(breakdown.reduce((acc, b) => acc + b.value * b.weight, 0));

  const label =
    score < 25 ? 'High Speculation' :
    score < 50 ? 'Neutral Rotation' :
    score < 75 ? 'Capital Aging' :
    'Deep Holder Conviction';

  const color =
    score < 25 ? '#FF5C5C' :
    score < 50 ? '#E6B450' :
    score < 75 ? '#35D07F' :
    '#3B82F6';

  return { score, label, color, breakdown };
}

export type DormancyClockData = {
  years: number;
  trend90d: number;
  regime: 'Rising' | 'Falling' | 'Flat';
  description: string;
};

export function getDormancyClock(series: CapitalAgeWeekSnapshot[]): DormancyClockData | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1];
  const prior90d = snapshotWeeksAgo(series, 13);
  const trend90d = prior90d ? last.dormancyYears - prior90d.dormancyYears : 0;
  const regime: DormancyClockData['regime'] = trend90d > 0.03 ? 'Rising' : trend90d < -0.03 ? 'Falling' : 'Flat';
  const description = regime === 'Rising'
    ? 'Network supply is aging — coins are sitting still, consistent with holder conviction.'
    : regime === 'Falling'
    ? 'Older coins are moving — supply is getting younger, consistent with distribution or rotation.'
    : 'Average coin age is roughly stable.';
  return { years: last.dormancyYears, trend90d, regime, description };
}

export type AgePyramidRow = {
  key: AgeBandKey;
  label: string;
  color: string;
  supplyPct: number;
  realizedCapPct: number;
};

export function getAgePyramid(series: CapitalAgeWeekSnapshot[]): AgePyramidRow[] {
  if (series.length === 0) return [];
  const last = series[series.length - 1];
  return AGE_BANDS.map((b) => ({
    key: b.key,
    label: b.label,
    color: b.color,
    supplyPct: last.ageBandSupplyPct[b.key],
    realizedCapPct: last.ageBandRealizedCapPct[b.key],
  })).reverse(); // oldest first, matches pyramid convention (10Y+ on top)
}

export function getVintageYears(series: CapitalAgeWeekSnapshot[]): string[] {
  if (series.length === 0) return [];
  const last = series[series.length - 1];
  return Object.keys(last.vintageYearSupplyPct).sort((a, b) => Number(a) - Number(b));
}

// Warm(recent) -> cool(old) color scale for vintage-year bands, matching the age-band convention
export function vintageColorForYear(year: string, allYears: string[]): string {
  const idx = allYears.indexOf(year);
  const n = Math.max(1, allYears.length - 1);
  const t = idx >= 0 ? idx / n : 1; // 0 = oldest, 1 = most recent
  // interpolate hue from 265 (violet, old) -> 15 (orange/red, recent)
  const hue = 265 - t * 250;
  const sat = 65;
  const light = 52;
  return `hsl(${hue.toFixed(0)}, ${sat}%, ${light}%)`;
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v.toFixed(digits)}%`;
}

export function fmtPp(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(2)} pp`;
}

export function fmtYears(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return '—';
  return `${v.toFixed(2)}y`;
}

// ─── Chart-ready flat data shapes ────────────────────────────────────────────

export type HodlWaveChartPoint = { ts: number; time: string; price: number; dormancyYears: number } & Record<AgeBandKey, number>;

export function toHodlWaveChartData(series: CapitalAgeWeekSnapshot[]): HodlWaveChartPoint[] {
  return series.map((s) => {
    const point = { ts: s.ts, time: s.time, price: s.price, dormancyYears: s.dormancyYears } as HodlWaveChartPoint;
    for (const b of AGE_BANDS) point[b.key] = s.ageBandRealizedCapPct[b.key];
    return point;
  });
}

export type VintageChartPoint = { ts: number; time: string; price: number } & { [year: string]: number | string };

export function toVintageChartData(series: CapitalAgeWeekSnapshot[], years: string[]): VintageChartPoint[] {
  return series.map((s) => {
    const point: VintageChartPoint = { ts: s.ts, time: s.time, price: s.price };
    for (const y of years) point[y] = s.vintageYearSupplyPct[y] ?? 0;
    return point;
  });
}
