import { NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/auth/cron';
import { collectSnapshot } from '@/lib/store/snapshot';
import { writeObservations, utcDate } from '@/lib/store/observations';

// Daily writer for the observation store.
//
// Runs the production research report once and appends what it read to
// `observations`, so the terminal accumulates a point-in-time history instead of
// recomputing an unrecorded present on every request.
//
// Nothing reads from the store yet. This route only fills it. Switching the
// research surfaces over to read from it is a separate change that should not
// happen until there is enough history to be worth reading, and until the run
// has been observed to be stable for a few days.
//
// Auth: bearer CRON_SECRET, or an admin session. See lib/auth/cron.ts.
//
// GET and POST both work. GET is what Vercel Cron and the Firebase scheduled
// function issue; POST is the honest verb for a write. Same handler either way.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function run(req: Request) {
  if (!(await isCronAuthorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dryRun') === '1';
  const observedDate = url.searchParams.get('observedDate')?.trim() || utcDate();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(observedDate)) {
    return NextResponse.json({ error: 'observedDate must be YYYY-MM-DD' }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const snapshot = await collectSnapshot(observedDate);

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        asOfDate: snapshot.asOfDate,
        observedDate: snapshot.observedDate,
        cycleScore: snapshot.cycleScore,
        wouldWrite: snapshot.rows.length,
        metrics: snapshot.rows.map((r) => r.metric),
        elapsedMs: Date.now() - startedAt,
      });
    }

    const result = await writeObservations(snapshot.rows);

    return NextResponse.json({
      ok: true,
      asOfDate: snapshot.asOfDate,
      observedDate: snapshot.observedDate,
      cycleScore: snapshot.cycleScore,
      written: result.written,
      skipped: result.skipped,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    // Surfaced rather than swallowed: a silent snapshot failure produces a gap in
    // the history that nothing downstream can distinguish from a genuine one.
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/snapshot] failed:', message);
    return NextResponse.json(
      { ok: false, error: message, elapsedMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}

export async function GET(req: Request)  { return run(req); }
export async function POST(req: Request) { return run(req); }
