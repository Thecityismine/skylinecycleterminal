import { fetchMarketData } from './coingecko';

const CG = 'https://api.coingecko.com/api/v3';

// Optional free CoinGecko "Demo" key (coingecko.com/en/developer/dashboard) — the
// public API caps market_chart history at 365 days without one. With a key, `days`
// can go up to 'max', giving the multi-year history this page's ranges depend on.
const CG_API_KEY = process.env.COINGECKO_API_KEY?.trim();

// Coins excluded from the "large cap alt" universe used to build TOTAL2/TOTAL3/OTHERS —
// stablecoins and wrapped/liquid-staked versions of BTC/ETH would double-count market cap
// that's already represented by the underlying asset.
const SKIP_IDS = new Set([
  'tether', 'usd-coin', 'binance-usd', 'dai', 'true-usd', 'first-digital-usd',
  'usdd', 'pax-dollar', 'frax', 'gemini-dollar', 'usds', 'paypal-usd', 'ethena-usde',
  'wrapped-bitcoin', 'wrapped-ether', 'weth', 'staked-ether', 'lido-staked-ether',
  'wrapped-steth', 'wrapped-eeth', 'coinbase-wrapped-staked-eth', 'rocket-pool-eth',
  'binance-peg-dogecoin', 'leo-token',
]);

type CoinMarket = {
  id: string;
  symbol: string;
  market_cap_rank: number | null;
};

export type MCPoint = { time: string; ts: number; mc: number };

async function cgFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${CG}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(CG_API_KEY ? { 'x-cg-demo-api-key': CG_API_KEY } : {}),
    },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${path} HTTP ${res.status}`);
  return res.json();
}

async function fetchCoinMcHistory(id: string, days: number | 'max'): Promise<MCPoint[]> {
  const j = await cgFetch<{ market_caps: [number, number][] }>(
    `/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`
  );
  return j.market_caps.map(([ts, mc]) => ({
    time: new Date(ts).toISOString().slice(0, 10),
    ts,
    mc,
  }));
}

// Groups daily points into ISO weeks (keyed by the Monday of each week), keeping
// the most recent day's value in each bucket as the "weekly close".
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

function toMap(points: MCPoint[], weekly: boolean): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of points) {
    const key = weekly ? isoWeekKey(p.time) : p.time;
    map.set(key, p.mc); // ascending input -> last write wins (most recent in bucket)
  }
  return map;
}

export type RotationSeriesPoint = {
  time: string;
  ts: number;
  btc: number;
  eth: number;
  total: number;
  total2: number;
  total3: number;
  others: number;
  btcDominance: number;
  othersDominance: number;
  total3OverBtc: number;
  othersOverBtc: number;
};

export type MarketRotationData = {
  points: RotationSeriesPoint[];
  largeCapCoinCount: number;
  current: {
    totalMarketCap: number;
    btcDominance: number;
    ethDominance: number;
  };
  asOf: string;
};

export async function fetchMarketRotationData(
  resolution: 'weekly' | 'daily' = 'weekly'
): Promise<MarketRotationData> {
  const weekly = resolution === 'weekly';
  const hasKey = !!CG_API_KEY;
  // Without a CoinGecko API key, the public API caps market_chart history at 365
  // days (requests beyond that return 401) — fall back to the same 1-year window
  // the existing dominance/altseason routes already use until a key is configured.
  const days: number | 'max' = weekly ? (hasKey ? 'max' : 365) : (hasKey ? 730 : 365);

  const [market, coinsRaw] = await Promise.all([
    fetchMarketData(),
    cgFetch<CoinMarket[]>(
      '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=40&page=1&sparkline=false'
    ),
  ]);

  const altIds = coinsRaw
    .filter((c) => c.id !== 'bitcoin' && c.id !== 'ethereum' && !SKIP_IDS.has(c.id))
    .slice(0, 15)
    .map((c) => c.id);

  const LARGE_CAP_COUNT = Math.min(12, altIds.length);

  const [btcHist, ethHist, ...altHists] = await Promise.all([
    fetchCoinMcHistory('bitcoin', days),
    fetchCoinMcHistory('ethereum', days),
    ...altIds.map((id) => fetchCoinMcHistory(id, days).catch(() => [] as MCPoint[])),
  ]);

  const btcMap = toMap(btcHist, weekly);
  const ethMap = toMap(ethHist, weekly);
  const altMaps = altHists.map((h) => toMap(h, weekly));

  const dateKeys = Array.from(new Set([...btcMap.keys(), ...ethMap.keys()])).sort();

  // Calibrate the tracked-alt long tail against today's real total market cap —
  // TOTAL2/TOTAL3/OTHERS.D can't be fetched directly (no free historical index for
  // them), so the gap between our ~15 tracked alts and the real total (thousands of
  // smaller coins) is approximated as a constant multiplier on the tracked-alt sum.
  const altSumNow = altMaps.reduce((sum, m) => sum + (m.get(dateKeys[dateKeys.length - 1]) ?? 0), 0);
  const btcNow = market.btc.usd_market_cap;
  const ethNow = market.eth.usd_market_cap;
  const longTailNow = Math.max(0, market.totalMarketCapUSD - btcNow - ethNow - altSumNow);
  const tailRatio = altSumNow > 0 ? longTailNow / altSumNow : 0;

  const points: RotationSeriesPoint[] = dateKeys
    .map((key) => {
      const btc = btcMap.get(key) ?? 0;
      const eth = ethMap.get(key) ?? 0;
      if (btc <= 0) return null;

      let altSum = 0;
      let largeCapSum = 0;
      altMaps.forEach((m, idx) => {
        const v = m.get(key) ?? 0;
        altSum += v;
        if (idx < LARGE_CAP_COUNT) largeCapSum += v;
      });

      const scaledAltSum = altSum * (1 + tailRatio);

      const total = btc + eth + scaledAltSum;
      const total2 = total - btc;
      const total3 = total2 - eth;
      // largeCapSum is left unscaled (exact, known coins) — total3 already carries
      // the tail-ratio inflation across the whole alt sum, so subtracting the raw
      // large-cap portion correctly leaves "everything smaller", long tail included.
      const others = Math.max(0, total3 - largeCapSum);

      const ts = new Date(key + 'T00:00:00Z').getTime();

      return {
        time: key,
        ts,
        btc,
        eth,
        total,
        total2,
        total3,
        others,
        btcDominance: total > 0 ? (btc / total) * 100 : 0,
        othersDominance: total > 0 ? (others / total) * 100 : 0,
        total3OverBtc: btc > 0 ? total3 / btc : 0,
        othersOverBtc: btc > 0 ? others / btc : 0,
      };
    })
    .filter((p): p is RotationSeriesPoint => p !== null);

  return {
    points,
    largeCapCoinCount: LARGE_CAP_COUNT,
    current: {
      totalMarketCap: market.totalMarketCapUSD,
      btcDominance: market.btcDominance,
      ethDominance: market.ethDominance,
    },
    asOf: new Date().toISOString(),
  };
}
