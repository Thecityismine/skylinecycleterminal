import { NextResponse } from 'next/server';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';
import {
  weekdayInNewYork,
  dateInNewYork,
  buildScorePost,
  buildLiquidityPost,
  buildOnChainPost,
  buildStructurePost,
  buildSentimentPost,
  buildRotationPost,
  buildSundayPost,
  boundaryNote,
  unavailableNote,
  ctaToday,
  zoneWord,
  WEEKDAYS,
  type Weekday,
  type SecondPost,
} from '@/lib/marketing/dailyPost';

// Serves the day's ready-to-paste X posts as plain text. Built to be opened in
// a browser each morning rather than depending on a scheduled job: no session,
// no connector, no run history to go looking for.
//
// Reads the terminal's own endpoints over HTTP rather than recomputing, so the
// numbers are byte-identical to what the site shows and their revalidate
// caching is reused.
//
// ?day=Mon  override the weekday (for checking any day's output)
// ?format=json  structured instead of plain text
export const revalidate = 900;

async function get<T>(origin: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${origin}${path}`, { next: { revalidate: 900 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function secondPostFor(day: Weekday, origin: string, market: unknown): Promise<SecondPost> {
  switch (day) {
    case 'Mon': {
      const m = await get<Parameters<typeof buildLiquidityPost>[0]>(origin, '/api/macro');
      return m ? buildLiquidityPost(m) : { skipped: 'Liquidity data unavailable (/api/macro failed).' };
    }
    case 'Tue': {
      const o = await get<Parameters<typeof buildOnChainPost>[0]>(origin, '/api/onchain');
      return o ? buildOnChainPost(o) : { skipped: 'On-chain data unavailable (/api/onchain failed).' };
    }
    case 'Wed': {
      const s = await get<Parameters<typeof buildStructurePost>[0]>(origin, '/api/signals');
      return s ? buildStructurePost(s) : { skipped: 'Structure data unavailable (/api/signals failed).' };
    }
    case 'Thu':
      // No public ETF endpoint exists, and Thursday is the ETF slot. Better to
      // say so than to quietly substitute a different format.
      return { skipped: 'Thursday is the ETF flows slot. No public ETF endpoint exists, so this one is written by hand from farside.co.uk or sosovalue.com.' };
    case 'Fri':
      return market
        ? buildSentimentPost(market as Parameters<typeof buildSentimentPost>[0])
        : { skipped: 'Sentiment data unavailable (/api/market failed).' };
    case 'Sat': {
      const a = await get<Parameters<typeof buildRotationPost>[0]>(origin, '/api/altseason');
      return a ? buildRotationPost(a) : { skipped: 'Rotation data unavailable (/api/altseason failed).' };
    }
    case 'Sun':
      return buildSundayPost();
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const override = url.searchParams.get('day');
  const day: Weekday =
    override && (WEEKDAYS as string[]).includes(override) ? (override as Weekday) : weekdayInNewYork();
  const date = dateInNewYork();

  const cycle = await get<CycleScoreResult>(origin, '/api/cycle');
  if (!cycle) {
    // Never fabricate a score. An explicit failure is recoverable; a wrong
    // number posted to the account is not.
    return new NextResponse(
      'Could not reach /api/cycle, so today\'s post cannot be generated.\nDo not post from memory. Try again shortly.',
      { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    );
  }

  const market = await get<Parameters<typeof buildSentimentPost>[0]>(origin, '/api/market');

  const score = Math.round(cycle.score);
  const post1 = buildScorePost(cycle, day, ctaToday(date));
  const post2 = await secondPostFor(day, origin, market);

  if (url.searchParams.get('format') === 'json') {
    return NextResponse.json({
      date, day, score, zone: zoneWord(cycle.zone),
      post1,
      post2: 'skipped' in post2 ? { skipped: post2.skipped } : post2,
      notes: { boundary: boundaryNote(score), unavailable: unavailableNote(cycle) },
    });
  }

  const text = [
    `SKYLINE DAILY POSTS · ${day} ${date}`,
    '='.repeat(60),
    '',
    '── POST 1: DAILY SCORE ' + '─'.repeat(37),
    '',
    post1,
    '',
    '── POST 2: ' + ('skipped' in post2 ? 'NONE TODAY' : post2.title.toUpperCase()) + ' ' + '─'.repeat(30),
    '',
    'skipped' in post2 ? post2.skipped : post2.body,
    '',
    '── NOTES ' + '─'.repeat(51),
    '',
    boundaryNote(score),
    unavailableNote(cycle),
    `Attach the share card: skylinecycleterminal.com/cycle → Share Card button.`,
    '',
    'Informational only, not financial advice.',
  ].join('\n');

  return new NextResponse(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
