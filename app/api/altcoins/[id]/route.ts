import { NextRequest, NextResponse } from 'next/server';
import { fetchCoinWeeklyHistory, fetchCoinSnapshot, type CoinWeeklyClose } from '@/lib/api/coingecko';
import { fetchCmcSnapshot } from '@/lib/api/coinmarketcap';
import { fetchCointraderWeeklyHistory } from '@/lib/api/cointrader';
import { EMPTY_ALTCOIN_SNAPSHOT, type AltcoinSnapshot } from '@/lib/api/altcoinSnapshot';
import { buildAltcoinData } from '@/lib/indicators/altcoinScore';
import { getAltcoin, type AltcoinWatchlistItem } from '@/lib/data/altcoinWatchlist';

export const revalidate = 3600;

type Coin = AltcoinWatchlistItem | {
  id: string; symbol: string; name: string; sector: string; group: 'majors'; color: string;
  cmcId?: number; cointraderSymbol?: string;
};

// CoinMarketCap (by numeric id) is tried first — generous rate limit, batched-
// call-friendly, good uptime. CoinGecko is the fallback if CMC has no key
// configured, is rate-limited, or errors. Either way a snapshot failure here
// is non-fatal to the page — see the outer Promise.allSettled below.
async function fetchSnapshot(coin: Coin): Promise<AltcoinSnapshot> {
  if (coin.cmcId != null) {
    try {
      return await fetchCmcSnapshot(coin.cmcId);
    } catch (err) {
      console.warn(`altcoins/${coin.id} CMC snapshot failed, falling back to CoinGecko:`, (err as Error).message);
    }
  }
  return fetchCoinSnapshot(coin.id);
}

const COINTRADER_BACKFILL_FROM = Math.floor(new Date('2013-01-01T00:00:00Z').getTime() / 1000);

// CoinGecko's free tier caps market_chart history at 365 days without a paid
// key. charts.cointrader.pro is an unofficial, undocumented aggregator with
// no key requirement and much deeper history for well-established coins —
// used here purely as an optional backfill for weeks older than what
// CoinGecko already returned. Any failure (network, missing symbol, dead
// feed) is swallowed and the CoinGecko-only series is used as-is; this must
// never be able to break the primary chart.
async function withCointraderBackfill(coin: Coin, primary: CoinWeeklyClose[]): Promise<CoinWeeklyClose[]> {
  if (!coin.cointraderSymbol || !primary.length) return primary;

  try {
    const backfillTo = Math.floor(primary[0].ts / 1000);
    const backfill = await fetchCointraderWeeklyHistory(coin.cointraderSymbol, COINTRADER_BACKFILL_FROM, backfillTo);
    if (!backfill.length) return primary;

    const primaryStart = primary[0].time;
    const older = backfill.filter((p) => p.time < primaryStart);
    return older.length ? [...older, ...primary] : primary;
  } catch (err) {
    console.warn(`altcoins/${coin.id} cointrader backfill failed, using CoinGecko-only history:`, (err as Error).message);
    return primary;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const key  = id.toLowerCase();
  const listed = getAltcoin(key);

  // Ids outside the watchlist are still passed through to CoinGecko, which is
  // deliberate — a valid coin we have not curated should still resolve. But it
  // also means a typo reaches this far, so an upstream miss on an unlisted id is
  // reported as 404 (no such coin) rather than 500 (our data source is down).
  const coin: Coin = listed ?? {
    id: key, symbol: key.toUpperCase(), name: key,
    sector: 'Unknown', group: 'majors' as const, color: '#A9B4C0',
  };

  // Fetch both independently — a snapshot failure should not kill chart data
  const [chartResult, snapResult] = await Promise.allSettled([
    fetchCoinWeeklyHistory(coin.id),
    fetchSnapshot(coin),
  ]);

  if (chartResult.status === 'rejected') {
    if (!listed) {
      return NextResponse.json({ error: `No coin named "${key}"` }, { status: 404 });
    }
    console.error(`altcoins/${coin.id} chart:`, chartResult.reason?.message);
    return NextResponse.json(
      { error: `Price data unavailable: ${chartResult.reason?.message}` },
      { status: 500 },
    );
  }

  let closes = chartResult.value;
  if (!closes.length) {
    return NextResponse.json(
      { error: listed ? 'No price data returned' : `No coin named "${key}"` },
      { status: 404 },
    );
  }

  closes = await withCointraderBackfill(coin, closes);

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
