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

export type Candidate = {
  id:          string;      // EDGAR's own "{accession}:{filename}", stable across pulls
  accession:   string;
  cik:         string;
  company:     string;
  form:        string;
  fileDate:    string;      // YYYY-MM-DD
  fileType:    string;
  description: string;
  items:       string[];
  sics:        string[];
  /** Filer sits in a finance SIC. A hint for triage order, not a filter. */
  notable:     boolean;
  matchedTerms: string[];
  url:         string;      // the document itself
  indexUrl:    string;      // the filing index, more readable when the doc is an exhibit
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
function archiveUrls(cik: string, accession: string, filename: string) {
  const cikTrim = cik.replace(/^0+/, '');
  const accFlat = accession.replace(/-/g, '');
  const base = `https://www.sec.gov/Archives/edgar/data/${cikTrim}/${accFlat}`;
  return { url: `${base}/${filename}`, indexUrl: `${base}/${accession}-index.htm` };
}

function toCandidate(hit: Hit, term: string, now: string): Candidate | null {
  const src = hit._source ?? {};
  const [accession, filename] = hit._id.split(':');
  const cik = src.ciks?.[0];
  if (!accession || !filename || !cik) return null;

  const sics = src.sics ?? [];
  const { url, indexUrl } = archiveUrls(cik, accession, filename);

  return {
    id:          hit._id,
    accession,
    cik,
    // display_names look like "CaliberCos Inc.  (CWD)  (CIK 0001627282)".
    // The trailing identifiers are already separate fields, so they are trimmed.
    company:     (src.display_names?.[0] ?? 'Unknown').replace(/\s*\(CIK[^)]*\)\s*$/, '').trim(),
    form:        src.form ?? src.root_forms?.[0] ?? '',
    fileDate:    src.file_date ?? '',
    fileType:    src.file_type ?? '',
    description: src.file_description ?? '',
    items:       src.items ?? [],
    sics,
    notable:     sics.some((s) => FINANCE_SICS.has(s)),
    matchedTerms: [term],
    url,
    indexUrl,
    status:      'new',
    firstSeen:   now,
    lastSeen:    now,
  };
}

export type SearchResult = { candidates: Candidate[]; errors: string[] };

/**
 * Run every query over a date window and merge the hits.
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
      for (const hit of json.hits?.hits ?? []) {
        const c = toCandidate(hit, term, now);
        if (!c) continue;
        const held = merged.get(c.id);
        if (held) {
          if (!held.matchedTerms.includes(term)) held.matchedTerms.push(term);
        } else {
          merged.set(c.id, c);
        }
      }
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
 * A filing that reappears in a later pull updates lastSeen and its matched
 * terms but keeps its status. Dismissing something and having it come back the
 * next morning would make the feed useless within a week.
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
        batch.update(col.doc(c.id), {
          lastSeen: c.lastSeen,
          matchedTerms: [...new Set([...(prev.matchedTerms ?? []), ...c.matchedTerms])],
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
