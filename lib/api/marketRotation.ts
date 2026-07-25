import { fetchMarketData } from './coingecko';
import { fetchCointraderMarketCapHistory } from './cointrader';

const CG = 'https://api.coingecko.com/api/v3';

// charts.cointrader.pro market-cap symbols for BTC, ETH, and a fixed set of
// major alts — used ONLY to backfill dates older than CoinGecko's free-tier
// 365-day window. Every symbol here was manually verified live (value +
// freshness) before being added; this catalog has stale/dead feeds under
// confusingly similar names (e.g. "AVALANCHE-AVAX:MARKETCAP" territory —
// verified "AVALANCHE:MARKETCAP" is the live one). This is necessarily a
// fixed, present-day "large alt" set applied uniformly across all history,
// unlike the live top-15-by-market-cap list CoinGecko drives the recent
// window with — it won't perfectly reflect which coins were actually
// large-cap at any given historical date, but it's the same style of
// approximation the tail-ratio scaling below already makes.
const COINTRADER_BTC_SYMBOL   = 'BITCOIN:MARKETCAP';
const COINTRADER_ETH_SYMBOL   = 'ETHEREUM:MARKETCAP';
const COINTRADER_ALT_SYMBOLS  = [
  'BNB:MARKETCAP', 'XRP:MARKETCAP', 'SOLANA:MARKETCAP', 'DOGECOIN:MARKETCAP',
  'CHAINLINK:MARKETCAP', 'CARDANO:MARKETCAP', 'STELLAR:MARKETCAP', 'TONCOIN:MARKETCAP',
  'LITECOIN:MARKETCAP', 'AVALANCHE:MARKETCAP', 'POLKADOT-NEW:MARKETCAP',
  'FILECOIN:MARKETCAP', 'CURVE-DAO-TOKEN:MARKETCAP',
];
const COINTRADER_BACKFILL_FROM = Math.floor(new Date('2013-01-01T00:00:00Z').getTime() / 1000);

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

  // ── Deep-history backfill from charts.cointrader.pro ──────────────────────
  // CoinGecko's free tier only reaches back `days` far (365 without a paid
  // key). Backfill everything strictly older than that from cointrader.pro's
  // unofficial, undocumented — but manually verified — market-cap feeds.
  // Never fatal: any failure here just leaves the CoinGecko-only window as-is.
  const earliestCgKey = [...btcMap.keys()].sort()[0];
  const backfillAltSumMap = new Map<string, number>();

  if (earliestCgKey) {
    const cutoffTs = Math.floor(new Date(earliestCgKey + 'T00:00:00Z').getTime() / 1000);
    try {
      const [btcBackfill, ethBackfill, ...altBackfills] = await Promise.all([
        fetchCointraderMarketCapHistory(COINTRADER_BTC_SYMBOL, COINTRADER_BACKFILL_FROM, cutoffTs),
        fetchCointraderMarketCapHistory(COINTRADER_ETH_SYMBOL, COINTRADER_BACKFILL_FROM, cutoffTs),
        ...COINTRADER_ALT_SYMBOLS.map((sym) =>
          fetchCointraderMarketCapHistory(sym, COINTRADER_BACKFILL_FROM, cutoffTs).catch(() => [] as MCPoint[])
        ),
      ]);

      const btcBackfillMap = toMap(btcBackfill, weekly);
      const ethBackfillMap = toMap(ethBackfill, weekly);
      const altBackfillMaps = altBackfills.map((h) => toMap(h, weekly));

      // Continuity check AT THE MERGE SEAM ONLY — not across the whole
      // backfilled range. Crypto genuinely has had >50% single-week moves
      // during thin, early periods (e.g. the Oct/Nov 2013 run-up), so
      // scanning every week over 13 years of history for "no big jumps"
      // produces false positives on real volatility. The seam itself, by
      // construction, always borders a RECENT date (~1yr before "today"),
      // where a >50% single-week move in the combined BTC+ETH+tracked-alt
      // market cap would be a genuine red flag rather than an artifact of
      // an especially wild early-Bitcoin week. This unofficial,
      // undocumented vendor has been observed during testing to
      // occasionally return an inflated read right around the boundary —
      // if this check trips, the whole backfill is distrusted and
      // discarded for this request rather than risk a corrupted chart.
      const lastBackfillKey = [...btcBackfillMap.keys()].filter((k) => k < earliestCgKey).sort().at(-1);
      if (lastBackfillKey) {
        const combinedBackfill =
          (btcBackfillMap.get(lastBackfillKey) ?? 0) + (ethBackfillMap.get(lastBackfillKey) ?? 0)
          + altBackfillMaps.reduce((sum, m) => sum + (m.get(lastBackfillKey) ?? 0), 0);
        const combinedReal =
          (btcMap.get(earliestCgKey) ?? 0) + (ethMap.get(earliestCgKey) ?? 0)
          + altMaps.reduce((sum, m) => sum + (m.get(earliestCgKey) ?? 0), 0);

        if (combinedBackfill > 0 && combinedReal > 0) {
          const ratio = combinedBackfill / combinedReal;
          if (ratio > 1.5 || ratio < 1 / 1.5) {
            throw new Error(
              `backfill continuity check failed between ${lastBackfillKey} and ${earliestCgKey}: ` +
              `combined market cap moved ${(ratio * 100 - 100).toFixed(0)}% across the seam`
            );
          }
        }
      }

      for (const [key, v] of btcBackfillMap) {
        if (key < earliestCgKey) btcMap.set(key, v);
      }
      for (const [key, v] of ethBackfillMap) {
        if (key < earliestCgKey) ethMap.set(key, v);
      }
      for (const m of altBackfillMaps) {
        for (const [key, v] of m) {
          if (key < earliestCgKey) backfillAltSumMap.set(key, (backfillAltSumMap.get(key) ?? 0) + v);
        }
      }
    } catch (err) {
      console.warn('[marketRotation] cointrader.pro backfill failed, using CoinGecko-only window:', (err as Error).message);
    }
  }

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
      if (backfillAltSumMap.has(key)) {
        // Backfilled (pre-CoinGecko-window) date — fixed 13-coin proxy set,
        // all treated as "large cap" (see COINTRADER_ALT_SYMBOLS above).
        altSum = backfillAltSumMap.get(key) ?? 0;
        largeCapSum = altSum;
      } else {
        altMaps.forEach((m, idx) => {
          const v = m.get(key) ?? 0;
          altSum += v;
          if (idx < LARGE_CAP_COUNT) largeCapSum += v;
        });
      }

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
