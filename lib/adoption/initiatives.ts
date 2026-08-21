import type { Firestore } from 'firebase-admin/firestore';
import {
  COLLECTION, currentFrom, slugify, sortHistory,
  type Initiative, type InitiativeInput, type StageEvent,
} from '@/lib/adoption/schema';

// Institutional Adoption Index — Firestore IO.
//
// The pure half (types, stage ladder, taxonomy, derived series) lives in
// ./schema.ts and is re-exported below, so server callers can keep importing
// everything from this one module. Client components must import from
// ./schema.ts directly: anything that reaches this file drags firebase-admin
// and google-auth-library into the browser bundle.
//
// One document per initiative an institution has taken on-chain, carrying its
// current stage and every stage it passed through. Galaxy runs this internally
// and has said they intend to publish it. The source material is public and the
// classified series built from it is not, which is the whole reason it is worth
// owning.
//
// firebase-admin is imported dynamically inside each function rather than at the
// top of the file. See lib/auth/firebaseAdmin.ts for why a static import breaks
// the Turbopack build.

export * from '@/lib/adoption/schema';

async function getDb(): Promise<Firestore> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAdminApp }  = await import('@/lib/auth/firebaseAdmin');
  return getFirestore(await getAdminApp());
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createInitiative(input: InitiativeInput): Promise<Initiative> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = input.id?.trim() || slugify(input.institution, input.name);

  const history: StageEvent[] = [{
    stage:      input.initialStage,
    date:       input.initialDate,
    sourceUrl:  input.sourceUrl,
    recordedAt: now,
    ...(input.note ? { note: input.note } : {}),
  }];

  const doc: Initiative = {
    id,
    institution:     input.institution.trim(),
    institutionType: input.institutionType,
    name:            input.name.trim(),
    category:        input.category,
    program:         input.program,
    verification:    input.verification,
    observableMetric: input.observableMetric,
    chain:           input.chain,
    asset:           input.asset,
    partner:         input.partner,
    country:         input.country,
    valueUsd:        input.valueUsd,
    summary:         input.summary.trim(),
    ...currentFrom(history),
    history,
    createdAt: now,
    updatedAt: now,
  };

  // create() rather than set(): re-entering an initiative that already exists is
  // a mistake worth surfacing, not a silent overwrite of its stage history.
  await db.collection(COLLECTION).doc(id).create(doc);
  return doc;
}

/**
 * Record that an initiative reached a new stage.
 *
 * Appends rather than replaces, because the transition is the data point. The
 * denormalised stage and stageDate follow the newest event.
 */
export async function addStageEvent(id: string, event: StageEvent): Promise<Initiative> {
  const db = await getDb();
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('No initiative with id "' + id + '"');

  const existing = snap.data() as Initiative;
  const history = sortHistory([...(existing.history ?? []), event]);
  const updated: Initiative = {
    ...existing,
    history,
    ...currentFrom(history),
    updatedAt: new Date().toISOString(),
  };

  await ref.set(updated);
  return updated;
}

export async function deleteInitiative(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).doc(id).delete();
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listInitiatives(): Promise<Initiative[]> {
  const db = await getDb();
  const snap = await db.collection(COLLECTION).orderBy('stageDate', 'desc').get();
  return snap.docs.map((d) => d.data() as Initiative);
}

export async function getInitiative(id: string): Promise<Initiative | null> {
  const db = await getDb();
  const snap = await db.collection(COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as Initiative) : null;
}
