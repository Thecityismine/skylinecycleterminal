import { describeMetric } from '@/lib/store/observations';
import { HEADLINE_METRICS } from '@/lib/store/snapshot';
import { BACKFILL_METRICS } from '@/lib/store/backfill';

// Store coverage, shaped for the admin panel.
//
// Reads against `observations` need the composite indexes in
// firestore.indexes.json, and those are a separate deploy from the app. Until
// they land, every read fails with the same Firestore error. That is a setup
// step rather than a fault, so it is detected and reported as its own state
// instead of surfacing as a broken page.

export type MetricSummary = {
  metric: string;
  count:  number;
  first:  string | null;
  last:   string | null;
  group:  'report' | 'series';
};

export type StoreHealth =
  | { state: 'ready';       metrics: MetricSummary[]; populated: number; total: number }
  | { state: 'needs-index'; command: string }
  | { state: 'error';       message: string };

const REPORT_METRICS = new Set<string>(Object.values(HEADLINE_METRICS));

/** Firestore answers FAILED_PRECONDITION when a composite index is missing. */
function isMissingIndex(err: unknown): boolean {
  const e = err as { code?: number | string; message?: string };
  const msg = (e?.message ?? '').toLowerCase();
  return e?.code === 9 || e?.code === 'failed-precondition' || msg.includes('requires an index');
}

export async function getStoreHealth(): Promise<StoreHealth> {
  // btc_price_usd is written by both the snapshot and the backfill, so the two
  // id maps overlap on purpose.
  const ids = [...new Set([
    ...Object.values(HEADLINE_METRICS),
    ...Object.values(BACKFILL_METRICS),
  ])];

  try {
    const summaries = await Promise.all(ids.map((m) => describeMetric(m)));

    const metrics: MetricSummary[] = summaries
      .map((s) => ({ ...s, group: REPORT_METRICS.has(s.metric) ? 'report' as const : 'series' as const }))
      .sort((a, b) =>
        a.group === b.group ? a.metric.localeCompare(b.metric) : a.group === 'report' ? -1 : 1,
      );

    return {
      state: 'ready',
      metrics,
      populated: metrics.filter((m) => m.count > 0).length,
      total: metrics.length,
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
