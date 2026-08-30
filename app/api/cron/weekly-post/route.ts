import { NextResponse } from 'next/server';
import { createDraft, logRun, DB } from '@/lib/notion/contentQueue';
import { NotionError, queryDatabase, updatePage, prop } from '@/lib/notion/client';
import { buildWeeklyPost, CARD_TYPE_BY_PATH } from '@/lib/marketing/weeklyPost';
import { zoneWord } from '@/lib/marketing/dailyPost';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

// Drafts the weekly Road to $1M post, with a rendered chart card where one
// exists.
//
// Shares the Chart Rotation with the video script job but filters on "X post"
// rather than "Video", so the two do not fight over the same chart. They stamp
// the same Last Featured column, which means a chart used for a video is also
// pushed back in the post rotation — correct, since the point is not to repeat
// a chart across the account in the same week.

export const dynamic = 'force-dynamic';

type NotionPage = {
  id: string;
  properties: {
    Chart?: { title?: { plain_text: string }[] };
    Path?:  { rich_text?: { plain_text: string }[] };
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

  // Never-featured first, then oldest. Notion sorts empty dates last in an
  // ascending sort, so a single sorted query would return the one chart that
  // HAS been featured ahead of every chart that never has — see the note in
  // api/cron/video-script for the measurement.
  const base = [
    { property: 'Good For', multi_select: { contains: 'X post' } },
    { property: 'Retired', checkbox: { equals: false } },
  ];

  // Several candidates rather than one, because a chart with a rendered card
  // makes a better post than one that needs a manual screenshot, and only three
  // of the eighteen charts have a renderer so far. Taking the first candidate
  // outright gave a card on roughly one week in six — measured across three
  // runs, all three came back with no card.
  //
  // So: walk the rotation in order and take the first chart that can render,
  // falling back to the first chart overall. Rotation order still decides;
  // renderability only breaks the tie.
  const pathOf = (n: NotionPage) => text(n.properties.Path?.rich_text) || '/';
  const preferRenderable = (rows: NotionPage[]) =>
    rows.find((r) => CARD_TYPE_BY_PATH[pathOf(r)]) ?? rows[0];

  let chart: NotionPage | undefined;
  try {
    const unused = await queryDatabase<NotionPage>(DB.chartRotation, {
      filter: { and: [...base, { property: 'Last Featured', date: { is_empty: true } }] },
      page_size: 20,
    });
    chart = unused.length
      ? preferRenderable(unused)
      : preferRenderable(await queryDatabase<NotionPage>(DB.chartRotation, {
          filter: { and: base },
          sorts: [{ property: 'Last Featured', direction: 'ascending' }],
          page_size: 20,
        }));
  } catch (err) {
    const detail = err instanceof NotionError ? err.message : String(err);
    await logRun({ job: 'Road to 1M Weekly', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  if (!chart) {
    const detail = 'No chart in rotation is marked Good For: X post and not Retired.';
    await logRun({ job: 'Road to 1M Weekly', outcome: 'Skipped', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 200 });
  }

  let cycle: CycleScoreResult;
  try {
    const res = await fetch(`${origin}/api/cycle`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`/api/cycle returned ${res.status}`);
    cycle = (await res.json()) as CycleScoreResult;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await logRun({ job: 'Road to 1M Weekly', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  const p = chart.properties;
  const chartName = text(p.Chart?.title) || 'Untitled chart';
  const path = text(p.Path?.rich_text) || '/';
  const cardType = CARD_TYPE_BY_PATH[path] ?? null;
  const cardUrl = cardType ? `${origin}/api/share/chart?type=${cardType}` : null;

  const body = buildWeeklyPost({
    chart:     chartName,
    path,
    whyNow:    text(p['Why It Is Interesting']?.rich_text) || null,
    score:     Math.round(cycle.score),
    phase:     zoneWord(cycle.zone),
    reporting: cycle.indicators.filter((i) => i.available).length,
    total:     cycle.indicators.length,
    weekOf:    ranAt,
    cardUrl,
  });

  let pageId: string;
  try {
    pageId = await createDraft({
      title:        `Road to $1M · ${ranAt} · ${chartName}`,
      channel:      'X Road to 1M',
      body,
      scheduledFor: ranAt,
      chartUsed:    chartName,
      scoreAtBuild: Math.round(cycle.score),
      notes: cardUrl
        ? 'Card rendered — link is in the body.'
        : `No auto-card for ${chartName} yet. Screenshot the page or use its Share Card button.`,
    });
  } catch (err) {
    const detail = err instanceof NotionError ? err.message : String(err);
    await logRun({ job: 'Road to 1M Weekly', outcome: 'Failed', ranAt, detail });
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }

  // Non-fatal, and last. Losing the stamp costs a possible repeat next week;
  // losing the draft would cost the week.
  let stamped = true;
  try {
    await updatePage(chart.id, {
      'Last Featured': prop.date(ranAt),
      'Times Used':    prop.number((p['Times Used']?.number ?? 0) + 1),
    });
  } catch {
    stamped = false;
  }

  await logRun({
    job:      'Road to 1M Weekly',
    outcome:  'Partial',
    ranAt,
    detail:   `Drafted for ${chartName}. ${cardUrl ? 'Card rendered.' : 'No auto-card — needs a screenshot.'}`
      + (stamped ? '' : ' Rotation stamp failed — may repeat next week.'),
    produced: [pageId],
  });

  return NextResponse.json({ ok: true, chart: chartName, card: cardType, stamped, weekOf: ranAt });
}
