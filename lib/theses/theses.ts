import type { Firestore } from 'firebase-admin/firestore';
import { readSeries } from '@/lib/store/observations';
import {
  COLLECTION, slugify, utcDate,
  evaluateThesis, metricsReferencedBy,
  type Thesis, type ThesisReview, type ThesisStatus, type ThesisEvaluation,
  type MetricPoint,
} from '@/lib/theses/schema';

// Thesis register — Firestore IO and evaluation against the observation store.
//
// The pure half (types, rule evaluation, track record) lives in ./schema.ts and
// is re-exported below, so server callers can import everything from here.
// Client components must import from ./schema.ts directly.
//
// firebase-admin is imported dynamically inside each function. See
// lib/auth/firebaseAdmin.ts for why a static import breaks the Turbopack build.

export * from '@/lib/theses/schema';

async function getDb(): Promise<Firestore> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAdminApp }  = await import('@/lib/auth/firebaseAdmin');
  return getFirestore(await getAdminApp());
}

// ─── Write ────────────────────────────────────────────────────────────────────

export type ThesisInput = Omit<
  Thesis, 'id' | 'status' | 'statusNote' | 'statusChangedAt' | 'reviews' | 'createdAt' | 'updatedAt'
> & { id?: string };

export async function createThesis(input: ThesisInput): Promise<Thesis> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = input.id?.trim() || slugify(input.title);

  const doc: Thesis = {
    ...input,
    id,
    title:     input.title.trim(),
    status:    'active',
    statusNote: '',
    statusChangedAt: now,
    reviews:   [],
    createdAt: now,
    updatedAt: now,
  };

  // create() rather than set(): re-entering a thesis that already exists would
  // silently discard its reviews and its recorded status.
  await db.collection(COLLECTION).doc(id).create(doc);
  return doc;
}

export async function updateThesis(
  id: string,
  patch: Partial<Omit<Thesis, 'id' | 'status' | 'statusChangedAt' | 'reviews' | 'createdAt' | 'updatedAt'>>,
): Promise<Thesis> {
  const db = await getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('No thesis with id "' + id + '"');

  const existing = snap.data() as Thesis;
  const updated: Thesis = {
    ...existing,
    ...patch,
    // Re-asserted after the spread so a malformed patch cannot rewrite the
    // record of what was decided and when.
    id:              existing.id,
    status:          existing.status,
    statusChangedAt: existing.statusChangedAt,
    reviews:         existing.reviews,
    createdAt:       existing.createdAt,
    updatedAt:       new Date().toISOString(),
  };

  await ref.set(updated);
  return updated;
}

/**
 * Close or reopen a thesis.
 *
 * The note is required for anything other than reopening. A thesis marked wrong
 * with no explanation teaches nothing later, and the whole point of keeping the
 * wrong ones visible is being able to read back why.
 */
export async function setThesisStatus(
  id: string,
  status: ThesisStatus,
  note: string,
): Promise<Thesis> {
  const db = await getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('No thesis with id "' + id + '"');

  const existing = snap.data() as Thesis;
  const now = new Date().toISOString();
  const updated: Thesis = {
    ...existing,
    status,
    statusNote: note.trim(),
    statusChangedAt: now,
    updatedAt: now,
  };

  await ref.set(updated);
  return updated;
}

/**
 * Append a review.
 *
 * Reviews accumulate rather than replace, so conviction drifting over time is
 * legible afterwards. Quietly rewriting your own confidence is the failure this
 * register exists to prevent.
 */
export async function addReview(id: string, review: ThesisReview): Promise<Thesis> {
  const db = await getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('No thesis with id "' + id + '"');

  const existing = snap.data() as Thesis;
  const reviews = [...(existing.reviews ?? []), review]
    .sort((a, b) => a.date.localeCompare(b.date));

  const updated: Thesis = {
    ...existing,
    reviews,
    conviction: review.conviction,   // the newest review is the current view
    updatedAt: new Date().toISOString(),
  };

  await ref.set(updated);
  return updated;
}

export async function deleteThesis(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).doc(id).delete();
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listTheses(): Promise<Thesis[]> {
  const db = await getDb();
  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => d.data() as Thesis);
}

export async function getThesis(id: string): Promise<Thesis | null> {
  const db = await getDb();
  const snap = await db.collection(COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as Thesis) : null;
}

// ─── Evaluation against the store ─────────────────────────────────────────────

/**
 * Check every active thesis against the observation store.
 *
 * This is the reason the register is worth building now rather than earlier.
 * The store already records these metrics every morning, so an invalidation
 * condition costs nothing to check and you learn a thesis broke on the day it
 * broke instead of whenever you next reread it.
 *
 * Only active theses are evaluated. A closed thesis tripping a rule is noise.
 */
export async function evaluateActiveTheses(
  lookbackDays = 120,
): Promise<ThesisEvaluation[]> {
  const theses = (await listTheses()).filter((t) => t.status === 'active');
  if (!theses.length) return [];

  const metrics = metricsReferencedBy(theses);
  if (!metrics.length) return theses.map((t) => evaluateThesis(t, {}));

  const from = new Date(Date.now() - lookbackDays * 86_400_000).toISOString().slice(0, 10);

  // Each metric is fetched once, however many rules reference it.
  const seriesByMetric: Record<string, MetricPoint[]> = {};
  await Promise.all(metrics.map(async (m) => {
    try {
      const rows = await readSeries(m, { from });
      seriesByMetric[m] = rows
        .filter((r) => r.value != null)
        .map((r) => ({ metricDate: r.metricDate, value: r.value as number }));
    } catch {
      // A metric the store cannot read is left absent, which surfaces as
      // `unchecked` rather than as a silent pass.
      seriesByMetric[m] = [];
    }
  }));

  return theses.map((t) => evaluateThesis(t, seriesByMetric));
}

/** Theses whose rules have actually tripped, for alerting. */
export async function trippedTheses(): Promise<ThesisEvaluation[]> {
  return (await evaluateActiveTheses()).filter((e) => e.tripped);
}

export { utcDate };
