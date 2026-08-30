import { NextResponse } from 'next/server';
import { createDraft, logRun, DB } from '@/lib/notion/contentQueue';
import { NotionError, queryDatabase, updatePage, prop } from '@/lib/notion/client';
import { buildVideoScript } from '@/lib/marketing/videoScript';
import { zoneWord } from '@/lib/marketing/dailyPost';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

// Drafts one short-form video script a week, for whichever chart has gone
// longest without being featured.
//
// This is the first job that both reads and writes Notion. The Chart Rotation
// database is the selector: it holds which charts suit video, a note on why each
// is interesting, and when each was last used. Picking the least recently
// featured one and then stamping it is what makes the rotation actually rotate
// rather than being a list nobody updates.
//
// Keeping that state in Notion rather than in the app is deliberate — the
// judgement about which charts are worth filming belongs where it can be edited
// without a deploy.

export const dynamic = 'force-dynamic';

type NotionPage = {
  id: string;
  properties: {
    Chart?:   { title?: { plain_text: string }[] };
    Path?:    { rich_text?: { plain_text: string }[] };
    Category?:{ select?: { name: string } | null };
    'Why It Is Interesting'?: { rich_text?: { plain_text: string }[] };
    'Times Used'?: { number: number | null };
  };
};

const text = (r?: { plain_text: string }[]) => (r?.length ? r.map((x) => x.plain_text).join('') : '');

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const ranAt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

  // ── Pick the chart ─────────────────────────────────────────────────────────
  // Two passes, and the reason is worth recording: Notion sorts empty dates
  // LAST in an ascending sort. A single "ORDER BY Last Featured ASC" therefore
  // returns the one chart that HAS been featured ahead of every chart that never
  // has — the exact opposite of a rotation. Measured: four consecutive runs all
  // returned Hash Ribbons while eight never-featured charts sat behind it.
  //
  // So: take a never-featured chart if one exists, and only fall back to
  // oldest-featured once every chart has had a turn.
  const base = [
    { property: 'Good For', multi_select: { contains: 'Video' } },
    { property: 'Retired', checkbox: { equals: false } },
  ];

  let chart: NotionPage | undefined;
  try {
    const unused = await queryDatabase<NotionPage>(DB.chartRotation, {
      filter: { and: [...base, { property: 'Last Featured', date: { is_empty: true } }] },
      page_size: 1,
    });

    chart = unused[0] ?? (await queryDatabase<NotionPage>(DB.chartRotation, {
      filter: { and: base },
      sorts: [{ property: 'Last Featured', direction: 'ascending' }],
      page_size: 1,
    }))[0];
  } catch (err) {
    const detail = err instanceof NotionError ? err.message : String(err);
    await logRun({ job: 'Video Script Draft', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  if (!chart) {
    const detail = 'No chart in rotation is marked Good For: Video and not Retired.';
    await logRun({ job: 'Video Script Draft', outcome: 'Skipped', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 200 });
  }

  // ── Live context ───────────────────────────────────────────────────────────
  let cycle: CycleScoreResult;
  try {
    const res = await fetch(`${origin}/api/cycle`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`/api/cycle returned ${res.status}`);
    cycle = (await res.json()) as CycleScoreResult;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // The chart is not stamped, so next week picks the same one and nothing is
    // lost by failing here.
    await logRun({ job: 'Video Script Draft', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  const p = chart.properties;
  const chartName = text(p.Chart?.title) || 'Untitled chart';
  const script = buildVideoScript({
    chart:     chartName,
    path:      text(p.Path?.rich_text) || '/',
    category:  p.Category?.select?.name ?? 'Uncategorised',
    whyNow:    text(p['Why It Is Interesting']?.rich_text) || null,
    score:     Math.round(cycle.score),
    phase:     zoneWord(cycle.zone),
    reporting: cycle.indicators.filter((i) => i.available).length,
    total:     cycle.indicators.length,
    weekOf:    ranAt,
  });

  // ── Write the draft ────────────────────────────────────────────────────────
  let pageId: string;
  try {
    pageId = await createDraft({
      title:        `Short · ${ranAt} · ${chartName}`,
      channel:      'YouTube Script',
      body:         script,
      scheduledFor: ranAt,
      chartUsed:    chartName,
      scoreAtBuild: Math.round(cycle.score),
      notes:        'Scaffold only. The five beats are yours to write.',
    });
  } catch (err) {
    const detail = err instanceof NotionError ? err.message : String(err);
    await logRun({ job: 'Video Script Draft', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  // ── Stamp the chart so it goes to the back of the queue ────────────────────
  //
  // Last, and non-fatal. If this fails the draft still exists and the only cost
  // is that the same chart may come up again next week — recoverable by hand,
  // and better than losing the script over a bookkeeping write.
  let stamped = true;
  try {
    await updatePage(chart.id, {
      'Last Featured': prop.date(ranAt),
      'Times Used':    prop.number((p['Times Used']?.number ?? 0) + 1),
    });
  } catch {
    stamped = false;
  }

  // Partial either way: the scaffold is incomplete until the beats are written,
  // and a failed rotation stamp does not change that. It only changes the detail.
  await logRun({
    job:     'Video Script Draft',
    outcome: 'Partial',
    ranAt,
    detail:  `Scaffold for ${chartName}. Awaiting the five written beats.`
      + (stamped ? '' : ' Rotation stamp failed — this chart may come up again next week.'),
    produced: [pageId],
  });

  return NextResponse.json({ ok: true, chart: chartName, stamped, weekOf: ranAt });
}
