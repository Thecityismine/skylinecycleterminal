import type { PricePoint } from '../api/coinmetrics';

// ─── Cycle phase framework ──────────────────────────────────────────────────
// Four-year halving cycle labeling. Educational / probabilistic context only —
// not a guarantee that BTC or ETH follow a perfect four-year clock.

export type CyclePhase = 'bottom' | 'recovery' | 'rally' | 'top';

export const CYCLE_PHASES: CyclePhase[] = ['bottom', 'recovery', 'rally', 'top'];

export const CYCLE_PHASE_LABEL: Record<CyclePhase, string> = {
  bottom:   'Bottom Year',
  recovery: 'Recovery Year',
  rally:    'Rally Year',
  top:      'Top Year',
};

export const CYCLE_PHASE_COLOR: Record<CyclePhase, string> = {
  bottom:   '#FF5C5C',
  recovery: '#3B82F6',
  rally:    '#35D07F',
  top:      '#F7931A',
};

export const CYCLE_PHASE_DESCRIPTION: Record<CyclePhase, string> = {
  bottom:   'High volatility, potential capitulation, sentiment weak.',
  recovery: 'Early trend repair, accumulation, improving liquidity.',
  rally:    'Expansion, broad participation, increasing risk appetite.',
  top:      'Distribution risk, euphoric conditions, elevated volatility.',
};

// Halving years anchor the cycle. Pattern: halving year = Rally, +1 = Top,
// +2 = Bottom, +3 = Recovery, then the next halving year repeats as Rally.
// Update this list as future halvings are confirmed/estimated.
export const HALVING_YEARS = [2012, 2016, 2020, 2024, 2028];

export function getCyclePhase(year: number): CyclePhase {
  const anchor = HALVING_YEARS[0];
  const offset = (((year - anchor) % 4) + 4) % 4;
  if (offset === 0) return 'rally';
  if (offset === 1) return 'top';
  if (offset === 2) return 'bottom';
  return 'recovery';
}

export function buildCyclePhaseMap(fromYear: number, toYear: number): Record<number, CyclePhase> {
  const map: Record<number, CyclePhase> = {};
  for (let y = fromYear; y <= toYear; y++) map[y] = getCyclePhase(y);
  return map;
}

// ─── Monthly candle construction ────────────────────────────────────────────

export type MonthlyCandle = {
  year:  number;
  month: number; // 1-12
  open:  number;
  high:  number;
  low:   number;
  close: number;
};

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Builds one candle per calendar month from daily closes. High/low are
// derived from the range of daily closes within the month (a proxy —
// CoinMetrics' free tier does not expose true intraday high/low).
export function buildMonthlyCandles(daily: PricePoint[]): MonthlyCandle[] {
  const byKey = new Map<string, { year: number; month: number; prices: PricePoint[] }>();

  for (const d of daily) {
    const year  = Number(d.time.slice(0, 4));
    const month = Number(d.time.slice(5, 7));
    const key   = `${year}-${month}`;
    if (!byKey.has(key)) byKey.set(key, { year, month, prices: [] });
    byKey.get(key)!.prices.push(d);
  }

  const candles: MonthlyCandle[] = [];
  for (const { year, month, prices } of byKey.values()) {
    prices.sort((a, b) => a.time.localeCompare(b.time));
    const values = prices.map((p) => p.price);
    candles.push({
      year,
      month,
      open:  prices[0].price,
      close: prices[prices.length - 1].price,
      high:  Math.max(...values),
      low:   Math.min(...values),
    });
  }

  return candles.sort((a, b) => (a.year - b.year) || (a.month - b.month));
}

// ─── Return / volatility calculations ───────────────────────────────────────

export function calculateMonthlyReturn(previousClose: number, close: number): number {
  return ((close - previousClose) / previousClose) * 100;
}

export function calculateMonthlyVolatility(high: number, low: number): number {
  return ((high - low) / low) * 100;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Monthly performance (return + volatility + cycle phase per month) ─────

export type MonthlyPerformance = {
  year:          number;
  month:         number;
  monthName:     string;
  returnPct:     number;
  volatilityPct: number;
  cyclePhase:    CyclePhase;
  close:         number;
};

export function buildMonthlyPerformance(candles: MonthlyCandle[]): MonthlyPerformance[] {
  const sorted = [...candles].sort((a, b) => (a.year - b.year) || (a.month - b.month));
  const out: MonthlyPerformance[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur  = sorted[i];

    // Guard against gaps in the daily series (skip if months aren't adjacent)
    const expectedMonth = prev.month === 12 ? 1 : prev.month + 1;
    const expectedYear  = prev.month === 12 ? prev.year + 1 : prev.year;
    if (cur.year !== expectedYear || cur.month !== expectedMonth) continue;

    out.push({
      year:          cur.year,
      month:         cur.month,
      monthName:     MONTH_NAMES[cur.month - 1],
      returnPct:     calculateMonthlyReturn(prev.close, cur.close),
      volatilityPct: calculateMonthlyVolatility(cur.high, cur.low),
      cyclePhase:    getCyclePhase(cur.year),
      close:         cur.close,
    });
  }

  return out;
}

// ─── Month summaries (aggregated across all years) ─────────────────────────

export type CyclePhaseSummary = {
  medianReturn:     number;
  medianVolatility: number;
  sampleSize:       number;
};

export type MonthSummary = {
  month:              number;
  monthName:          string;
  medianReturn:       number;
  averageReturn:      number;
  medianVolatility:   number;
  positiveYears:      number;
  negativeYears:      number;
  sampleSize:         number;
  cyclePhaseSummaries: Partial<Record<CyclePhase, CyclePhaseSummary>>;
};

export function buildMonthSummaries(perf: MonthlyPerformance[]): MonthSummary[] {
  const byMonth = new Map<number, MonthlyPerformance[]>();
  for (const p of perf) {
    if (!byMonth.has(p.month)) byMonth.set(p.month, []);
    byMonth.get(p.month)!.push(p);
  }

  const out: MonthSummary[] = [];
  for (let m = 1; m <= 12; m++) {
    const rows    = byMonth.get(m) ?? [];
    const returns = rows.map((r) => r.returnPct);
    const vols    = rows.map((r) => r.volatilityPct);

    const cyclePhaseSummaries: MonthSummary['cyclePhaseSummaries'] = {};
    for (const phase of CYCLE_PHASES) {
      const phaseRows = rows.filter((r) => r.cyclePhase === phase);
      if (phaseRows.length > 0) {
        cyclePhaseSummaries[phase] = {
          medianReturn:     median(phaseRows.map((r) => r.returnPct)),
          medianVolatility: median(phaseRows.map((r) => r.volatilityPct)),
          sampleSize:       phaseRows.length,
        };
      }
    }

    out.push({
      month:            m,
      monthName:        MONTH_NAMES[m - 1],
      medianReturn:      median(returns),
      averageReturn:     average(returns),
      medianVolatility:  median(vols),
      positiveYears:     returns.filter((r) => r > 0).length,
      negativeYears:     returns.filter((r) => r <= 0).length,
      sampleSize:        rows.length,
      cyclePhaseSummaries,
    });
  }

  return out;
}

// ─── Year-to-date ────────────────────────────────────────────────────────────

export function calculateYTDReturn(yearOpenPrice: number, currentPrice: number): number {
  return ((currentPrice - yearOpenPrice) / yearOpenPrice) * 100;
}

// ─── Historical read (plain-English, probability language only) ───────────

export type HistoricalRead = {
  read:       string;
  confidence: 'Low' | 'Moderate' | 'High';
};

export function buildHistoricalRead(
  summary:    MonthSummary,
  phase:      CyclePhase,
  assetLabel: string,
): HistoricalRead {
  const phaseSummary = summary.cyclePhaseSummaries[phase];
  const overallSign   = summary.medianReturn > 0 ? 'positive' : summary.medianReturn < 0 ? 'weak' : 'flat';
  const phaseSign     = phaseSummary ? (phaseSummary.medianReturn > 0 ? 'constructive' : 'soft') : null;

  let read: string;
  if (phaseSummary) {
    read = `${summary.monthName} has historically shown ${overallSign} median performance for ${assetLabel} ` +
      `(${summary.medianReturn >= 0 ? '+' : ''}${summary.medianReturn.toFixed(1)}%), and has been ${phaseSign} ` +
      `specifically during ${CYCLE_PHASE_LABEL[phase].toLowerCase()} conditions ` +
      `(${phaseSummary.medianReturn >= 0 ? '+' : ''}${phaseSummary.medianReturn.toFixed(1)}% median).`;
  } else {
    read = `${summary.monthName} has historically shown ${overallSign} median performance for ${assetLabel} ` +
      `(${summary.medianReturn >= 0 ? '+' : ''}${summary.medianReturn.toFixed(1)}%). Not enough ${CYCLE_PHASE_LABEL[phase].toLowerCase()} ` +
      `samples exist yet for a phase-specific read.`;
  }

  const sampleSize = phaseSummary?.sampleSize ?? summary.sampleSize;
  const confidence: HistoricalRead['confidence'] =
    sampleSize >= 8 ? 'High' : sampleSize >= 4 ? 'Moderate' : 'Low';

  return { read, confidence };
}

// ─── Month outlook read (position-sizing framing, probability language only) ─

export function buildMonthOutlookRead(summary: MonthSummary, phase: CyclePhase): string {
  const phaseSummary = summary.cyclePhaseSummaries[phase];
  const returnPct = phaseSummary ? phaseSummary.medianReturn : summary.medianReturn;

  if (returnPct >= 5) {
    return `Historically constructive, but high-volatility conditions remain possible. Confirm with trend structure before sizing up.`;
  }
  if (returnPct >= 0) {
    return `Historically mixed-to-flat. Sample size and volatility both argue for confirmation from trend and liquidity data before acting.`;
  }
  return `Historically weak month. Favor profit protection, smaller position sizing, and confirmation from trend structure.`;
}

// ─── Heatmap cell coloring ───────────────────────────────────────────────────

export function heatmapCellColor(returnPct: number): string {
  if (returnPct >= 20)  return '#22C55E';
  if (returnPct >= 5)   return '#15803D';
  if (returnPct >= 0)   return '#1B2634';
  if (returnPct >= -5)  return '#B4535C';
  if (returnPct >= -20) return '#DC2626';
  return '#7F1D1D';
}
