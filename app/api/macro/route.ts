import { NextResponse } from 'next/server';
import { fetchMacroData } from '@/lib/api/fred';

// 24-hour CDN cache — FRED releases most series once per day
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
    const data = await fetchMacroData();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[/api/macro]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/macro]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
