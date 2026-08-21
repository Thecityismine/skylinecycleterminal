import type { Firestore } from 'firebase-admin/firestore';

// Skyline observation store — the append-only history behind every point-in-time
// claim the terminal makes.
//
// Why this exists: every research surface in this codebase recomputes from live
// vendor calls on each request, so "what did the score read last March" has no
// answer beyond whatever the vendors say about last March today. A track record
// needs the reading as it stood on the day, not the reading as it stands now
// after the vendor has revised its series. This collection is that record.
//
// Two dates, and the distinction is the entire point:
//
//   metricDate    the day the value describes      (BTC close for 2026-08-19)
//   observedDate  the day Skyline recorded it      (2026-08-20)
//
// A revision therefore never overwrites history. It lands as a second document
// with the same metricDate and a later observedDate. Reading "as known on date
// X" means taking, for each metricDate, the newest observedDate <= X. Reading
// "as known today" is that same query with X = today.
//
// Writes go through firebase-admin only — the collection is closed to the client
// SDK in firestore.rules, because a publicly writable history is not evidence.
//
// firebase-admin is imported dynamically inside each function rather than at the
// top of the file. See lib/auth/firebaseAdmin.ts for why a static import breaks
// the Turbopack build.

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Metric ids are plain strings rather than a closed union, because the ledger
 * that produces most of them is expected to grow. The convention:
 *
 *   headline scalars     `cycle_score`, `btc_price_usd`, `weighted_extension`
 *   evidence ledger item `evidence.<EvidenceItem.id>`
 *
 * snake_case throughout, no spaces, stable across renames of the display label.
 */
export type MetricId = string;

export type Observation = {
  metric:       MetricId;
  metricDate:   string;          // YYYY-MM-DD, the day the value describes
  observedDate: string;          // YYYY-MM-DD, the day it was recorded
  value:        number | null;
  source:       string;          // adapter or computation that produced it
  /** The figure as displayed, kept for audit. Never parsed back into a number. */
  reading?:     string;
  /**
   * True when the row was seeded from a vendor's historical series rather than
   * observed on the day. Backfilled rows are real data but they are NOT
   * point-in-time, because they already contain every revision the vendor has
   * made since. Anything claiming a track record must exclude them.
   */
  backfilled:   boolean;
};

export type ReadOptions = {
  /** Inclusive lower bound on metricDate, YYYY-MM-DD. */
  from?: string;
  /** Inclusive upper bound on metricDate, YYYY-MM-DD. */
  to?: string;
  /**
   * Point-in-time cutoff. Only observations recorded on or before this date are
   * considered, so the result is the series as Skyline knew it on that day.
   * Defaults to today, which yields the best current knowledge.
   */
  asOf?: string;
  /** Exclude backfilled rows. Use for anything that claims a track record. */
  pointInTimeOnly?: boolean;
};

export const COLLECTION = 'observations';

// Registry of every metric id the store has ever written.
//
// Firestore has no DISTINCT, and the evidence-ledger ids are generated per run
// rather than declared anywhere, so there is no static list to read them off.
// Scanning the collection to derive them would mean reading every row, which
// grows without bound. One document, updated on write, answers it in a single
// read no matter how large the history gets.
const REGISTRY_COLLECTION = 'observations_meta';
const REGISTRY_DOC = 'registry';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Today in UTC, YYYY-MM-DD. All dates in this store are UTC calendar dates. */
export function utcDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Document id. Deterministic in all three coordinates, which makes re-running
 * the same snapshot on the same day idempotent rather than duplicative, while
 * still letting a later run record a revision as its own row.
 */
export function docId(o: Pick<Observation, 'metric' | 'metricDate' | 'observedDate'>): string {
  return `${o.metric}__${o.metricDate}__${o.observedDate}`;
}

async function getDb(): Promise<Firestore> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAdminApp }  = await import('@/lib/auth/firebaseAdmin');
  return getFirestore(await getAdminApp());
}

// Firestore caps a batch at 500 writes. 450 leaves headroom and keeps the
// arithmetic obvious.
const BATCH_LIMIT = 450;

function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export type WriteResult = {
  written: number;
  skipped: number;   // rows whose value was null and therefore not worth storing
};

/**
 * Append observations. Idempotent per (metric, metricDate, observedDate).
 *
 * Null values are skipped rather than stored: a gap in the series and a stored
 * null read identically downstream, and not writing them keeps the collection
 * proportional to the data that actually exists.
 */
export async function writeObservations(rows: Observation[]): Promise<WriteResult> {
  const usable = rows.filter((r) => r.value != null && Number.isFinite(r.value));
  const skipped = rows.length - usable.length;
  if (usable.length === 0) return { written: 0, skipped };

  const { FieldValue } = await import('firebase-admin/firestore');
  const db = await getDb();
  const col = db.collection(COLLECTION);

  for (const group of chunk(usable, BATCH_LIMIT)) {
    const batch = db.batch();
    for (const r of group) {
      batch.set(col.doc(docId(r)), {
        metric:       r.metric,
        metricDate:   r.metricDate,
        observedDate: r.observedDate,
        value:        r.value,
        source:       r.source,
        reading:      r.reading ?? null,
        backfilled:   r.backfilled,
        recordedAt:   FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  // arrayUnion rather than a keyed map: evidence ids contain dots, which
  // Firestore reads as field paths in some write forms. Array entries have no
  // such restriction, and the list is bounded by the number of distinct
  // metrics rather than by the size of the history.
  await db.collection(REGISTRY_COLLECTION).doc(REGISTRY_DOC).set(
    {
      metrics:   FieldValue.arrayUnion(...new Set(usable.map((r) => r.metric))),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { written: usable.length, skipped };
}

/**
 * Every metric id the store has written, from the registry.
 *
 * Returns an empty list rather than throwing when the registry does not exist
 * yet, so a store written before the registry existed degrades to whatever the
 * caller already knows statically instead of failing.
 */
export async function listKnownMetrics(): Promise<MetricId[]> {
  const db = await getDb();
  const snap = await db.collection(REGISTRY_COLLECTION).doc(REGISTRY_DOC).get();
  if (!snap.exists) return [];
  const metrics = (snap.data()?.metrics ?? []) as unknown;
  return Array.isArray(metrics) ? metrics.filter((m): m is string => typeof m === 'string') : [];
}

// ─── Read ─────────────────────────────────────────────────────────────────────

type StoredRow = {
  metric:       string;
  metricDate:   string;
  observedDate: string;
  value:        number;
  source:       string;
  reading:      string | null;
  backfilled:   boolean;
};

/**
 * The series for one metric, collapsed to one value per metricDate.
 *
 * Firestore cannot express "newest observedDate per metricDate" in a single
 * query, so the collapse happens here. Daily data keeps the result sets small
 * enough that this is the right trade against maintaining a second rollup
 * collection that could drift from the source rows.
 */
export async function readSeries(
  metric: MetricId,
  opts: ReadOptions = {},
): Promise<Observation[]> {
  const asOf = opts.asOf ?? utcDate();
  const db = await getDb();

  let q = db.collection(COLLECTION)
    .where('metric', '==', metric)
    .where('observedDate', '<=', asOf);

  if (opts.from) q = q.where('metricDate', '>=', opts.from);
  if (opts.to)   q = q.where('metricDate', '<=', opts.to);

  const snap = await q.get();

  // Keep, per metricDate, the row with the newest observedDate. Ties cannot
  // happen: observedDate is part of the document id.
  const newest = new Map<string, StoredRow>();
  for (const doc of snap.docs) {
    const r = doc.data() as StoredRow;
    if (opts.pointInTimeOnly && r.backfilled) continue;
    const held = newest.get(r.metricDate);
    if (!held || r.observedDate > held.observedDate) newest.set(r.metricDate, r);
  }

  return [...newest.values()]
    .sort((a, b) => a.metricDate.localeCompare(b.metricDate))
    .map((r) => ({
      metric:       r.metric,
      metricDate:   r.metricDate,
      observedDate: r.observedDate,
      value:        r.value,
      source:       r.source,
      reading:      r.reading ?? undefined,
      backfilled:   r.backfilled,
    }));
}

/** The most recent observation of a metric, or null if the store has none. */
export async function readLatest(
  metric: MetricId,
  opts: ReadOptions = {},
): Promise<Observation | null> {
  const series = await readSeries(metric, opts);
  return series.length ? series[series.length - 1] : null;
}

/** Row count and date span, for the health endpoint and for deciding whether a
 *  read path can trust the store yet. */
export async function describeMetric(metric: MetricId): Promise<{
  metric: MetricId;
  count: number;
  first: string | null;
  last: string | null;
}> {
  const series = await readSeries(metric);
  return {
    metric,
    count: series.length,
    first: series.length ? series[0].metricDate : null,
    last:  series.length ? series[series.length - 1].metricDate : null,
  };
}
