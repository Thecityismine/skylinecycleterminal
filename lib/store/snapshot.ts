import { buildDeepResearchReport } from '@/lib/research/report';
import type { DeepResearchReport } from '@/lib/research/report';
import { utcDate } from '@/lib/store/observations';
import type { Observation } from '@/lib/store/observations';

// Turns one run of the production research report into a set of observations.
//
// The collector deliberately reads from buildDeepResearchReport() rather than
// calling the vendor adapters itself. Two surfaces computing the same thing from
// the same inputs by different routes will eventually disagree, and this store
// is what a track record would be argued from: if the stored score and the
// rendered score can diverge, the stored one is worthless as evidence.
//
// So there is exactly one computation and this file projects it. Any new metric
// worth storing should be added to the report first and picked up here, never
// fetched independently.

// ─── Metric ids ───────────────────────────────────────────────────────────────

/** Headline scalars lifted straight off the report. */
export const HEADLINE_METRICS = {
  cycleScore:         'cycle_score',
  weightedExtension:  'weighted_extension',
  ledgerCoverage:     'ledger_coverage',
  confidence:         'report_confidence',
  marketHealth:       'market_health',
  bottomProbability:  'bottom_probability',
  btcPrice:           'btc_price_usd',
  probAccumulation:   'prob_accumulation',
  probNeutral:        'prob_neutral',
  probDistribution:   'prob_distribution',
} as const;

/** Evidence ledger items are namespaced so they cannot collide with scalars. */
export function evidenceMetricId(evidenceItemId: string): string {
  return `evidence.${evidenceItemId}`;
}

// ─── Collection ───────────────────────────────────────────────────────────────

const SOURCE = 'skyline:deep-research-report';

/**
 * Project a report into observations.
 *
 * `metricDate` comes from the report's own asOfDate, which is the date the
 * underlying data describes. `observedDate` is today. On a normal daily run
 * those differ by a day or so, and that gap is exactly what makes the store
 * point-in-time rather than merely historical.
 *
 * Pure: no network, no writes. Kept separate from the route so the projection
 * can be reasoned about, and later tested, without touching Firestore.
 */
export function reportToObservations(
  report: DeepResearchReport,
  observedDate: string = utcDate(),
): Observation[] {
  const base = {
    metricDate: report.asOfDate,
    observedDate,
    source: SOURCE,
    backfilled: false,
  };

  const rows: Observation[] = [
    { ...base, metric: HEADLINE_METRICS.cycleScore,        value: report.cycleScore },
    { ...base, metric: HEADLINE_METRICS.weightedExtension, value: report.ledger.weightedExtension },
    { ...base, metric: HEADLINE_METRICS.ledgerCoverage,    value: report.ledger.coverage },
    { ...base, metric: HEADLINE_METRICS.confidence,        value: report.confidence },
    { ...base, metric: HEADLINE_METRICS.marketHealth,      value: report.marketHealth },
    { ...base, metric: HEADLINE_METRICS.bottomProbability, value: report.bottomProbability },
    { ...base, metric: HEADLINE_METRICS.btcPrice,          value: report.btcPrice },
    { ...base, metric: HEADLINE_METRICS.probAccumulation,  value: report.probabilities.accumulation },
    { ...base, metric: HEADLINE_METRICS.probNeutral,       value: report.probabilities.neutral },
    { ...base, metric: HEADLINE_METRICS.probDistribution,  value: report.probabilities.distribution },
  ];

  // Every indicator the ledger could actually read, stored as its normalised
  // extension (0 = deep value, 100 = extended — see the polarity note at the top
  // of lib/research/evidence.ts). Gaps are skipped rather than stored as null,
  // so an indicator's absence from the series on a given day is itself the
  // record that it was unavailable.
  for (const item of report.ledger.available) {
    rows.push({
      ...base,
      metric: evidenceMetricId(item.id),
      value: item.extension,
      reading: item.reading,
    });
  }

  return rows;
}

export type SnapshotResult = {
  asOfDate: string;
  observedDate: string;
  cycleScore: number;
  rows: Observation[];
};

/** Run the report once and project it. The only network call is the report's own. */
export async function collectSnapshot(observedDate: string = utcDate()): Promise<SnapshotResult> {
  const report = await buildDeepResearchReport();
  return {
    asOfDate: report.asOfDate,
    observedDate,
    cycleScore: report.cycleScore,
    rows: reportToObservations(report, observedDate),
  };
}
