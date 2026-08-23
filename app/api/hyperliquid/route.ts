import { NextResponse } from 'next/server';
import { fetchHyperliquid, type HlMarket } from '@/lib/api/hyperliquid';

// Always rendered fresh, with the vendor call still cached. `revalidate` alone
// is stale-while-revalidate: the first visitor after expiry is served the
// previous render while a new one builds behind them, so on a low-traffic page
// every visit shows old data and staleness is unbounded.
//
// fetchCache is required alongside it. force-dynamic is documented as equivalent
// to setting every fetch to no-store, which would re-hit Hyperliquid for the
// full history on each view. default-cache restores the per-fetch
// `next: { revalidate }` in lib/api/hyperliquid.ts.
export const dynamic = 'force-dynamic';
export const fetchCache = 'default-cache';

const MARKETS: HlMarket[] = ['BTC', 'ETH'];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw  = (searchParams.get('coin') ?? 'BTC').toUpperCase();
    const coin = (MARKETS as string[]).includes(raw) ? (raw as HlMarket) : 'BTC';

    // searchParams.get returns null when absent and Number(null) is 0, which is
    // finite — so testing isFinite alone silently defaults the window to 1 day.
    const daysParam = searchParams.get('days');
    const daysRaw   = daysParam == null ? NaN : Number(daysParam);
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 90) : 30;

    const data = await fetchHyperliquid(coin, days);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/hyperliquid]', msg);
    return NextResponse.json({ error: `Hyperliquid unavailable: ${msg}` }, { status: 502 });
  }
}
