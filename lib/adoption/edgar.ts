import type { Firestore } from 'firebase-admin/firestore';

// SEC EDGAR full-text search, as a candidate feed for the Adoption Index.
//
// The primary source under most institutional announcements is a filing, and
// filings are free, structured, and indexed the day they land. This turns the
// weekly scan from "go looking" into "review this list".
//
// It does not classify anything. EDGAR will happily surface a shell company
// announcing a pickleball token alongside a bank launching custody, and no
// keyword filter separates those reliably. Deciding which is which is the
// judgement that makes the index worth owning, so the feed's only job is to put
// candidates in front of a person.
//
// One row per FILING, not per document. EDGAR indexes each matching exhibit
// separately, so a single S-1/A whose cover letter, trust agreement and
// prospectus all mention "tokenization" arrives as three hits. Keying on the
// accession number collapses those into one row with the exhibits listed under
// it, which is the difference between reviewing a filing once and dismissing it
// three times.
//
// SEC requires a declared User-Agent and refuses requests without one (403).
// It does not require a personal email: a neutral identifier naming the
// application is accepted, and SEC_USER_AGENT overrides it if you would rather
// declare a contact address.
//
// Rate limit is 10 requests/second. The daily pull makes one request per query
// term, so it is nowhere near it.

const SEARCH_ENDPOINT = 'https://efts.sec.gov/LATEST/search-index';

function userAgent(): string {
  return process.env.SEC_USER_AGENT?.trim()
    || 'Skyline Cycle Terminal (contact via skylinecycleterminal.com)';
}

/**
 * Phrase queries, deliberately narrow.
 *
 * Broad terms like "blockchain" return mostly noise from shell companies. These
 * are the phrases that show up when an institution is describing something it
 * has actually built. Adjust freely: the cost of a bad term is review time, not
 * bad data, because nothing enters the index without being classified by hand.
 */
export const QUERIES = [
  '"tokenization"',
  '"tokenized fund"',
  '"digital asset custody"',
  '"stablecoin"',
  '"distributed ledger"',
] as const;

/**
 * SIC codes for the filers worth a second look: depository institutions,
 * brokers, investment advisers, funds and trusts. A match does not mean the
 * filing matters, only that the filer is the kind of institution this index
 * tracks. Everything else still appears, just unflagged.
 */
const FINANCE_SICS = new Set([
  '6021', '6022', '6029', '6035', '6036', '6099', '6111', '6141', '6153', '6159',
  '6199', '6200', '6211', '6221', '6282', '6289', '6311', '6411', '6722', '6726', '6770',
]);

export type CandidateDocument = {
  filename:    string;
  fileType:    string;
  description: string;
  url:         string;
};

export type Candidate = {
  /** The accession number. One filing, one row, however many exhibits matched. */
  id:          string;
  accession:   string;
  cik:         string;
  company:     string;
  form:        string;
  fileDate:    string;      // YYYY-MM-DD
  items:       string[];
  sics:        string[];
  /** Filer sits in a finance SIC. A hint for triage order, not a filter. */
  notable:     boolean;
  matchedTerms: string[];
  /** Every matching exhibit within the filing. */
  documents:   CandidateDocument[];
  /** The filing index on sec.gov, which lists all its documents. */
  indexUrl:    string;
  status:      'new' | 'dismissed' | 'linked';
  linkedInitiativeId?: string;
  firstSeen:   string;
  lastSeen:    string;
};

export const COLLECTION = 'edgar_candidates';

// ─── Search ───────────────────────────────────────────────────────────────────

type Hit = {
  _id: string;
  _source: {
    ciks?: string[];
    display_names?: string[];
    root_forms?: string[];
    form?: string;
    file_date?: string;
    file_type?: string;
    file_description?: string;
    items?: string[];
    sics?: string[];
    adsh?: string;
  };
};

/** EDGAR archive paths drop the leading zeros from the CIK and the dashes from
 *  the accession number. Getting either wrong yields a 404. */
function archiveBase(cik: string, accession: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, '')}/${accession.replace(/-/g, '')}`;
}

function mergeHit(into: Map<string, Candidate>, hit: Hit, term: string, now: string): void {
  const src = hit._source ?? {};
  const [accession, filename] = hit._id.split(':');
  const cik = src.ciks?.[0];
  if (!accession || !filename || !cik) return;

  const doc: CandidateDocument = {
    filename,
    fileType:    src.file_type ?? '',
    description: src.file_description ?? '',
    url:         `${archiveBase(cik, accession)}/${filename}`,
  };

  const held = into.get(accession);
  if (held) {
    if (!held.matchedTerms.includes(term)) held.matchedTerms.push(term);
    if (!held.documents.some((d) => d.filename === filename)) held.documents.push(doc);
    return;
  }

  const sics = src.sics ?? [];
  into.set(accession, {
    id:        accession,
    accession,
    cik,
    // display_names look like "CaliberCos Inc.  (CWD)  (CIK 0001627282)".
    // The CIK is already its own field, so the trailing copy is trimmed.
    company:   (src.display_names?.[0] ?? 'Unknown').replace(/\s*\(CIK[^)]*\)\s*$/, '').trim(),
    form:      src.form ?? src.root_forms?.[0] ?? '',
    fileDate:  src.file_date ?? '',
    items:     src.items ?? [],
    sics,
    notable:   sics.some((s) => FINANCE_SICS.has(s)),
    matchedTerms: [term],
    documents: [doc],
    indexUrl:  `${archiveBase(cik, accession)}/${accession}-index.htm`,
    status:    'new',
    firstSeen: now,
    lastSeen:  now,
  });
}

export type SearchResult = { candidates: Candidate[]; errors: string[] };

/**
 * Run every query over a date window and merge the hits by filing.
 *
 * A filing that matches several terms appears once with all of them recorded,
 * because how many phrases it hit is a rough relevance signal worth keeping.
 */
export async function searchEdgar(from: string, to: string): Promise<SearchResult> {
  const now = new Date().toISOString();
  const merged = new Map<string, Candidate>();
  const errors: string[] = [];

  for (const term of QUERIES) {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(term)}&startdt=${from}&enddt=${to}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        errors.push(`${term}: HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { hits?: { hits?: Hit[] } };
      for (const hit of json.hits?.hits ?? []) mergeHit(merged, hit, term, now);
    } catch (e) {
      errors.push(`${term}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const candidates = [...merged.values()].sort((a, b) =>
    b.fileDate.localeCompare(a.fileDate) || Number(b.notable) - Number(a.notable),
  );
  return { candidates, errors };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function getDb(): Promise<Firestore> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getAdminApp }  = await import('@/lib/auth/firebaseAdmin');
  return getFirestore(await getAdminApp());
}

export type StoreResult = { added: number; refreshed: number };

/**
 * Persist candidates, preserving triage.
 *
 * A filing that reappears in a later pull updates lastSeen, its matched terms
 * and any newly-matching exhibits, but keeps its status. Dismissing something
 * and having it come back the next morning would make the feed useless within
 * a week.
 */
export async function storeCandidates(candidates: Candidate[]): Promise<StoreResult> {
  if (!candidates.length) return { added: 0, refreshed: 0 };

  const db = await getDb();
  const col = db.collection(COLLECTION);
  let added = 0;
  let refreshed = 0;

  // 450 leaves headroom under Firestore's 500-writes-per-batch cap.
  for (let i = 0; i < candidates.length; i += 450) {
    const slice = candidates.slice(i, i + 450);
    const existing = await Promise.all(slice.map((c) => col.doc(c.id).get()));
    const batch = db.batch();

    slice.forEach((c, n) => {
      const snap = existing[n];
      if (snap.exists) {
        const prev = snap.data() as Candidate;
        const docs = [...(prev.documents ?? [])];
        for (const d of c.documents) {
          if (!docs.some((x) => x.filename === d.filename)) docs.push(d);
        }
        batch.update(col.doc(c.id), {
          lastSeen: c.lastSeen,
          matchedTerms: [...new Set([...(prev.matchedTerms ?? []), ...c.matchedTerms])],
          documents: docs,
        });
        refreshed += 1;
      } else {
        batch.set(col.doc(c.id), c);
        added += 1;
      }
    });

    await batch.commit();
  }

  return { added, refreshed };
}

export async function listCandidates(status: Candidate['status'] = 'new', limit = 60): Promise<Candidate[]> {
  const db = await getDb();
  const snap = await db.collection(COLLECTION)
    .where('status', '==', status)
    .orderBy('fileDate', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as Candidate);
}

export async function countCandidates(status: Candidate['status'] = 'new'): Promise<number> {
  const db = await getDb();
  const snap = await db.collection(COLLECTION).where('status', '==', status).count().get();
  return snap.data().count;
}

export async function setCandidateStatus(
  id: string,
  status: Candidate['status'],
  linkedInitiativeId?: string,
): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).doc(id).update({
    status,
    ...(linkedInitiativeId ? { linkedInitiativeId } : {}),
  });
}

// ─── Migration ────────────────────────────────────────────────────────────────

export type MigrationResult = {
  scanned:   number;
  collapsed: number;   // filings written in the new shape
  removed:   number;   // old per-document rows deleted
  preserved: number;   // filings whose triage carried across
};

/**
 * Collapse per-document rows into per-filing rows.
 *
 * The feed originally keyed on EDGAR's "{accession}:{filename}", so one filing
 * with three matching exhibits became three rows. This rewrites those as one
 * row per accession and deletes the originals.
 *
 * Triage carries across, and deliberately errs toward respecting a decision
 * already made: if any document of a filing was dismissed, the filing is
 * dismissed. Re-surfacing something already judged is worse than hiding
 * something not yet judged, because the first erodes trust in the feed.
 *
 * Idempotent. Rows already keyed on an accession have no colon in their id and
 * are skipped, so running it twice is harmless.
 */
export async function migrateToAccessionKeys(): Promise<MigrationResult> {
  const db = await getDb();
  const col = db.collection(COLLECTION);
  const snap = await col.get();

  type Legacy = Candidate & { url?: string; fileType?: string; description?: string };

  const groups = new Map<string, { docs: Legacy[]; ids: string[] }>();
  let scanned = 0;

  for (const d of snap.docs) {
    if (!d.id.includes(':')) continue;   // already migrated
    scanned += 1;
    const data = d.data() as Legacy;
    const accession = d.id.split(':')[0];
    const g = groups.get(accession) ?? { docs: [], ids: [] };
    g.docs.push(data);
    g.ids.push(d.id);
    groups.set(accession, g);
  }

  if (groups.size === 0) return { scanned: 0, collapsed: 0, removed: 0, preserved: 0 };

  let collapsed = 0;
  let removed = 0;
  let preserved = 0;

  for (const [accession, g] of groups) {
    const first = g.docs[0];
    const statuses = g.docs.map((d) => d.status);
    const status: Candidate['status'] =
      statuses.includes('dismissed') ? 'dismissed'
      : statuses.includes('linked') ? 'linked'
      : 'new';
    if (status !== 'new') preserved += 1;

    const documents: CandidateDocument[] = [];
    for (const d of g.docs) {
      const filename = (d as unknown as { id?: string }).id?.split(':')[1]
        ?? d.url?.split('/').pop()
        ?? '';
      if (!filename || documents.some((x) => x.filename === filename)) continue;
      documents.push({
        filename,
        fileType:    d.fileType ?? '',
        description: d.description ?? '',
        url:         d.url ?? `${archiveBase(first.cik, accession)}/${filename}`,
      });
    }

    const merged: Candidate = {
      id: accession,
      accession,
      cik:       first.cik,
      company:   first.company,
      form:      first.form,
      fileDate:  first.fileDate,
      items:     first.items ?? [],
      sics:      first.sics ?? [],
      notable:   first.notable ?? false,
      matchedTerms: [...new Set(g.docs.flatMap((d) => d.matchedTerms ?? []))],
      documents,
      indexUrl:  first.indexUrl ?? `${archiveBase(first.cik, accession)}/${accession}-index.htm`,
      status,
      ...(g.docs.find((d) => d.linkedInitiativeId)
        ? { linkedInitiativeId: g.docs.find((d) => d.linkedInitiativeId)!.linkedInitiativeId }
        : {}),
      firstSeen: g.docs.map((d) => d.firstSeen).sort()[0] ?? new Date().toISOString(),
      lastSeen:  g.docs.map((d) => d.lastSeen).sort().pop() ?? new Date().toISOString(),
    };

    const batch = db.batch();
    batch.set(col.doc(accession), merged);
    for (const oldId of g.ids) batch.delete(col.doc(oldId));
    await batch.commit();

    collapsed += 1;
    removed += g.ids.length;
  }

  return { scanned, collapsed, removed, preserved };
}
