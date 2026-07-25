const BASE = 'https://api.coingecko.com/api/v3';

export type CoinPrice = {
  usd: number;
  usd_24h_change: number;
  usd_market_cap: number;
  usd_24h_vol: number;
};

export type MarketData = {
  btc: CoinPrice;
  eth: CoinPrice;
  btcDominance: number;
  ethDominance: number;
  totalMarketCapUSD: number;
};

// Optional free CoinGecko "Demo" key (coingecko.com/en/developer/dashboard) — the
// public API caps market_chart history at 365 days without one.
const CG_API_KEY = process.env.COINGECKO_API_KEY?.trim();

export type CoinWeeklyClose = { time: string; ts: number; close: number };

export type AltcoinSnapshot = {
  name:              string | null;
  price:             number | null;
  change24h:         number | null;
  marketCap:         number | null;
  marketCapRank:     number | null;
  volume24h:         number | null;
  circulatingSupply: number | null;
  totalSupply:       number | null;
  maxSupply:         number | null;
  athPrice:          number | null;
  athChangePct:      number | null;
  athDate:           string | null;
};

export const EMPTY_ALTCOIN_SNAPSHOT: AltcoinSnapshot = {
  name: null, price: null, change24h: null, marketCap: null, marketCapRank: null,
  volume24h: null, circulatingSupply: null, totalSupply: null, maxSupply: null,
  athPrice: null, athChangePct: null, athDate: null,
};

// Groups daily price points into ISO weeks (keyed by the Monday of each week),
// keeping the last day's value in each bucket as the "weekly close" — same
// convention used for market-cap history in lib/api/marketRotation.ts.
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

export async function fetchCoinWeeklyHistory(id: string): Promise<CoinWeeklyClose[]> {
  const days: number | 'max' = CG_API_KEY ? 'max' : 365;
  const res = await fetch(
    `${BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    {
      headers: CG_API_KEY ? { 'x-cg-demo-api-key': CG_API_KEY } : {},
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!res.ok) throw new Error(`CoinGecko market_chart HTTP ${res.status}`);
  const json: { prices: [number, number][] } = await res.json();

  const weekMap = new Map<string, { ts: number; close: number }>();
  for (const [ts, price] of json.prices) {
    const time = new Date(ts).toISOString().slice(0, 10);
    weekMap.set(isoWeekKey(time), { ts, close: price }); // ascending input -> last write wins
  }

  return Array.from(weekMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([time, v]) => ({ time, ts: v.ts, close: v.close }));
}

export async function fetchCoinSnapshot(id: string): Promise<AltcoinSnapshot> {
  const res = await fetch(
    `${BASE}/coins/markets?vs_currency=usd&ids=${id}`,
    {
      headers: CG_API_KEY ? { 'x-cg-demo-api-key': CG_API_KEY } : {},
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) throw new Error(`CoinGecko markets HTTP ${res.status}`);
  const [c] = await res.json();
  if (!c) throw new Error(`CoinGecko markets: no data for ${id}`);

  return {
    name:              c.name ?? null,
    price:             c.current_price ?? null,
    change24h:         c.price_change_percentage_24h ?? null,
    marketCap:         c.market_cap ?? null,
    marketCapRank:     c.market_cap_rank ?? null,
    volume24h:         c.total_volume ?? null,
    circulatingSupply: c.circulating_supply ?? null,
    totalSupply:       c.total_supply ?? null,
    maxSupply:         c.max_supply ?? null,
    athPrice:          c.ath ?? null,
    athChangePct:      c.ath_change_percentage ?? null,
    athDate:           c.ath_date ?? null,
  };
}

export async function fetchMarketData(): Promise<MarketData> {
  const [priceRes, globalRes] = await Promise.all([
    fetch(
      `${BASE}/simple/price?ids=bitcoin,ethereum` +
        `&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(10000) }
    ),
    fetch(`${BASE}/global`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(10000) }),
  ]);

  if (!priceRes.ok) throw new Error(`CoinGecko prices HTTP ${priceRes.status}`);
  if (!globalRes.ok) throw new Error(`CoinGecko global HTTP ${globalRes.status}`);

  const [priceJson, globalJson] = await Promise.all([priceRes.json(), globalRes.json()]);

  return {
    btc: priceJson.bitcoin,
    eth: priceJson.ethereum,
    btcDominance: globalJson.data.market_cap_percentage.btc,
    ethDominance: globalJson.data.market_cap_percentage.eth,
    totalMarketCapUSD: globalJson.data.total_market_cap.usd,
  };
}
