import { NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/auth/cron';
import { collectBackfill, BACKFILL_METRICS, type BackfillSource } from '@/lib/store/backfill';
import { writeObservations, utcDate } from '@/lib/store/observations';

// One-time seeding of the observation store from vendor historical series.
//
// Every row written here is flagged `backfilled: true`. That flag is not
// bookkeeping — it is the difference between "this is what the data says about
// March 2023" and "this is what Skyline said in March 2023". Only the second
// supports a track record, and backfilled rows are the first. See the caveat at
// the top of lib/store/backfill.ts.
//
// Sliced rather than all-at-once: a full on-chain seed from 2012 is tens of
// thousands of rows, which will outrun a serverless timeout. The response
// carries `nextOffset` when there is more to write, so a run can be resumed by
// calling again with that offset instead of starting over.
//
// POST only. This writes a lot and should not be reachable by anything that
// prefetches links.

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SOURCES = [...Object.keys(BACKFILL_METRICS), 'all'] as const;
const DEFAULT_LIMIT = 5000;
const MAX_LIMIT = 20000;

function isSource(v: string): v is BackfillSource {
  return (SOURCES as readonly string[]).includes(v);
}

export async function POST(req: Request) {
  if (!(await isCronAuthorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const url = new URL(req.url);
  const sourceParam = url.searchParams.get('source')?.trim() ?? 'all';
  const start = url.searchParams.get('start')?.trim() || '2012-01-01';
  const dryRun = url.searchParams.get('dryRun') === '1';
  const offset = Math.max(0, Number(url.searchParams.get('offset') ?? 0) || 0);
  const limit = Math.min(
    Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
    MAX_LIMIT,
  );

  if (!isSource(sourceParam)) {
    return NextResponse.json(
      { error: `source must be one of: ${SOURCES.join(', ')}` },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    return NextResponse.json({ error: 'start must be YYYY-MM-DD' }, { status: 400 });
  }

  const startedAt = Date.now();
  const observedDate = utcDate();

  try {
    const plan = await collectBackfill(sourceParam, start, observedDate);
    const slice = plan.rows.slice(offset, offset + limit);
    const nextOffset = offset + slice.length < plan.rows.length ? offset + slice.length : null;

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        source: sourceParam,
        start,
        totalRows: plan.rows.length,
        sliceRows: slice.length,
        nextOffset,
        errors: plan.errors,
        elapsedMs: Date.now() - startedAt,
      });
    }

    const result = await writeObservations(slice);

    return NextResponse.json({
      ok: true,
      source: sourceParam,
      start,
      totalRows: plan.rows.length,
      written: result.written,
      skipped: result.skipped,
      nextOffset,
      errors: plan.errors,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/backfill] failed:', message);
    return NextResponse.json(
      { ok: false, error: message, elapsedMs: Date.now() - startedAt },
      { status: 500 },
    );
  }
}
