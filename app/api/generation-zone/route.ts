import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { computeGenerationZone } from '@/lib/indicators/generationZone';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

export const revalidate = 3600;

// Weekly moving averages need a long runway: 230 weekly closes is roughly four
// and a half years before the slower average produces its first value. Starting
// in 2010 gives the deepest history the source has rather than clipping it.
const HISTORY_START = '2010-01-01';

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;

    const [daily, cycle] = await Promise.all([
      fetchBTCDailyPrice(HISTORY_START),
      // Both the Cycle Score and the Fear & Greed reading come from one call, so
      // the conditions panel agrees with what /cycle shows rather than fetching
      // sentiment separately and drifting from it.
      fetch(`${origin}/api/cycle`, { next: { revalidate: 3600 } })
        .then((r) => (r.ok ? (r.json() as Promise<CycleScoreResult>) : null))
        .catch(() => null),
    ]);

    if (!daily.length) {
      return NextResponse.json({ error: 'No price history available' }, { status: 502 });
    }

    const fg = cycle?.indicators.find((i) => i.name === 'Fear & Greed' && i.available);

    const result = computeGenerationZone(daily, {
      fearGreed: fg?.rawValue ?? null,
      cycleScore: cycle?.score ?? null,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/generation-zone]', err);
    return NextResponse.json({ error: 'Failed to compute the generation zone' }, { status: 500 });
  }
}
