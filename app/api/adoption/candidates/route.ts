import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/access';
import { listCandidates, setCandidateStatus, type Candidate } from '@/lib/adoption/edgar';

// Triage for the EDGAR candidate feed.
//
// Dismiss is the common action and by far the most-used, because most filings
// matching "tokenization" are not institutional adoption. That is expected: the
// feed's value is that you see them all once, quickly, rather than that it
// guesses correctly.
//
// Dismissals are sticky. storeCandidates() preserves status across pulls, so a
// filing dismissed today does not return tomorrow.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const STATUSES: Candidate['status'][] = ['new', 'dismissed', 'linked'];

function isStatus(v: unknown): v is Candidate['status'] {
  return typeof v === 'string' && (STATUSES as string[]).includes(v);
}

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }
  const status = new URL(req.url).searchParams.get('status') ?? 'new';
  if (!isStatus(status)) {
    return NextResponse.json({ error: `status must be one of: ${STATUSES.join(', ')}` }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, candidates: await listCandidates(status) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[adoption/candidates] list failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    linkedInitiativeId?: string;
  };

  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  if (!isStatus(body.status)) {
    return NextResponse.json({ error: `status must be one of: ${STATUSES.join(', ')}` }, { status: 400 });
  }

  try {
    await setCandidateStatus(body.id, body.status, body.linkedInitiativeId);
    return NextResponse.json({ ok: true, id: body.id, status: body.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[adoption/candidates] update failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
