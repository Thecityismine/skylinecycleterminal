import { NextResponse } from 'next/server';
import { createDraft, logRun } from '@/lib/notion/contentQueue';
import { NotionError } from '@/lib/notion/client';
import { buildSubscriberPost, type Mover } from '@/lib/marketing/subscriberPost';
import { readSeries, listKnownMetrics } from '@/lib/store/observations';
import { HEADLINE_METRICS } from '@/lib/store/snapshot';

// Drafts the weekly subscriber-only X post.
//
// Reads the observation store rather than the live endpoints, because the point
// of this post is the CHANGE, and change needs history. The store is the only
// place week-over-week movement in an individual indicator exists — the site
// shows today's value and the report shows today's ledger.
//
// pointInTimeOnly is not optional here. Backfilled rows are real data but they
// already contain every revision the vendor has since made, so a delta computed
// across them would describe a revision rather than a move. The store's own
// documentation is explicit that anything claiming a track record must exclude
// them, and "what changed this week" is exactly such a claim.

export const dynamic = 'force-dynamic';

/** How far back to look for the comparison point. */
const WINDOW_DAYS = 7;

/** Below this, a mover is noise rather than news. */
const MIN_DELTA = 1;

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const ranAt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);
  const from = iso(new Date(now.getTime() - (WINDOW_DAYS + 4) * 86_400_000));

  try {
    const metrics = await listKnownMetrics();
    const evidence = metrics.filter((m) => m.startsWith('evidence.cycle:'));

    /** First and last point-in-time values of a metric inside the window. */
    const span = async (metric: string) => {
      const rows = await readSeries(metric, { from, pointInTimeOnly: true });
      const vals = rows.filter((r) => r.value != null);
      if (vals.length < 2) return null;
      const a = vals[0];
      const b = vals[vals.length - 1];
      return {
        from: a.value as number,
        to: b.value as number,
        reading: b.reading ?? null,
        days: Math.round(
          (new Date(b.metricDate).getTime() - new Date(a.metricDate).getTime()) / 86_400_000,
        ),
      };
    };

    const movers: Mover[] = [];
    let daysSpanned = 0;

    for (const metric of evidence) {
      const s = await span(metric);
      if (!s) continue;
      daysSpanned = Math.max(daysSpanned, s.days);
      const delta = s.to - s.from;
      if (Math.abs(delta) < MIN_DELTA) continue;
      movers.push({
        name: metric.replace('evidence.cycle:', ''),
        from: s.from,
        to: s.to,
        delta,
        reading: s.reading,
      });
    }

    movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const score = await span(HEADLINE_METRICS.cycleScore);
    const bottom = await span(HEADLINE_METRICS.bottomProbability);

    // Nothing to say is a legitimate outcome. A post asserting movement in a
    // week where nothing moved would be the first dishonest thing this account
    // published.
    if (!movers.length && !score) {
      const detail = `No point-in-time movement found since ${from}. Store may be too young.`;
      await logRun({ job: 'Subscriber Note', outcome: 'Skipped', ranAt, detail });
      return NextResponse.json({ ok: false, reason: detail }, { status: 200 });
    }

    const body = buildSubscriberPost({
      weekOf:      ranAt,
      daysSpanned: daysSpanned || WINDOW_DAYS,
      scoreFrom:   score?.from ?? null,
      scoreTo:     score?.to ?? null,
      bottomFrom:  bottom?.from ?? null,
      bottomTo:    bottom?.to ?? null,
      movers,
    });

    const top = movers[0];
    const pageId = await createDraft({
      title:        `Subscribers · ${ranAt} · ${top ? top.name : 'no mover'}`,
      channel:      'X Subscribers',
      body,
      scheduledFor: ranAt,
      chartUsed:    top?.name ?? null,
      scoreAtBuild: score ? Math.round(score.to) : null,
      notes:        'Needs your read written before posting. Numbers are week-over-week from the observation store.',
    });

    await logRun({
      job:      'Subscriber Note',
      outcome:  'Partial',
      ranAt,
      detail:   `Subscriber note drafted. ${movers.length} movers over ${daysSpanned}d, biggest ${top ? `${top.name} ${top.delta.toFixed(1)}` : 'none'}. Awaiting the written read.`,
      produced: [pageId],
    });

    return NextResponse.json({
      ok: true,
      weekOf: ranAt,
      daysSpanned,
      moverCount: movers.length,
      biggest: top ? { name: top.name, delta: Number(top.delta.toFixed(2)) } : null,
    });
  } catch (err) {
    const detail = err instanceof NotionError ? err.message : err instanceof Error ? err.message : String(err);
    await logRun({ job: 'Subscriber Note', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }
}
