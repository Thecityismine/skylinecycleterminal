import { NextResponse } from 'next/server';
import { fetchReserveRiskData } from '@/lib/api/coinmetrics';
import { computeReserveRisk } from '@/lib/indicators/reserveRisk';

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
    const raw    = await fetchReserveRiskData('2012-01-01');
    const result = computeReserveRisk(raw);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/onchain/reserve-risk]', err);
    return NextResponse.json({ error: 'Failed to compute Reserve Risk' }, { status: 500 });
  }
}
