import type { PricePoint, RiskFactorPoint } from '@/lib/api/coinmetrics';
import { plFair } from '@/lib/indicators/powerLaw';
import { getCyclePosition } from '@/lib/indicators/valuationCycle';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FactorKey = 'ma200w' | 'powerLaw' | 'realizedPrice' | 'mvrvZ' | 'piCycle' | 'cyclePosition';
export type ModelKey  = FactorKey | 'composite';

export const FACTOR_KEYS: FactorKey[] = ['ma200w', 'powerLaw', 'realizedPrice', 'mvrvZ', 'piCycle', 'cyclePosition'];

// Percentile-ranked factors (all but cyclePosition, which is already bounded 0-1
// and cyclical, so it's used directly rather than re-ranked against its own history).
const RANKED_KEYS: Exclude<FactorKey, 'cyclePosition'>[] = ['ma200w', 'powerLaw', 'realizedPrice', 'mvrvZ', 'piCycle'];

export const RISK_WEIGHTS: Record<FactorKey, number> = {
  ma200w:        0.25,
  powerLaw:      0.20,
  realizedPrice: 0.20,
  mvrvZ:         0.15,
  piCycle:       0.10,
  cyclePosition: 0.10,
};

export const FACTOR_LABELS: Record<FactorKey, string> = {
  ma200w:        '200-Week MA',
  powerLaw:      'Power Law (Log Regression)',
  realizedPrice: 'Realized Price',
  mvrvZ:         'MVRV Z-Score',
  piCycle:       'Pi Cycle Top',
  cyclePosition: 'Cycle Position',
};

export const MODEL_LABELS: Record<ModelKey, string> = {
  ...FACTOR_LABELS,
  composite: 'Composite (Skyline Risk Score)',
};

export type RiskPoint = {
  time:          string;
  ts:            number;
  price:         number;
  factorScores:  Record<FactorKey, number | null>; // each 0-1
  composite:     number | null;                    // 0-1, weighted blend
  confidencePct: number;                            // 0-100, share of weight with data
};

export type RiskZone = 'accumulation' | 'value' | 'neutral' | 'caution' | 'distribution';

export const ZONE_META: Record<RiskZone, { label: string; color: string }> = {
  accumulation: { label: 'Accumulation',  color: '#1E3A8A' },
  value:        { label: 'Value',         color: '#3B82F6' },
  neutral:      { label: 'Neutral',       color: '#35D07F' },
  caution:      { label: 'Caution',       color: '#E6B450' },
  distribution: { label: 'Distribution',  color: '#F85149' },
};

export function riskZone(score: number): RiskZone {
  if (score < 0.2) return 'accumulation';
  if (score < 0.4) return 'value';
  if (score < 0.6) return 'neutral';
  if (score < 0.8) return 'caution';
  return 'distribution';
}

// Continuous 6-stop gradient: deep blue -> blue -> green -> yellow -> orange -> red
const COLOR_STOPS: { at: number; rgb: [number, number, number] }[] = [
  { at: 0.0, rgb: [30, 58, 138] },   // deep blue
  { at: 0.2, rgb: [59, 130, 246] },  // blue
  { at: 0.4, rgb: [53, 208, 127] },  // green
  { at: 0.6, rgb: [230, 180, 80] },  // yellow
  { at: 0.8, rgb: [245, 158, 11] },  // orange
  { at: 1.0, rgb: [248, 81, 73] },   // red
];

export function riskColor(score: number): string {
  const s = Math.max(0, Math.min(1, score));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i], b = COLOR_STOPS[i + 1];
    if (s >= a.at && s <= b.at) {
      const f = b.at === a.at ? 0 : (s - a.at) / (b.at - a.at);
      const r = Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * f);
      const g = Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * f);
      const bch = Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * f);
      return `rgb(${r}, ${g}, ${bch})`;
    }
  }
  return `rgb(${COLOR_STOPS.at(-1)!.rgb.join(', ')})`;
}

// ─── Educational reference tables (not financial advice) ────────────────────

export const ALLOCATION_TABLE: { maxScore: number; label: string }[] = [
  { maxScore: 0.10, label: 'Very Aggressive' },
  { maxScore: 0.20, label: 'Aggressive' },
  { maxScore: 0.30, label: 'Normal DCA' },
  { maxScore: 0.40, label: 'Small DCA' },
  { maxScore: 0.50, label: 'Neutral' },
  { maxScore: 0.60, label: 'Reduce Buying' },
  { maxScore: 0.70, label: 'Begin Profit Taking' },
  { maxScore: 0.80, label: 'Heavy Profit Taking' },
  { maxScore: Infinity, label: 'Extreme Risk' },
];

export function allocationFor(score: number): string {
  return ALLOCATION_TABLE.find((a) => score < a.maxScore)?.label ?? 'Extreme Risk';
}

export const HISTORICAL_EVENTS: { date: string; label: string }[] = [
  { date: '2015-01-14', label: '2014–15 Bear Bottom' },
  { date: '2017-12-17', label: 'Cycle 2 Top' },
  { date: '2018-12-15', label: 'Capitulation Bottom' },
  { date: '2020-03-12', label: 'COVID Crash' },
  { date: '2021-11-10', label: 'Cycle 3 Top' },
  { date: '2022-11-21', label: 'FTX Capitulation Bottom' },
  { date: '2024-03-14', label: 'New All-Time High' },
];

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

function isNum(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v);
}

function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// Fraction (0-1) of `sorted` at or below `value`, via binary search — O(log n).
export function percentileRank(sorted: number[], value: number): number {
  if (sorted.length === 0) return 0.5;
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= value) lo = mid + 1; else hi = mid;
  }
  return lo / sorted.length;
}

function blend(factorScores: Record<FactorKey, number | null>): { composite: number | null; confidencePct: number } {
  let weighted = 0, totalWeight = 0;
  for (const k of FACTOR_KEYS) {
    const v = factorScores[k];
    if (v == null) continue;
    weighted += v * RISK_WEIGHTS[k];
    totalWeight += RISK_WEIGHTS[k];
  }
  if (totalWeight === 0) return { composite: null, confidencePct: 0 };
  return { composite: weighted / totalWeight, confidencePct: totalWeight * 100 };
}

// ─── Calculator basis — "today's" fixed reference points ────────────────────
// The Price<->Risk Calculator asks "what would risk be if spot price were X
// *right now*?" — moving-average bases (200WMA, Pi Cycle's 111/350DMA) are
// exactly delta-adjusted for the hypothetical price (SMA is linear, so swapping
// today's actual price for a hypothetical one only shifts the average by
// (hypothetical - actual) / period). Power Law fair value is price-independent.
// Realized price, realized cap, and the MVRV-Z stdev are on-chain cost-basis
// figures that don't move with a same-day spot-price hypothetical, so they're
// held fixed at today's actual values; only the numerator (price, or
// price x today's approximate supply) responds to the slider.

export type RiskBasis = {
  todayActualPrice:   number;
  ma200w:             number | null;
  ma111:              number | null;
  ma350:              number | null;
  fair:               number;
  realizedPriceBasis: number | null;
  supplyApprox:       number | null;
  realizedCapBasis:   number | null;
  mvrvZStdev:         number | null;
  cyclePositionFrac:  number | null;
};

export type RiskDistributions = Record<Exclude<FactorKey, 'cyclePosition'>, number[]>;

function adjustedSMA(actualSMA: number | null, period: number, todayActual: number, hypothetical: number): number | null {
  if (actualSMA == null) return null;
  return actualSMA + (hypothetical - todayActual) / period;
}

export function computeRiskForPrice(
  price: number,
  basis: RiskBasis,
  distributions: RiskDistributions,
): { factorScores: Record<FactorKey, number | null>; composite: number | null; confidencePct: number } {
  const ma200wHyp = adjustedSMA(basis.ma200w, 1400, basis.todayActualPrice, price);
  const ma111Hyp  = adjustedSMA(basis.ma111,  111,  basis.todayActualPrice, price);
  const ma350Hyp  = adjustedSMA(basis.ma350,  350,  basis.todayActualPrice, price);

  const rawMa200w   = ma200wHyp != null && ma200wHyp > 0 ? price / ma200wHyp : null;
  const rawPowerLaw = basis.fair > 0 ? price / basis.fair : null;
  const rawRealized = basis.realizedPriceBasis != null && basis.realizedPriceBasis > 0 ? price / basis.realizedPriceBasis : null;
  const rawMvrvZ    = basis.supplyApprox != null && basis.realizedCapBasis != null && basis.mvrvZStdev
    ? (price * basis.supplyApprox - basis.realizedCapBasis) / basis.mvrvZStdev
    : null;
  const rawPiCycle  = ma111Hyp != null && ma350Hyp != null && ma350Hyp > 0 ? ma111Hyp / (2 * ma350Hyp) : null;

  const factorScores: Record<FactorKey, number | null> = {
    ma200w:        rawMa200w   != null ? percentileRank(distributions.ma200w, rawMa200w)     : null,
    powerLaw:      rawPowerLaw != null ? percentileRank(distributions.powerLaw, rawPowerLaw) : null,
    realizedPrice: rawRealized != null ? percentileRank(distributions.realizedPrice, rawRealized) : null,
    mvrvZ:         rawMvrvZ    != null ? percentileRank(distributions.mvrvZ, rawMvrvZ)       : null,
    piCycle:       rawPiCycle  != null ? percentileRank(distributions.piCycle, rawPiCycle)   : null,
    cyclePosition: basis.cyclePositionFrac,
  };

  const { composite, confidencePct } = blend(factorScores);
  return { factorScores, composite, confidencePct };
}

// ─── Full-history series + context ───────────────────────────────────────────

export type RiskContext = {
  series:        RiskPoint[];
  weeklySeries:  RiskPoint[];
  distributions: RiskDistributions;
  basis:         RiskBasis;
};

export function buildRiskContext(prices: PricePoint[], riskFactorData: RiskFactorPoint[]): RiskContext {
  const closes  = prices.map((p) => p.price);
  const ma200w  = smaArr(closes, 1400);
  const ma111   = smaArr(closes, 111);
  const ma350   = smaArr(closes, 350);
  const riskByDate = new Map(riskFactorData.map((d) => [d.time, d]));

  const rawMa200w:   (number | null)[] = [];
  const rawPowerLaw: (number | null)[] = [];
  const rawPiCycle:  (number | null)[] = [];
  const rawRealized: (number | null)[] = [];
  const marketCapDiff: (number | null)[] = [];
  const cyclePosFrac: (number | null)[] = [];
  const mvrvZDiffSample: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const p  = closes[i];
    const ts = new Date(prices[i].time + 'T00:00:00Z').getTime();

    rawMa200w.push(ma200w[i] != null && ma200w[i]! > 0 ? p / ma200w[i]! : null);
    rawPowerLaw.push(p > 0 ? p / plFair(ts) : null);
    rawPiCycle.push(ma111[i] != null && ma350[i] != null && ma350[i]! > 0 ? ma111[i]! / (2 * ma350[i]!) : null);

    const rf = riskByDate.get(prices[i].time);
    if (rf) {
      rawRealized.push(rf.mvrv);
      const realizedCap = rf.marketCap / rf.mvrv;
      const diff = rf.marketCap - realizedCap;
      marketCapDiff.push(diff);
      mvrvZDiffSample.push(diff);
    } else {
      rawRealized.push(null);
      marketCapDiff.push(null);
    }

    const pos = getCyclePosition(ts);
    cyclePosFrac.push(pos ? pos.cycleProgressPct / 100 : null);
  }

  const mvrvZStdevAll = stdev(mvrvZDiffSample);
  const rawMvrvZ: (number | null)[] = marketCapDiff.map((d) => (d != null && mvrvZStdevAll > 0 ? d / mvrvZStdevAll : null));

  const distributions: RiskDistributions = {
    ma200w:        rawMa200w.filter(isNum).sort((a, b) => a - b),
    powerLaw:      rawPowerLaw.filter(isNum).sort((a, b) => a - b),
    realizedPrice: rawRealized.filter(isNum).sort((a, b) => a - b),
    mvrvZ:         rawMvrvZ.filter(isNum).sort((a, b) => a - b),
    piCycle:       rawPiCycle.filter(isNum).sort((a, b) => a - b),
  };

  const series: RiskPoint[] = prices.map((p, i) => {
    const factorScores: Record<FactorKey, number | null> = {
      ma200w:        rawMa200w[i]   != null ? percentileRank(distributions.ma200w, rawMa200w[i]!)     : null,
      powerLaw:      rawPowerLaw[i] != null ? percentileRank(distributions.powerLaw, rawPowerLaw[i]!) : null,
      realizedPrice: rawRealized[i] != null ? percentileRank(distributions.realizedPrice, rawRealized[i]!) : null,
      mvrvZ:         rawMvrvZ[i]    != null ? percentileRank(distributions.mvrvZ, rawMvrvZ[i]!)       : null,
      piCycle:       rawPiCycle[i]  != null ? percentileRank(distributions.piCycle, rawPiCycle[i]!)   : null,
      cyclePosition: cyclePosFrac[i],
    };
    const { composite, confidencePct } = blend(factorScores);
    return {
      time: p.time,
      ts:   new Date(p.time + 'T00:00:00Z').getTime(),
      price: closes[i],
      factorScores,
      composite,
      confidencePct,
    };
  });

  const weeklySeries = series.filter((_, i) => i % 7 === 0 || i === series.length - 1);

  const lastIdx = prices.length - 1;
  const lastRf  = riskFactorData.length > 0 ? riskFactorData[riskFactorData.length - 1] : null;
  const lastRealizedCap   = lastRf ? lastRf.marketCap / lastRf.mvrv : null;
  const lastSupplyApprox  = lastRf ? lastRf.marketCap / lastRf.price : null;
  const lastRealizedPrice = lastRf ? lastRf.price / lastRf.mvrv : null;
  const lastTs = new Date(prices[lastIdx].time + 'T00:00:00Z').getTime();
  const lastPos = getCyclePosition(lastTs);

  const basis: RiskBasis = {
    todayActualPrice:   closes[lastIdx],
    ma200w:             ma200w[lastIdx],
    ma111:              ma111[lastIdx],
    ma350:              ma350[lastIdx],
    fair:               plFair(lastTs),
    realizedPriceBasis: lastRealizedPrice,
    supplyApprox:       lastSupplyApprox,
    realizedCapBasis:   lastRealizedCap,
    mvrvZStdev:         mvrvZStdevAll > 0 ? mvrvZStdevAll : null,
    cyclePositionFrac:  lastPos ? lastPos.cycleProgressPct / 100 : null,
  };

  return { series, weeklySeries, distributions, basis };
}
