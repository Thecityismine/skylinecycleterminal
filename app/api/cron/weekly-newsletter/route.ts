import { NextResponse } from 'next/server';
import { createDraft, logRun } from '@/lib/notion/contentQueue';
import { NotionError } from '@/lib/notion/client';
import { zoneWord } from '@/lib/marketing/dailyPost';
import { getAllArticles } from '@/lib/content/learn';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

// Drafts the Sunday newsletter into the Notion Content Queue, on Friday.
//
// This one is deliberately half-finished when it lands, and that is the design
// rather than a shortcut. lib/marketing/weeklyEmail.ts requires four fields a
// person has to write -- what changed, the lesson, its guide, and one
// observation -- and states why:
//
//   "a generator inventing those is exactly the failure mode this account is
//    positioned against"
//
// So the job fills in every number it can prove from the terminal and leaves
// those four as labelled blanks. Friday rather than Sunday so there is a
// weekend to write them in.

export const dynamic = 'force-dynamic';

/** ISO week number, used to walk the guide list without storing any state. */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

const BLANK = '<< write this >>';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const now = new Date();
  const ranAt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);

  // The Sunday this draft is for, not the Friday it was written on.
  const sunday = new Date(now);
  sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7 || 7));
  const sendDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(sunday);

  let cycle: CycleScoreResult;
  try {
    const res = await fetch(`${origin}/api/cycle`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`/api/cycle returned ${res.status}`);
    cycle = (await res.json()) as CycleScoreResult;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await logRun({ job: 'Weekly Newsletter', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  const score = Math.round(cycle.score);
  const phase = zoneWord(cycle.zone);
  const reporting = cycle.indicators.filter((i) => i.available).length;
  const total = cycle.indicators.length;

  // Walks the guide list one per week, so a lesson is suggested without
  // repeating for as many weeks as there are guides. It is a suggestion only —
  // which guide fits the week is a judgement call, so the field stays editable.
  const articles = getAllArticles();
  const suggested = articles.length ? articles[isoWeek(now) % articles.length] : null;

  const body = [
    `Skyline Weekly — ${sendDate}`,
    '',
    `Current Score: ${score} / 100`,
    `Current Phase: ${phase}`,
    `Indicators reporting: ${reporting} of ${total}`,
    '',
    '--- the four fields below are yours to write ---',
    '',
    'BIGGEST CHANGE THIS WEEK',
    BLANK,
    '',
    "THIS WEEK'S LESSON",
    BLANK,
    suggested
      ? `Suggested guide: ${suggested.title}  (/learn/${suggested.slug})`
      : 'Suggested guide: none available',
    '',
    'ONE OBSERVATION',
    BLANK,
    '',
    '--- end ---',
    '',
    'Numbers above are filled from the terminal and are correct as of the draft',
    'date. Re-check the score before sending if it has been a few days.',
  ].join('\n');

  let pageId: string;
  try {
    pageId = await createDraft({
      title:        `Skyline Weekly · ${sendDate} · Score ${score}, ${phase}`,
      channel:      'Newsletter',
      body,
      scheduledFor: sendDate,
      scoreAtBuild: score,
      notes:        `Needs three fields written before sending. Suggested guide: ${suggested?.title ?? 'none'}.`,
    });
  } catch (err) {
    const detail = err instanceof NotionError ? err.message : String(err);
    await logRun({ job: 'Weekly Newsletter', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  // Partial, not Success: the draft is genuinely incomplete until a person has
  // written the three fields, and the run log should not claim otherwise.
  await logRun({
    job:     'Weekly Newsletter',
    outcome: 'Partial',
    ranAt,
    detail:  `Drafted for ${sendDate}. Score ${score}, ${phase}. Awaiting the three hand-written fields.`,
    produced: [pageId],
  });

  return NextResponse.json({ ok: true, sendDate, score, phase, suggestedGuide: suggested?.slug ?? null });
}
