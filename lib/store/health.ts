import { describeMetric, listKnownMetrics } from '@/lib/store/observations';
import { HEADLINE_METRICS } from '@/lib/store/snapshot';
import { BACKFILL_METRICS } from '@/lib/store/backfill';

// Store coverage, shaped for the admin panel.
//
// The metric list comes from the registry rather than from the two static maps,
// because most of what a snapshot writes is evidence-ledger indicators whose ids
// are generated per run. Listing only the static maps made the store look nearly
// empty while it was in fact recording a full research report every morning.
//
// The static maps are still unioned in, so a metric that is declared but has
// never been written shows as empty rather than vanishing.
//
// Reads against `observations` need the composite indexes in
// firestore.indexes.json, and those are a separate deploy from the app. Until
// they land, every read fails with the same Firestore error, and so does a
// still-building index. That is a setup step rather than a fault, so it is
// reported as its own state instead of surfacing as a broken page.

export type MetricGroup = 'report' | 'evidence' | 'series';

export type MetricSummary = {
  metric: string;
  label:  string;      // display form; evidence ids drop their namespace
  count:  number;
  first:  string | null;
  last:   string | null;
  group:  MetricGroup;
};

export type StoreHealth =
  | {
      state: 'ready';
      metrics: MetricSummary[];
      populated: number;
      total: number;
      lastObserved: string | null;
    }
  | { state: 'needs-index'; command: string }
  | { state: 'error';       message: string };

const REPORT_METRICS = new Set<string>(Object.values(HEADLINE_METRICS));
const EVIDENCE_PREFIX = 'evidence.';

/** Firestore answers FAILED_PRECONDITION for both a missing and a building index. */
function isMissingIndex(err: unknown): boolean {
  const e = err as { code?: number | string; message?: string };
  const msg = (e?.message ?? '').toLowerCase();
  return e?.code === 9 || e?.code === 'failed-precondition' || msg.includes('requires an index');
}

function classify(metric: string): MetricGroup {
  if (metric.startsWith(EVIDENCE_PREFIX)) return 'evidence';
  if (REPORT_METRICS.has(metric)) return 'report';
  return 'series';
}

function labelFor(metric: string): string {
  return metric.startsWith(EVIDENCE_PREFIX) ? metric.slice(EVIDENCE_PREFIX.length) : metric;
}

const GROUP_ORDER: Record<MetricGroup, number> = { report: 0, evidence: 1, series: 2 };

export async function getStoreHealth(): Promise<StoreHealth> {
  try {
    // Registry first, then the declared maps, so nothing is lost either way.
    // btc_price_usd is written by both the snapshot and the backfill, so the
    // static maps overlap on purpose.
    const ids = [...new Set([
      ...(await listKnownMetrics()),
      ...Object.values(HEADLINE_METRICS),
      ...Object.values(BACKFILL_METRICS),
    ])];

    const summaries = await Promise.all(ids.map((m) => describeMetric(m)));

    const metrics: MetricSummary[] = summaries
      .map((s) => ({ ...s, label: labelFor(s.metric), group: classify(s.metric) }))
      .sort((a, b) =>
        a.group === b.group
          ? a.label.localeCompare(b.label)
          : GROUP_ORDER[a.group] - GROUP_ORDER[b.group],
      );

    // The newest metricDate anywhere, so the panel can answer "did it run today"
    // without the reader comparing sixteen rows by eye.
    const lastObserved = metrics.reduce<string | null>(
      (acc, m) => (m.last && (!acc || m.last > acc) ? m.last : acc),
      null,
    );

    return {
      state: 'ready',
      metrics,
      populated: metrics.filter((m) => m.count > 0).length,
      total: metrics.length,
      lastObserved,
    };
  } catch (err) {
    if (isMissingIndex(err)) {
      return {
        state: 'needs-index',
        command: 'firebase deploy --only firestore:indexes,firestore:rules',
      };
    }
    return { state: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}
