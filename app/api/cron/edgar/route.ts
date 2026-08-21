import { NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/auth/cron';
import { searchEdgar, storeCandidates, QUERIES } from '@/lib/adoption/edgar';

// Daily pull of SEC EDGAR full-text search into the Adoption Index candidate feed.
//
// Runs a fixed set of phrase queries over a trailing window and stores whatever
// they surface for review. Nothing is classified here, and nothing enters the
// index automatically: the feed exists so the weekly scan becomes "review this
// list" rather than "go looking".
//
// The window is trailing rather than "since yesterday" because EDGAR indexes
// filings with a lag and amends them afterwards. Re-covering the last week costs
// nothing, since storeCandidates() is keyed on EDGAR's own filing id and
// preserves triage: a dismissed candidate that reappears stays dismissed.
//
// Auth: bearer CRON_SECRET, or an admin session. See lib/auth/cron.ts.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_WINDOW_DAYS = 7;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

async function run(req: Request) {
  if (!(await isCronAuthorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dryRun') === '1';
  const days = Math.min(Math.max(1, Number(url.searchParams.get('days') ?? DEFAULT_WINDOW_DAYS) || DEFAULT_WINDOW_DAYS), 365);
  const from = url.searchParams.get('from')?.trim() || isoDaysAgo(days);
  const to   = url.searchParams.get('to')?.trim()   || new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const { candidates, errors } = await searchEdgar(from, to);

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        from, to,
        queries: QUERIES,
        found: candidates.length,
        notable: candidates.filter((c) => c.notable).length,
        sample: candidates.slice(0, 10).map((c) => ({
          company: c.company, form: c.form, fileDate: c.fileDate, notable: c.notable,
        })),
        errors,
        elapsedMs: Date.now() - startedAt,
      });
    }

    const stored = await storeCandidates(candidates);

    return NextResponse.json({
      ok: true,
      from, to,
      found: candidates.length,
      added: stored.added,
      refreshed: stored.refreshed,
      notable: candidates.filter((c) => c.notable).length,
      errors,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/edgar] failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request)  { return run(req); }
export async function POST(req: Request) { return run(req); }
