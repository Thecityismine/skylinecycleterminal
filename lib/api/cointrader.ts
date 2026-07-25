import type { CoinWeeklyClose } from './coingecko';

const BASE = 'https://charts.cointrader.pro';

// Unofficial, undocumented TradingView "UDF" datafeed — no API key, no
// published rate limit, no SLA. Used ONLY as a best-effort backfill for
// history older than CoinGecko's free-tier 365-day window; every call site
// must treat failures as non-fatal and fall back to what CoinGecko already
// provides. Only "resolution=1D" was confirmed working during testing —
// "1W" 500s on this server, so we always fetch daily and let callers bucket
// into weeks themselves.
//
// Symbols must be looked up and verified manually per-coin — this catalog
// has stale/dead feeds sitting under confusingly similar names (e.g.
// "AVALANCHE-AVAX:USD" stopped updating in 2022; the live one is
// "AVALANCHE:USD"). See altcoinWatchlist.ts and marketRotation.ts for the
// verified symbol lists.

type DailyPoint = { time: string; ts: number; value: number };

async function fetchCointraderDaily(
  symbol: string,
  fromTs: number,   // unix seconds
  toTs: number,     // unix seconds
): Promise<DailyPoint[]> {
  const res = await fetch(
    `${BASE}/api/history?symbol=${encodeURIComponent(symbol)}&resolution=1D&from=${fromTs}&to=${toTs}`,
    {
      headers: { Referer: `${BASE}/charts.html` },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) throw new Error(`cointrader.pro history HTTP ${res.status} (${symbol})`);

  const json: { s: string; t?: number[]; c?: number[] } = await res.json();
  if (json.s !== 'ok' || !json.t?.length || !json.c?.length) {
    throw new Error(`cointrader.pro history: no data for ${symbol} (status=${json.s})`);
  }

  return json.t.map((t, i) => ({
    time:  new Date(t * 1000).toISOString().slice(0, 10),
    ts:    t * 1000,
    value: json.c![i],
  }));
}

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

// Price history, bucketed into weekly closes — used by the Altcoin Terminal.
export async function fetchCointraderWeeklyHistory(
  symbol: string,
  fromTs: number,
  toTs: number,
): Promise<CoinWeeklyClose[]> {
  const daily = await fetchCointraderDaily(symbol, fromTs, toTs);

  const weekMap = new Map<string, { ts: number; close: number }>();
  for (const p of daily) {
    weekMap.set(isoWeekKey(p.time), { ts: p.ts, close: p.value }); // ascending -> last write wins
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([time, v]) => ({ time, ts: v.ts, close: v.close }));
}

// Market-cap history at daily granularity — used by the Market Rotation page
// to backfill TOTAL/TOTAL2/TOTAL3. Returned un-bucketed so callers can apply
// their own weekly/daily resolution logic (matching how CoinGecko market-cap
// history is already handled in lib/api/marketRotation.ts).
export async function fetchCointraderMarketCapHistory(
  symbol: string,
  fromTs: number,
  toTs: number,
): Promise<{ time: string; ts: number; mc: number }[]> {
  const daily = await fetchCointraderDaily(symbol, fromTs, toTs);
  return daily.map((p) => ({ time: p.time, ts: p.ts, mc: p.value }));
}
