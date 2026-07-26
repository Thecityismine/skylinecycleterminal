import { fetchOnChainMetrics, fetchCurrentLTHData, fetchBTCDailyPrice, fetchBTCValuationData } from '@/lib/api/coinmetrics';
import { fetchFearGreed }        from '@/lib/api/feargreed';
import { fetchMVRV }             from '@/lib/api/cryptoquant';
import { fetchStablecoinSupply } from '@/lib/api/defillama';
import { fetchHashrate }         from '@/lib/api/mempool';
import { fetchMacroData }        from '@/lib/api/fred';
import type { MacroResponse }    from '@/lib/api/fred';
import { computeSkylineScore, buildHistoricalContext } from '@/lib/indicators/skylineScore';
import { buildValueFloorPoints, getFloorProximityScore } from '@/lib/indicators/valueFloors';
import type { ValueFloorPoint }  from '@/lib/indicators/valueFloors';
import {
  getValidationMetrics, getActiveCyclePosition, getCompletedCycles,
} from '@/lib/indicators/cycleAnchors';
import type { ActiveCyclePosition, CompletedCycleStats } from '@/lib/indicators/cycleAnchors';
import {
  fromCycleScore, fromValuation, fromMacro, fromTiming,
  buildEvidenceLedger, directionOf, THESIS_LABEL,
} from '@/lib/research/evidence';
import type { EvidenceLedger, EvidenceItem, Thesis } from '@/lib/research/evidence';
import { getComposer } from '@/lib/research/narrative';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChangeRow = {
  label:     string;
  from:      string;
  to:        string;
  direction: 'up' | 'down' | 'flat';
  favourable: boolean | null;   // null when direction carries no inherent read
};

export type CycleComparisonRow = {
  label:      string;
  weeks:      number | null;
  isCurrent:  boolean;
  note:       string;
};

export type SimilarPeriod = {
  date:       string;
  label:      string;
  confidence: number;      // 0–100, from feature distance
  price:      string;
  outcome:    string;
};

export type ProbabilityMatrix = {
  accumulation: number;
  neutral:      number;
  distribution: number;
};

export type DeepResearchReport = {
  generatedAt:      string;
  asOfDate:         string;
  cycleScore:       number;
  zoneLabel:        string;
  zoneColor:        string;
  thesis:           Thesis;
  thesisLabel:      string;
  confidence:       number;
  ledger:           EvidenceLedger;
  executiveSummary: string;
  whatTheDataSuggests: string;
  outlook:          string;
  keyTakeaways:     string[];
  supporting:       EvidenceItem[];
  weakening:        EvidenceItem[];
  cycleComparison:  CycleComparisonRow[];
  weeksSinceAth:    number | null;
  athDate:          string | null;
  whatChanged:      ChangeRow[];
  similarPeriod:    SimilarPeriod | null;
  bottomProbability: number;
  probabilities:    ProbabilityMatrix;
  contrarianRisks:  string[];
  dataGaps:         EvidenceItem[];
  marketHealth:     number;      // 0–10
  riskLevel:        'Low' | 'Medium' | 'Elevated' | 'High';
  composerId:       string;
  btcPrice:         number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function fmtUSD(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

// ─── Derived probabilities ────────────────────────────────────────────────────
//
// These are positional weights, not forecasts. They describe where the measured
// indicator set currently sits inside its own historical range — nothing here
// models future price. The formulae are shown in the UI so a reader can check
// them rather than take them on trust.

function bottomProbabilityFrom(extension: number, timingProgress: number | null): number {
  // Indicator positioning contributes 75%, cycle timing 25% when available.
  const positional = 100 - extension;
  if (timingProgress == null) return clamp(Math.round(positional), 5, 95);
  const timing = clamp(timingProgress * 100, 0, 100);
  return clamp(Math.round(positional * 0.75 + timing * 0.25), 5, 95);
}

function probabilityMatrix(extension: number): ProbabilityMatrix {
  // Triangular weighting centred on the measured extension.
  const acc = clamp(100 - extension, 0, 100);
  const dis = clamp(extension, 0, 100);
  const neu = clamp(100 - Math.abs(50 - extension) * 2, 0, 100);
  const total = acc + dis + neu;
  return {
    accumulation: Math.round((acc / total) * 100),
    neutral:      Math.round((neu / total) * 100),
    distribution: Math.round((dis / total) * 100),
  };
}

function riskLevelFrom(extension: number): DeepResearchReport['riskLevel'] {
  if (extension < 30) return 'Low';
  if (extension < 55) return 'Medium';
  if (extension < 75) return 'Elevated';
  return 'High';
}

// ─── Cycle timing ─────────────────────────────────────────────────────────────

function findAth(points: ValueFloorPoint[]): { date: string; price: number } | null {
  if (!points.length) return null;
  let best = points[0];
  for (const p of points) if (p.btcClose > best.btcClose) best = p;
  return { date: best.time, price: best.btcClose };
}

function weeksBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso + 'T00:00:00Z').getTime() - new Date(fromIso + 'T00:00:00Z').getTime();
  return Math.max(0, Math.round(ms / (7 * 86_400_000)));
}

function buildCycleComparison(
  completed: CompletedCycleStats[],
  weeksSinceAth: number | null,
): CycleComparisonRow[] {
  const rows: CycleComparisonRow[] = completed.map((c) => ({
    label:     `${new Date(c.nextLowDate + 'T00:00:00Z').getUTCFullYear()} Bottom`,
    weeks:     Math.round(c.daysHighToLow / 7),
    isCurrent: false,
    note:      `${c.highDateFmt} high → ${c.nextLowDateFmt} low`,
  }));

  rows.unshift({
    label:     'Current Cycle',
    weeks:     weeksSinceAth,
    isCurrent: true,
    note:      weeksSinceAth != null ? 'Weeks elapsed since cycle high' : 'Cycle high not yet identified',
  });

  return rows;
}

// ─── What changed ─────────────────────────────────────────────────────────────
//
// Computed by reading the same series seven days back rather than by storing
// snapshots, so the section works on first load with no persistence layer.

function buildWhatChanged(points: ValueFloorPoint[]): ChangeRow[] {
  if (points.length < 10) return [];
  const now = points[points.length - 1];

  const targetTs = now.ts - 7 * 86_400_000;
  let prev = points[0];
  for (const p of points) if (p.ts <= targetTs) prev = p; else break;
  if (prev.time === now.time) return [];

  const rows: ChangeRow[] = [];

  const push = (
    label: string,
    a: number | null | undefined,
    b: number | null | undefined,
    fmt: (v: number) => string,
    higherIsFavourable: boolean | null,
  ) => {
    if (a == null || b == null) return;
    const direction = b > a ? 'up' : b < a ? 'down' : 'flat';
    rows.push({
      label,
      from: fmt(a),
      to:   fmt(b),
      direction,
      favourable: higherIsFavourable == null || direction === 'flat'
        ? null
        : (direction === 'up') === higherIsFavourable,
    });
  };

  push('BTC Price', prev.btcClose, now.btcClose, fmtUSD, null);
  push('Delta Price', prev.deltaPrice, now.deltaPrice, fmtUSD, null);
  push('Realized Price', prev.realizedPrice, now.realizedPrice, fmtUSD, null);
  push('MVRV', prev.mvrv, now.mvrv, (v) => `${v.toFixed(2)}×`, false);
  push(
    'Price vs Delta',
    prev.vsDelta != null ? (prev.vsDelta - 1) * 100 : null,
    now.vsDelta  != null ? (now.vsDelta  - 1) * 100 : null,
    (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    false,
  );
  push('Drawdown from ATH', prev.drawdownPct, now.drawdownPct, (v) => `${v.toFixed(1)}%`, true);

  return rows;
}

// ─── Similar historical period ────────────────────────────────────────────────
//
// Nearest neighbour over four normalised valuation features. Candidates are
// restricted to dates at least two years old so the match describes a period
// whose outcome is already known.

function findSimilarPeriod(points: ValueFloorPoint[]): SimilarPeriod | null {
  if (points.length < 800) return null;
  const now = points[points.length - 1];

  const featuresOf = (p: ValueFloorPoint): number[] | null => {
    if (p.vsRealized == null || p.vsDelta == null || p.vs200w == null) return null;
    return [
      Math.log(p.vsRealized),
      Math.log(p.vsDelta),
      Math.log(p.vs200w),
      p.drawdownPct / 100,
    ];
  };

  const target = featuresOf(now);
  if (!target) return null;

  const cutoffTs = now.ts - 730 * 86_400_000;
  let best: { p: ValueFloorPoint; d: number } | null = null;

  for (const p of points) {
    if (p.ts > cutoffTs) break;
    const f = featuresOf(p);
    if (!f) continue;
    let d = 0;
    for (let i = 0; i < f.length; i++) d += (f[i] - target[i]) ** 2;
    d = Math.sqrt(d);
    if (!best || d < best.d) best = { p, d };
  }

  if (!best) return null;

  // Distance 0 → 100% ; distance 1.0 or worse → floor of 20%.
  const confidence = clamp(Math.round(100 - best.d * 80), 20, 99);

  // What actually happened over the following year, stated as fact.
  const oneYearTs = best.p.ts + 365 * 86_400_000;
  const after = points.find((p) => p.ts >= oneYearTs);
  const outcome = after
    ? `Over the following 12 months BTC went from ${fmtUSD(best.p.btcClose)} to ${fmtUSD(after.btcClose)} ` +
      `(${after.btcClose >= best.p.btcClose ? '+' : ''}${(((after.btcClose / best.p.btcClose) - 1) * 100).toFixed(0)}%).`
    : 'Insufficient forward data for this period.';

  return {
    date:  best.p.time,
    label: new Date(best.p.time + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    }),
    confidence,
    price: fmtUSD(best.p.btcClose),
    outcome,
  };
}

// ─── Contrarian risks ─────────────────────────────────────────────────────────

function contrarianRisks(thesis: Thesis, weakening: EvidenceItem[]): string[] {
  const risks: string[] = [];

  if (weakening.length) {
    risks.push(
      `The measured counter-evidence — ${weakening.slice(0, 3).map((i) => i.label).join(', ')} — ` +
      `resolves against the current reading rather than converging with it.`,
    );
  }

  risks.push('A liquidity shock or sustained dollar strength overrides on-chain positioning, as it did in March 2020.');
  risks.push('A large exchange or lender failure forces distressed selling independent of valuation.');
  risks.push('Regulatory action materially changes access or custody for a major market.');

  if (thesis === 'accumulation') {
    risks.push('Valuation floors are reference levels, not support: price has traded through every one of them at some point in its history.');
  } else if (thesis === 'distribution') {
    risks.push('Extended readings have persisted for many months in past cycles without resolving downward.');
  }

  risks.push('Four completed cycles is a small sample. Every timing figure here rests on it.');

  return risks;
}

// ─── Assembly ─────────────────────────────────────────────────────────────────

export async function buildDeepResearchReport(): Promise<DeepResearchReport> {
  const [onChain, fg, mvrvData, stablecoin, hashrate, lthData, fullPrices, valuationRaw, macro] =
    await Promise.all([
      fetchOnChainMetrics('2022-01-01'),
      fetchFearGreed(),
      fetchMVRV(),
      fetchStablecoinSupply(),
      fetchHashrate(),
      fetchCurrentLTHData(),
      fetchBTCDailyPrice('2012-01-01'),
      fetchBTCValuationData('2010-07-01'),
      // Macro is optional: the report degrades to a listed data gap rather than failing.
      fetchMacroData().catch((): MacroResponse | null => null),
    ]);

  const ctx = buildHistoricalContext(fullPrices);
  const cycle = computeSkylineScore(
    onChain,
    fg.value,
    {
      mvrvRatio:        mvrvData?.mvrv ?? null,
      stablecoinSupply: stablecoin?.totalCirculating ?? null,
      hashratePoints:   hashrate?.points ?? null,
      splyCur:          lthData?.splyCur ?? null,
      splyAct1yr:       lthData?.splyAct1yr ?? null,
    },
    ctx,
  );

  const points = buildValueFloorPoints(valuationRaw);
  const floor  = getFloorProximityScore(points);
  const last   = points.length ? points[points.length - 1] : null;

  const metrics   = getValidationMetrics();
  const position: ActiveCyclePosition = getActiveCyclePosition(metrics);
  const completed = getCompletedCycles();

  const ath = findAth(points);
  const asOfDate = last?.time ?? new Date().toISOString().slice(0, 10);
  const weeksSinceAth = ath ? weeksBetween(ath.date, asOfDate) : null;

  const medianWeeksToLow = completed.length
    ? Math.round(metrics.highToLow.median / 7)
    : null;

  const ledger = buildEvidenceLedger([
    fromCycleScore(cycle),
    fromValuation(last, floor),
    fromMacro(macro),
    fromTiming(position, completed, weeksSinceAth),
  ]);

  const extension = ledger.weightedExtension;

  const timingProgress = weeksSinceAth != null && medianWeeksToLow
    ? clamp(weeksSinceAth / medianWeeksToLow, 0, 1)
    : null;

  const bottomProbability = bottomProbabilityFrom(extension, timingProgress);

  // Ranked by how far from neutral an indicator sits, scaled by its weight.
  const rank = (a: EvidenceItem, b: EvidenceItem) =>
    Math.abs(b.extension! - 50) * b.weight - Math.abs(a.extension! - 50) * a.weight;

  const supporting = [...ledger.supporting].sort(rank);
  const weakening  = [...ledger.weakening].sort(rank);

  const composer = getComposer();
  const narrativeInput = {
    ledger,
    thesis: ledger.thesis,
    cycleScore: cycle.score,
    weeksSinceAth,
    medianWeeksToLow,
    bottomProbability,
    topSupporting: supporting,
    topWeakening: weakening,
    coveragePct: ledger.coverage * 100,
  };

  // Confidence reflects how much of the tracked evidence was usable and how
  // decisively it points one way — not how likely the outlook is to be right.
  const decisiveness = clamp(Math.abs(extension - 50) * 2, 0, 100);
  const confidence = Math.round(clamp(ledger.coverage * 60 + decisiveness * 0.4, 10, 95));

  return {
    generatedAt: new Date().toISOString(),
    asOfDate,
    cycleScore:  cycle.score,
    zoneLabel:   cycle.zoneLabel,
    zoneColor:   cycle.zoneColor,
    thesis:      ledger.thesis,
    thesisLabel: THESIS_LABEL[ledger.thesis],
    confidence,
    ledger,
    executiveSummary:    composer.executiveSummary(narrativeInput),
    whatTheDataSuggests: composer.whatTheDataSuggests(narrativeInput),
    outlook:             composer.outlook(narrativeInput),
    keyTakeaways:        composer.keyTakeaways(narrativeInput),
    supporting,
    weakening,
    cycleComparison: buildCycleComparison(completed, weeksSinceAth),
    weeksSinceAth,
    athDate: ath?.date ?? null,
    whatChanged: buildWhatChanged(points),
    similarPeriod: findSimilarPeriod(points),
    bottomProbability,
    probabilities: probabilityMatrix(extension),
    contrarianRisks: contrarianRisks(ledger.thesis, weakening),
    dataGaps: ledger.gaps,
    marketHealth: Math.round(clamp((100 - extension) / 10, 0, 10) * 10) / 10,
    riskLevel: riskLevelFrom(extension),
    composerId: composer.id,
    btcPrice: last?.btcClose ?? null,
  };
}

export { directionOf };
