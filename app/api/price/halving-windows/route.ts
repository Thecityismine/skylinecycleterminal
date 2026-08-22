import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { buildHalvingWindows } from '@/lib/indicators/halvingWindows';

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
    // Fetch from 2010 so H1 accumulation window (mid-2011) has data
    const daily = await fetchBTCDailyPrice('2010-07-01');
    const valid  = daily.filter((p) => p.price > 0);

    const windows = buildHalvingWindows(valid);

    // Weekly downsample for chart rendering
    const points = valid
      .filter((_, i, arr) => i % 7 === 0 || i === arr.length - 1)
      .map((p) => ({
        time:  p.time,
        ts:    new Date(p.time + 'T00:00:00Z').getTime(),
        price: p.price,
      }));

    return NextResponse.json({ points, windows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
