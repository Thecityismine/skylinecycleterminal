import { NextResponse } from 'next/server';
import { createDraft, logRun } from '@/lib/notion/contentQueue';
import { NotionError } from '@/lib/notion/client';

// Writes the day's X post drafts into the Notion Content Queue.
//
// Reads /api/daily-post?format=json rather than calling the builders directly.
// That route is already the one source of the day's copy — the one a person
// opens in a browser — so consuming it means the scheduled draft and the manual
// read can never disagree. Recomputing here would be a second implementation of
// the same thing, which is the failure this codebase has already paid for once.
//
// Nothing posts. Rows land as Draft for a person to edit and publish by hand.

export const dynamic = 'force-dynamic';

type DailyPostJson = {
  date:  string;
  day:   string;
  score: number;
  zone:  string;
  post1: string;
  post2: { skipped: string } | { title: string; body: string };
  notes: { boundary: string | null; unavailable: string | null };
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const ranAt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

  let data: DailyPostJson;
  try {
    const res = await fetch(`${origin}/api/daily-post?format=json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`/api/daily-post returned ${res.status}`);
    data = (await res.json()) as DailyPostJson;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // The upstream route refuses to invent a score when its data is missing.
    // Honour that here: log the failure and write nothing rather than queue a
    // draft that quotes a number nobody can vouch for.
    await logRun({ job: 'Daily X Post', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  const produced: string[] = [];
  const created: string[] = [];
  const skipped: string[] = [];

  try {
    const notes = [data.notes.boundary, data.notes.unavailable].filter(Boolean).join(' · ') || null;

    produced.push(await createDraft({
      title:        `${data.day} ${data.date} · Score ${data.score} · ${data.zone}`,
      channel:      'X Daily',
      body:         data.post1,
      scheduledFor: data.date,
      scoreAtBuild: data.score,
      notes,
    }));
    created.push('Score post');

    if ('skipped' in data.post2) {
      // Thursday's ETF slot has no public endpoint and is written by hand. That
      // is a designed gap, not a fault, so the run is Partial rather than Failed.
      skipped.push(data.post2.skipped);
    } else {
      produced.push(await createDraft({
        title:        `${data.day} ${data.date} · ${data.post2.title}`,
        channel:      'X Daily',
        body:         data.post2.body,
        scheduledFor: data.date,
        scoreAtBuild: data.score,
        notes:        data.post2.title,
      }));
      created.push(data.post2.title);
    }
  } catch (err) {
    const detail = err instanceof NotionError ? err.message : String(err);
    await logRun({
      job: 'Daily X Post',
      outcome: produced.length ? 'Partial' : 'Failed',
      ranAt,
      detail,
      produced,
    });
    return NextResponse.json({ ok: false, created, error: detail }, { status: 502 });
  }

  await logRun({
    job:     'Daily X Post',
    outcome: skipped.length ? 'Partial' : 'Success',
    ranAt,
    detail:  [`Queued: ${created.join(', ')}`, ...skipped].join(' — '),
    produced,
  });

  return NextResponse.json({ ok: true, date: data.date, created, skipped });
}
