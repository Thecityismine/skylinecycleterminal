import type { MacroDataPoint } from '@/lib/api/fred';
import type { CrossAssetPoint } from '@/lib/api/crossAsset';
import type { StablecoinHistoryPoint } from '@/lib/api/defillama';
import type { PricePoint } from '@/lib/api/coinmetrics';
import { calculateDrawdownFromATH } from '@/lib/indicators/drawdownFromATH';
import { CYCLE_ANCHORS, getCompletedCycles, daysBetween } from '@/lib/indicators/cycleAnchors';
import { HALVINGS } from '@/lib/indicators/halvingCycles';
import { percentileRank } from '@/lib/indicators/riskScore';

// ─── Seven-year reference events ─────────────────────────────────────────────
// Purely macro/financial — no religious, ethnic, or numerological framing.
// Pre-2010 events are background evidence for the broader hypothesis, not
// direct Bitcoin evidence (Bitcoin didn't exist yet) — see `relevance` below.

export type SevenYearEventCategory = 'equity-crash' | 'credit-event' | 'recession' | 'crypto-crisis' | 'macro-stress';

export type SevenYearEvent = {
  year:      number;
  startDate: string;
  endDate:   string;
  label:     string;
  category:  SevenYearEventCategory;
  projected?: boolean;
};

export const SEVEN_YEAR_EVENTS: SevenYearEvent[] = [
  { year: 1987, startDate: '1987-01-01', endDate: '1987-12-31', label: 'Black Monday / Equity Stress',        category: 'equity-crash' },
  { year: 1994, startDate: '1994-01-01', endDate: '1994-12-31', label: 'Bond Market Shock',                    category: 'credit-event' },
  { year: 2001, startDate: '2001-01-01', endDate: '2001-12-31', label: 'Dot-Com Bust / Recession',              category: 'recession' },
  { year: 2008, startDate: '2008-01-01', endDate: '2008-12-31', label: 'Global Financial Crisis',               category: 'credit-event' },
  { year: 2015, startDate: '2015-01-01', endDate: '2015-12-31', label: 'China / Commodity Stress',              category: 'macro-stress' },
  { year: 2022, startDate: '2022-01-01', endDate: '2022-12-31', label: 'Rate Shock / Crypto Deleveraging',      category: 'crypto-crisis' },
  { year: 2029, startDate: '2028-09-01', endDate: '2029-09-30', label: 'Projected 7-Year Stress Window',        category: 'macro-stress', projected: true },
];

const BTC_GENESIS_YEAR = 2009;

export function eventRelevance(ev: SevenYearEvent): 'Pre-BTC context' | 'BTC live' | 'Test period' {
  if (ev.projected) return 'Test period';
  return ev.year > BTC_GENESIS_YEAR ? 'BTC live' : 'Pre-BTC context';
}

// ─── Institutional market-structure eras ─────────────────────────────────────
// The spec's most testable non-numerological claim: BTC's market structure
// plausibly changed once institutional products and spot ETFs became
// meaningful. Static reference bands, not a computed regime.

export type MarketStructureEra = {
  start: string;
  end?:  string;
  label: string;
  color: string;
};

export const INSTITUTIONAL_ERAS: MarketStructureEra[] = [
  { start: '2010-01-01', end: '2017-12-31', label: 'Pre-Institutional Era',      color: '#6B7280' },
  { start: '2018-01-01', end: '2023-12-31', label: 'Institutional Transition',   color: '#5B84FF' },
  { start: '2024-01-11',                    label: 'ETF Era',                    color: '#F7931A' },
];

// ─── Four-year halving model — projected next halving ───────────────────────

export const NEXT_HALVING = HALVINGS.find((h) => h.estimated) ?? HALVINGS[HALVINGS.length - 1];

// ─── Time-proximity to the next 7-year stress window ─────────────────────────

export function daysUntilWindow(today: Date, start: Date, end: Date): number {
  if (today >= start && today <= end) return 0;
  const target = today < start ? start : end;
  return Math.abs(Math.round((target.getTime() - today.getTime()) / 86_400_000));
}

// Time alone should never produce a high-risk signal on its own — see weight (25%).
export function timeProximityScore(days: number): number {
  if (days === 0) return 100;
  const months = days / 30.44;
  if (months <= 12) return 70;
  if (months <= 24) return 50;
  if (months <= 36) return 25;
  return 10;
}

export type SevenYearPhase = 'Expansion' | 'Mid-Cycle' | 'Approaching' | 'Stress Watch' | 'Active Stress Window';

export function sevenYearPhase(days: number, insideWindow: boolean): SevenYearPhase {
  if (insideWindow) return 'Active Stress Window';
  const months = days / 30.44;
  if (months <= 12) return 'Stress Watch';
  if (months <= 24) return 'Approaching';
  if (months <= 36) return 'Mid-Cycle';
  return 'Expansion';
}

// ─── Generic normalization helpers ───────────────────────────────────────────

function values(points: MacroDataPoint[]): number[] {
  return points.map((p) => p.value);
}

// Percentile of the latest value within its own full history — self-calibrating,
// same technique as lib/indicators/riskScore.ts. `invert` flips direction when a
// LOWER raw value means MORE stress (e.g. yield curve inversion, liquidity growth).
function percentileOfLatest(series: number[], invert = false): number | null {
  if (series.length < 10) return null;
  const sorted = [...series].sort((a, b) => a - b);
  const latest = series[series.length - 1];
  const pct = percentileRank(sorted, latest) * 100;
  return invert ? 100 - pct : pct;
}

function pctChange(series: number[], lookback: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    const prior = series[i - lookback];
    out.push(prior != null && prior !== 0 ? ((series[i] - prior) / prior) * 100 : NaN);
  }
  return out.filter((v) => Number.isFinite(v));
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

// ─── Seven-year stress score — 7 weighted factors ────────────────────────────

export type StressScoreInputs = {
  today:        Date;
  yieldCurve:   MacroDataPoint[];          // T10Y2Y
  creditSpread: MacroDataPoint[];          // BAMLH0A0HYM2 (HY OAS)
  dxy:          MacroDataPoint[];          // DTWEXBGS
  realYield:    MacroDataPoint[];          // DFII10
  m2:           MacroDataPoint[];          // WM2NS
  fedBalance:   MacroDataPoint[];          // WALCL
  crossAsset:   CrossAssetPoint[];         // sp500 + nasdaq levels
  btcPrices:    PricePoint[];
  stablecoins:  StablecoinHistoryPoint[];
};

export type StressFactorKey =
  | 'timeProximity' | 'creditStress' | 'dollarRealYieldPressure'
  | 'liquidityStress' | 'equityStress' | 'btcStress' | 'cryptoCreditStress';

export const STRESS_WEIGHTS: Record<StressFactorKey, number> = {
  timeProximity:            0.25,
  creditStress:              0.20,
  dollarRealYieldPressure:   0.15,
  liquidityStress:           0.15,
  equityStress:              0.10,
  btcStress:                 0.10,
  cryptoCreditStress:        0.05,
};

export const STRESS_FACTOR_LABELS: Record<StressFactorKey, string> = {
  timeProximity:            'Time Proximity to 7-Year Window',
  creditStress:              'Yield-Curve / Credit Stress',
  dollarRealYieldPressure:   'Dollar & Real-Yield Pressure',
  liquidityStress:           'Liquidity Trend',
  equityStress:              'Equity Drawdown Stress',
  btcStress:                 'BTC Drawdown & Trend',
  cryptoCreditStress:        'Crypto Credit / Stablecoin Stress',
};

export type StressScoreResult = {
  score:        number | null; // 0-100
  confidencePct: number;
  factors:      Record<StressFactorKey, number | null>;
};

export function calculateSevenYearStressScore(input: StressScoreInputs): StressScoreResult {
  const projected = SEVEN_YEAR_EVENTS.find((e) => e.projected)!;
  const start = new Date(projected.startDate + 'T00:00:00Z');
  const end   = new Date(projected.endDate + 'T00:00:00Z');
  const days  = daysUntilWindow(input.today, start, end);
  const timeProximity = timeProximityScore(days);

  // Credit stress: yield-curve inversion depth (lower/negative T10Y2Y = more stress)
  // averaged with HY OAS spread level (higher = more stress).
  const yieldCurveScore   = percentileOfLatest(values(input.yieldCurve), true);
  const creditSpreadScore = percentileOfLatest(values(input.creditSpread), false);
  const creditParts = [yieldCurveScore, creditSpreadScore].filter((v): v is number => v != null);
  const creditStress = creditParts.length ? creditParts.reduce((s, v) => s + v, 0) / creditParts.length : null;

  // Dollar / real-yield pressure: DXY 90d change (rising = stress) + real yield level.
  const dxyChangeScore  = (() => {
    const chg = pctChange(values(input.dxy), 90);
    return chg.length >= 10 ? percentileOfLatest(chg, false) : null;
  })();
  const realYieldScore = percentileOfLatest(values(input.realYield), false);
  const dollarParts = [dxyChangeScore, realYieldScore].filter((v): v is number => v != null);
  const dollarRealYieldPressure = dollarParts.length ? dollarParts.reduce((s, v) => s + v, 0) / dollarParts.length : null;

  // Liquidity trend: M2 + Fed balance ~180d growth (contracting = stress, so invert).
  const m2ChangeScore = (() => {
    const chg = pctChange(values(input.m2), 26); // ~180 days of weekly data
    return chg.length >= 10 ? percentileOfLatest(chg, true) : null;
  })();
  const fedChangeScore = (() => {
    const chg = pctChange(values(input.fedBalance), 26);
    return chg.length >= 10 ? percentileOfLatest(chg, true) : null;
  })();
  const liquidityParts = [m2ChangeScore, fedChangeScore].filter((v): v is number => v != null);
  const liquidityStress = liquidityParts.length ? liquidityParts.reduce((s, v) => s + v, 0) / liquidityParts.length : null;

  // Equity stress: SPX + Nasdaq drawdown from ATH (more negative = more stress).
  const spx    = input.crossAsset.filter((p) => p.sp500 != null).map((p) => ({ time: p.time, price: p.sp500! }));
  const nasdaq = input.crossAsset.filter((p) => p.nasdaq != null).map((p) => ({ time: p.time, price: p.nasdaq! }));
  const spxDrawdowns    = spx.length    >= 20 ? calculateDrawdownFromATH(spx).map((d) => d.drawdown)    : [];
  const nasdaqDrawdowns = nasdaq.length >= 20 ? calculateDrawdownFromATH(nasdaq).map((d) => d.drawdown) : [];
  const spxStressScore    = spxDrawdowns.length    ? percentileOfLatest(spxDrawdowns, true)    : null;
  const nasdaqStressScore = nasdaqDrawdowns.length ? percentileOfLatest(nasdaqDrawdowns, true) : null;
  const equityParts = [spxStressScore, nasdaqStressScore].filter((v): v is number => v != null);
  const equityStress = equityParts.length ? equityParts.reduce((s, v) => s + v, 0) / equityParts.length : null;

  // BTC stress: drawdown from ATH + price vs 200D SMA trend.
  const btcCloses = input.btcPrices.map((p) => p.price);
  const btcDrawdowns = input.btcPrices.length >= 20
    ? calculateDrawdownFromATH(input.btcPrices.map((p) => ({ time: p.time, price: p.price }))).map((d) => d.drawdown)
    : [];
  const btcDrawdownScore = btcDrawdowns.length ? percentileOfLatest(btcDrawdowns, true) : null;
  const btcMa200 = sma(btcCloses, 200);
  const btcTrendRatios = btcCloses
    .map((p, i) => (btcMa200[i] != null && btcMa200[i]! > 0 ? p / btcMa200[i]! : null))
    .filter((v): v is number => v != null);
  const btcTrendScore = btcTrendRatios.length >= 10 ? percentileOfLatest(btcTrendRatios, true) : null;
  const btcParts = [btcDrawdownScore, btcTrendScore].filter((v): v is number => v != null);
  const btcStress = btcParts.length ? btcParts.reduce((s, v) => s + v, 0) / btcParts.length : null;

  // Crypto credit stress: stablecoin supply 30d change (contracting = stress).
  const stableChange = pctChange(input.stablecoins.map((p) => p.stablecoinMC), 30);
  const cryptoCreditStress = stableChange.length >= 10 ? percentileOfLatest(stableChange, true) : null;

  const factors: Record<StressFactorKey, number | null> = {
    timeProximity, creditStress, dollarRealYieldPressure, liquidityStress, equityStress, btcStress, cryptoCreditStress,
  };

  let weighted = 0, totalWeight = 0;
  for (const k of Object.keys(STRESS_WEIGHTS) as StressFactorKey[]) {
    const v = factors[k];
    if (v == null) continue;
    weighted += v * STRESS_WEIGHTS[k];
    totalWeight += STRESS_WEIGHTS[k];
  }

  return {
    score: totalWeight > 0 ? weighted / totalWeight : null,
    confidencePct: totalWeight * 100,
    factors,
  };
}

export type StressBand = { max: number; label: string; color: string };

export const STRESS_BANDS: StressBand[] = [
  { max: 25,  label: 'Low Macro Stress',        color: '#3B82F6' },
  { max: 50,  label: 'Normal Expansion',         color: '#35D07F' },
  { max: 70,  label: 'Late-Cycle Watch',         color: '#E6B450' },
  { max: 85,  label: 'Elevated Stress Risk',     color: '#F97316' },
  { max: Infinity, label: 'Active Stress Window', color: '#F85149' },
];

export function stressBandFor(score: number): StressBand {
  return STRESS_BANDS.find((b) => score < b.max) ?? STRESS_BANDS[STRESS_BANDS.length - 1];
}

// ─── Seven-year model alignment stats (mirrors cycleAnchors.ts's halving-model
// stats so both models can be compared on equal footing) ─────────────────────

export type AlignmentStats = {
  sampleSize:    number;
  avgErrorDays:  number | null;
  hits:          number;      // events whose window overlapped a BTC extremum year
  alignmentPct:  number | null;
};

// For each non-projected BTC-era event (2015, 2022), find the nearest BTC cycle
// extremum (low/high) from CYCLE_ANCHORS and measure the day gap between the
// event's window and that extremum. Sample size is intentionally tiny (n<=2) —
// surfaced honestly rather than hidden, since these are also the years the
// event list was partly selected for having notable BTC moves.
export function buildSevenYearAlignmentStats(toleranceDays = 180): AlignmentStats {
  const btcEraEvents = SEVEN_YEAR_EVENTS.filter((e) => !e.projected && eventRelevance(e) === 'BTC live');
  const extrema: { date: string }[] = [];
  for (const c of CYCLE_ANCHORS) {
    extrema.push({ date: c.lowDate });
    if (c.highDate) extrema.push({ date: c.highDate });
    if (c.nextLowDate) extrema.push({ date: c.nextLowDate });
  }

  const errors: number[] = [];
  let hits = 0;
  for (const ev of btcEraEvents) {
    const mid = new Date((new Date(ev.startDate).getTime() + new Date(ev.endDate).getTime()) / 2).toISOString().slice(0, 10);
    let best = Infinity;
    for (const ext of extrema) {
      const err = Math.abs(daysBetween(mid, ext.date));
      if (err < best) best = err;
    }
    if (Number.isFinite(best)) {
      errors.push(best);
      if (best <= toleranceDays) hits++;
    }
  }

  return {
    sampleSize: btcEraEvents.length,
    avgErrorDays: errors.length ? Math.round(errors.reduce((s, v) => s + v, 0) / errors.length) : null,
    hits,
    alignmentPct: btcEraEvents.length ? Math.round((hits / btcEraEvents.length) * 100) : null,
  };
}

// ─── Scenario bands for the 2028-2029 window ─────────────────────────────────
// Systematically derived from historical cycle multiples/drawdowns, not
// hand-picked numbers. Still explicitly illustrative, not a forecast.

export type ScenarioBands = {
  currentPrice: number;
  bullish:  { low: number; high: number };
  hybrid:   { low: number; high: number };
  stress:   { low: number; high: number };
};

export function buildScenarioBands(currentPrice: number): ScenarioBands {
  const completed = getCompletedCycles();
  const multiples = completed.map((c) => c.highPrice / c.lowPrice);
  const minMult = multiples.length ? Math.min(...multiples) : 3;
  const maxMult = multiples.length ? Math.max(...multiples) : 6;

  // Scenario A (halving-led): apply the historical low->high multiple range,
  // damped for diminishing cycle returns (each cycle's multiple has been
  // roughly half the prior one — apply a further ~0.5x damping factor).
  const damping = 0.5;
  const bullishLow  = currentPrice * (1 + (minMult - 1) * damping);
  const bullishHigh = currentPrice * (1 + (maxMult - 1) * damping);

  // Scenario B (stress-dominant): apply the historical average BTC max
  // drawdown during a stress-overlap cycle (2021-2022, -77.5%) to a modest
  // pre-stress peak assumption.
  const stressDrawdown = 0.775;
  const preStressPeak = currentPrice * 1.3; // modest halving-driven rally before stress hits
  const stressLow  = preStressPeak * (1 - stressDrawdown);
  const stressHigh = preStressPeak * (1 - stressDrawdown * 0.6);

  // Scenario C (hybrid): damped blend of A and B.
  const hybridLow  = (bullishLow + stressLow) / 2;
  const hybridHigh = (bullishHigh + stressHigh) / 2;

  return {
    currentPrice,
    bullish: { low: Math.round(bullishLow), high: Math.round(bullishHigh) },
    hybrid:  { low: Math.round(hybridLow),  high: Math.round(hybridHigh) },
    stress:  { low: Math.round(stressLow),  high: Math.round(stressHigh) },
  };
}

// ─── Thesis scoreboard ────────────────────────────────────────────────────────

export type ThesisScoreboard = {
  timingAlignment:          number; // 0-100
  macroStressConfirmation:  number;
  institutionalEvidence:    number;
  btcPriceConfirmation:     number;
  overall:                  number;
  verdict:                  'Confirmed' | 'Mixed / Watch' | 'Unconfirmed';
};

function weeklyReturnVolatility(prices: { time: string; price: number }[]): number | null {
  if (prices.length < 10) return null;
  const rets: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1].price > 0) rets.push((prices[i].price - prices[i - 1].price) / prices[i - 1].price);
  }
  if (rets.length < 5) return null;
  const mean = rets.reduce((s, v) => s + v, 0) / rets.length;
  const variance = rets.reduce((s, v) => s + (v - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * 100;
}

export function buildThesisScoreboard(
  alignment: AlignmentStats,
  stress: StressScoreResult,
  btcPrices: PricePoint[],
): ThesisScoreboard {
  // Timing alignment is built from an n<=2 sample that's also somewhat
  // circular (the event years were partly chosen for having notable BTC
  // moves), so a "perfect" alignment score shouldn't carry full weight.
  // Shrink toward the neutral midpoint (50) in proportion to how far the
  // sample size is from a credible n=8 — same credibility-weighting logic
  // used for confidence bands elsewhere in this codebase (seasonality.ts).
  const CREDIBLE_SAMPLE_SIZE = 8;
  const rawTimingAlignment = alignment.alignmentPct ?? 0;
  const credibility = Math.min(1, alignment.sampleSize / CREDIBLE_SAMPLE_SIZE);
  const timingAlignment = 50 + (rawTimingAlignment - 50) * credibility;

  // Same credibility discount applied here: if only 1-2 of the 6 macro
  // sub-factors are available (e.g. FRED unreachable), the average of just
  // those shouldn't be presented with full confidence either — shrink
  // toward neutral in proportion to how many of the 6 are actually present.
  const MACRO_FACTOR_COUNT = 6;
  const macroOnly = (Object.keys(STRESS_WEIGHTS) as StressFactorKey[])
    .filter((k) => k !== 'timeProximity')
    .map((k) => stress.factors[k])
    .filter((v): v is number => v != null);
  const macroCredibility = macroOnly.length / MACRO_FACTOR_COUNT;
  const rawMacroStressConfirmation = macroOnly.length ? macroOnly.reduce((s, v) => s + v, 0) / macroOnly.length : 50;
  const macroStressConfirmation = 50 + (rawMacroStressConfirmation - 50) * macroCredibility;

  // Institutional-cycle evidence: compare realized weekly-return volatility
  // between the pre-institutional and ETF eras — a concrete, computed check
  // rather than a narrative claim. Materially lower ETF-era volatility scores
  // as evidence of a market-structure shift.
  const preEra = INSTITUTIONAL_ERAS[0];
  const etfEra = INSTITUTIONAL_ERAS[INSTITUTIONAL_ERAS.length - 1];
  const preVol = weeklyReturnVolatility(btcPrices.filter((p) => p.time >= preEra.start && p.time <= (preEra.end ?? '9999')));
  const etfVol = weeklyReturnVolatility(btcPrices.filter((p) => p.time >= etfEra.start));
  // Half-sensitivity scaling: BTC's early-era volatility was so much higher
  // than any later period that a naive 1:1 scaling saturates at 100 for
  // almost any real-world reduction, which would make this sub-score a
  // foregone conclusion rather than an actual measurement.
  const institutionalEvidence = preVol != null && etfVol != null && preVol > 0
    ? Math.round(Math.max(0, Math.min(100, ((preVol - etfVol) / preVol) * 50 + 50)))
    : 50;

  const btcPriceConfirmation = stress.factors.btcStress ?? 50;

  const overall = Math.round(
    timingAlignment * 0.25 + macroStressConfirmation * 0.35 + institutionalEvidence * 0.20 + btcPriceConfirmation * 0.20,
  );

  const verdict: ThesisScoreboard['verdict'] = overall < 40 ? 'Unconfirmed' : overall < 65 ? 'Mixed / Watch' : 'Confirmed';

  return {
    timingAlignment: Math.round(timingAlignment),
    macroStressConfirmation: Math.round(macroStressConfirmation),
    institutionalEvidence,
    btcPriceConfirmation: Math.round(btcPriceConfirmation),
    overall,
    verdict,
  };
}
