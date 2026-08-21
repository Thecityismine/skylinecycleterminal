import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/access';
import { describeMetric, readSeries } from '@/lib/store/observations';
import { HEADLINE_METRICS } from '@/lib/store/snapshot';
import { BACKFILL_METRICS } from '@/lib/store/backfill';

// What the observation store actually contains, per metric.
//
// The read paths in lib/research still compute live, so this is the only way to
// tell whether the daily snapshot is running and whether a metric has enough
// history to be worth reading from. Check it before switching any surface over.
//
// Admin only. It exposes the shape of the research history, which is the thing
// subscribers pay for.

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TRACKED = [
  ...Object.values(HEADLINE_METRICS),
  ...Object.values(BACKFILL_METRICS),
];

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const url = new URL(req.url);
  const metric = url.searchParams.get('metric')?.trim();

  try {
    // A single named metric returns its series, so a value can actually be
    // eyeballed rather than just counted.
    if (metric) {
      const series = await readSeries(metric, {
        pointInTimeOnly: url.searchParams.get('pointInTimeOnly') === '1',
      });
      return NextResponse.json({
        ok: true,
        metric,
        count: series.length,
        series: series.slice(-90),   // last 90 points is enough to sanity-check
      });
    }

    // Deduplicated: btc_price_usd is written by both the snapshot and the
    // backfill, so the two id maps overlap by design.
    const unique = [...new Set(TRACKED)];
    const summary = await Promise.all(unique.map((m) => describeMetric(m)));

    return NextResponse.json({
      ok: true,
      metrics: summary.sort((a, b) => a.metric.localeCompare(b.metric)),
      populated: summary.filter((m) => m.count > 0).length,
      total: unique.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[store/health] failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
