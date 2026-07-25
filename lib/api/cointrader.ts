import type { CoinWeeklyClose } from './coingecko';

const BASE = 'https://charts.cointrader.pro';

// Unofficial, undocumented TradingView "UDF" datafeed — no API key, no
// published rate limit, no SLA. Used ONLY as a best-effort backfill for
// history older than CoinGecko's free-tier 365-day window; every call site
// must treat failures as non-fatal and fall back to what CoinGecko already
// provides. Only "resolution=1D" was confirmed working during testing —
// "1W" 500s on this server, so we always fetch daily and bucket into weeks
// ourselves (same convention as lib/api/coingecko.ts).
//
// Symbols must be looked up manually per-coin (see altcoinWatchlist.ts) —
// this catalog has stale/dead feeds sitting under confusingly similar names.

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export async function fetchCointraderWeeklyHistory(
  symbol: string,
  fromTs: number,   // unix seconds
  toTs: number,     // unix seconds
): Promise<CoinWeeklyClose[]> {
  const res = await fetch(
    `${BASE}/api/history?symbol=${encodeURIComponent(symbol)}&resolution=1D&from=${fromTs}&to=${toTs}`,
    {
      headers: { Referer: `${BASE}/charts.html` },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) throw new Error(`cointrader.pro history HTTP ${res.status}`);

  const json: { s: string; t?: number[]; c?: number[] } = await res.json();
  if (json.s !== 'ok' || !json.t?.length || !json.c?.length) {
    throw new Error(`cointrader.pro history: no data (status=${json.s})`);
  }

  const weekMap = new Map<string, { ts: number; close: number }>();
  for (let i = 0; i < json.t.length; i++) {
    const ts   = json.t[i] * 1000;
    const time = new Date(ts).toISOString().slice(0, 10);
    weekMap.set(isoWeekKey(time), { ts, close: json.c[i] }); // ascending -> last write wins
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([time, v]) => ({ time, ts: v.ts, close: v.close }));
}
