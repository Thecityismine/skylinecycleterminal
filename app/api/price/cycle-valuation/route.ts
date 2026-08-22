import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { calculateValuationPoints, getCyclePosition, classifyZone } from '@/lib/indicators/valuationCycle';

// Always rendered fresh. These pages get shared, and `revalidate` is
// stale-while-revalidate: the first visitor after expiry is served the previous
// render while a new one builds behind them, so on a low-traffic page every
// visit shows old data and staleness is unbounded.
//
// fetchCache is required alongside it. force-dynamic is documented as
// equivalent to setting every fetch to no-store, which would re-fetch full
// vendor history on each view. default-cache restores the per-fetch
// `next: { revalidate }` in lib/api/*, so the route recomputes per request
// while the vendor call stays cached.
export const dynamic = 'force-dynamic';
export const fetchCache = 'default-cache';
export async function GET() {
  try {
    const daily  = await fetchBTCDailyPrice('2012-01-01');
    const points = calculateValuationPoints(daily);
    const cycle  = getCyclePosition();

    const last = points[points.length - 1] ?? null;

    return NextResponse.json({
      points,
      cycle,
      current: last && {
        time:                 last.time,
        close:                last.close,
        ma200:                last.ma200,
        priceToMa200:         last.priceToMa200,
        deviation:            last.deviation,
        daysUntilNextHalving: last.daysUntilNextHalving,
        zone:                 classifyZone(last.deviation),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
