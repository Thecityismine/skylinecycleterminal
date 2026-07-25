import { NextRequest, NextResponse } from 'next/server';
import { fetchCoinWeeklyHistory, fetchCoinSnapshot } from '@/lib/api/coingecko';
import { fetchCmcSnapshot } from '@/lib/api/coinmarketcap';
import { EMPTY_ALTCOIN_SNAPSHOT, type AltcoinSnapshot } from '@/lib/api/altcoinSnapshot';
import { buildAltcoinData } from '@/lib/indicators/altcoinScore';
import { getAltcoin, type AltcoinWatchlistItem } from '@/lib/data/altcoinWatchlist';

export const revalidate = 3600;

// CoinMarketCap (by numeric id) is tried first — generous rate limit, batched-
// call-friendly, good uptime. CoinGecko is the fallback if CMC has no key
// configured, is rate-limited, or errors. Either way a snapshot failure here
// is non-fatal to the page — see the outer Promise.allSettled below.
async function fetchSnapshot(coin: AltcoinWatchlistItem | { id: string; cmcId?: number }): Promise<AltcoinSnapshot> {
  if (coin.cmcId != null) {
    try {
      return await fetchCmcSnapshot(coin.cmcId);
    } catch (err) {
      console.warn(`altcoins/${coin.id} CMC snapshot failed, falling back to CoinGecko:`, (err as Error).message);
    }
  }
  return fetchCoinSnapshot(coin.id);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const key  = id.toLowerCase();
  const coin = getAltcoin(key) ?? {
    id: key, symbol: key.toUpperCase(), name: key,
    sector: 'Unknown', group: 'majors' as const, color: '#A9B4C0',
  };

  // Fetch both independently — a snapshot failure should not kill chart data
  const [chartResult, snapResult] = await Promise.allSettled([
    fetchCoinWeeklyHistory(coin.id),
    fetchSnapshot(coin),
  ]);

  if (chartResult.status === 'rejected') {
    console.error(`altcoins/${coin.id} chart:`, chartResult.reason?.message);
    return NextResponse.json(
      { error: `Price data unavailable: ${chartResult.reason?.message}` },
      { status: 500 },
    );
  }

  const closes = chartResult.value;
  if (!closes.length) {
    return NextResponse.json({ error: 'No price data returned' }, { status: 404 });
  }

  let snapshot = EMPTY_ALTCOIN_SNAPSHOT;
  let snapshotAvailable = false;

  if (snapResult.status === 'fulfilled') {
    snapshot = snapResult.value;
    snapshotAvailable = true;
  } else {
    console.warn(`altcoins/${coin.id} snapshot:`, snapResult.reason?.message);
  }

  const data = buildAltcoinData(
    coin.id, coin.symbol, coin.name, coin.sector, coin.group, coin.color,
    closes, snapshot,
  );

  return NextResponse.json({ ...data, snapshotAvailable });
}
