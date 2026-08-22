import { NextResponse } from 'next/server';
import { fetchCrossAssetData } from '@/lib/api/crossAsset';
import { computeRegime } from '@/lib/indicators/regimeHelpers';

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
    const { points, latest, btcHistory } = await fetchCrossAssetData();
    const { zones } = computeRegime(btcHistory);
    return NextResponse.json({ points, latest, zones });
  } catch (err) {
    console.error('[/api/markets/cross-asset]', err);
    return NextResponse.json({ error: 'Failed to fetch cross-asset data' }, { status: 500 });
  }
}
