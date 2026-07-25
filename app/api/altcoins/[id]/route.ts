import { NextRequest, NextResponse } from 'next/server';
import { fetchCoinWeeklyHistory, fetchCoinSnapshot, EMPTY_ALTCOIN_SNAPSHOT } from '@/lib/api/coingecko';
import { buildAltcoinData } from '@/lib/indicators/altcoinScore';
import { getAltcoin } from '@/lib/data/altcoinWatchlist';

export const revalidate = 3600;

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
    fetchCoinSnapshot(coin.id),
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
