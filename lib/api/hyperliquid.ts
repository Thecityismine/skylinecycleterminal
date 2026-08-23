// Hyperliquid perpetuals data.
//
// What this can and cannot see, because it decides the whole shape of the page:
//
// The public info endpoint exposes market-wide *aggregates* — mark price, open
// interest, funding, premium, volume — plus per-coin candles and funding
// history. It does not expose anything per-position. Every documented position
// query takes a single 42-character address, there is no leaderboard, and the
// WebSocket has no market-wide liquidation stream: liquidation data appears only
// inside per-user fill events.
//
// So a liquidation heatmap, an entry-price heatmap, or a largest-positions table
// cannot be built from this API at any effort level. Products that show those
// have indexed the L1 themselves for months. Nothing here pretends otherwise:
// the page renders what the venue actually publishes.

const API = 'https://api.hyperliquid.xyz/info';

// One hour matches the funding cadence, which is the slowest series here. The
// route is force-dynamic + default-cache, so this is what actually throttles the
// vendor call while the page itself recomputes per request.
const REVALIDATE = 3600;

// Live-ish figures move every block, so the snapshot call is deliberately not
// cached as long as the history calls.
const SNAPSHOT_REVALIDATE = 60;

export type HlMarket = 'BTC' | 'ETH';

export type HlSnapshot = {
  coin:          HlMarket;
  markPx:        number;
  oraclePx:      number;
  midPx:         number | null;
  prevDayPx:     number;
  change24hPct:  number;
  openInterest:  number;   // in coin units
  openInterestUsd: number;
  fundingHourly: number;   // raw hourly rate, e.g. 0.0000125
  fundingApr:    number;   // percent
  premiumPct:    number | null;
  dayNtlVlm:     number;
};

export type HlFundingPoint = { time: string; ts: number; apr: number };
export type HlPricePoint   = { time: string; ts: number; close: number };

export type HyperliquidData = {
  snapshot: HlSnapshot;
  funding:  HlFundingPoint[];
  price:    HlPricePoint[];
  fetchedAt: string;
};

type AssetCtx = {
  funding: string; openInterest: string; prevDayPx: string; dayNtlVlm: string;
  premium: string | null; oraclePx: string; markPx: string; midPx: string | null;
};

async function info<T>(body: unknown, revalidate: number): Promise<T> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    next: { revalidate },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Hyperliquid HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const num = (v: string | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const isoDay = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/** Funding on Hyperliquid is charged hourly, so the annualised rate is rate × 24 × 365. */
export function fundingToApr(hourly: number): number {
  return hourly * 24 * 365 * 100;
}

async function fetchSnapshot(coin: HlMarket): Promise<HlSnapshot> {
  const [meta, ctxs] = await info<[{ universe: { name: string }[] }, AssetCtx[]]>(
    { type: 'metaAndAssetCtxs' },
    SNAPSHOT_REVALIDATE,
  );

  const i = meta.universe.findIndex((u) => u.name === coin);
  if (i < 0) throw new Error(`Hyperliquid has no ${coin} perp`);
  const c = ctxs[i];

  const markPx    = num(c.markPx);
  const prevDayPx = num(c.prevDayPx);
  const oi        = num(c.openInterest);
  const funding   = num(c.funding);

  if (markPx == null || prevDayPx == null || oi == null || funding == null) {
    throw new Error(`Hyperliquid returned an incomplete ${coin} context`);
  }

  return {
    coin,
    markPx,
    oraclePx:        num(c.oraclePx) ?? markPx,
    midPx:           num(c.midPx),
    prevDayPx,
    change24hPct:    ((markPx - prevDayPx) / prevDayPx) * 100,
    openInterest:    oi,
    openInterestUsd: oi * markPx,
    fundingHourly:   funding,
    fundingApr:      fundingToApr(funding),
    premiumPct:      num(c.premium) != null ? num(c.premium)! * 100 : null,
    dayNtlVlm:       num(c.dayNtlVlm) ?? 0,
  };
}

// fundingHistory returns at most 500 rows, oldest first, counting forward from
// startTime. It does not return the most recent 500. Asking for 30 days gets you
// the 500 hours that begin 30 days ago and stops 9 days short of now; asking for
// 90 days returns a window that ended two months ago. The failure is silent —
// a full-looking series that quietly omits the present — so the window is paged
// forward until it reaches now.
const FUNDING_PAGE_MAX = 500;
const HOUR_MS = 3_600_000;

async function fetchFunding(coin: HlMarket, days: number): Promise<HlFundingPoint[]> {
  const out = new Map<number, HlFundingPoint>();
  let cursor = Date.now() - days * 86_400_000;

  // 90 days is ~2,160 hourly rows, so five pages covers the widest window the
  // route allows. The cap is a guard against a server that stops advancing.
  for (let page = 0; page < 8; page++) {
    const rows = await info<{ time: number; fundingRate: string }[]>(
      { type: 'fundingHistory', coin, startTime: cursor },
      REVALIDATE,
    );
    if (!rows?.length) break;

    for (const r of rows) {
      const rate = num(r.fundingRate);
      if (rate != null) out.set(r.time, { time: isoDay(r.time), ts: r.time, apr: fundingToApr(rate) });
    }

    const last = rows[rows.length - 1].time;
    if (rows.length < FUNDING_PAGE_MAX || last <= cursor) break;
    cursor = last + HOUR_MS;
  }

  return [...out.values()].sort((a, b) => a.ts - b.ts);
}

async function fetchCandles(coin: HlMarket, days: number): Promise<HlPricePoint[]> {
  // Candle fields are single letters: t open time, c close.
  const rows = await info<{ t: number; c: string }[]>(
    {
      type: 'candleSnapshot',
      req: { coin, interval: '1h', startTime: Date.now() - days * 86_400_000, endTime: Date.now() },
    },
    REVALIDATE,
  );
  return (rows ?? [])
    .map((r) => {
      const close = num(r.c);
      return close == null ? null : { time: isoDay(r.t), ts: r.t, close };
    })
    .filter((p): p is HlPricePoint => p != null);
}

export async function fetchHyperliquid(
  coin: HlMarket = 'BTC',
  days = 30,
): Promise<HyperliquidData> {
  // The snapshot is the only part the page cannot render without. History
  // failing degrades a chart; it should not blank the stat row.
  const [snapshot, fundingRes, priceRes] = await Promise.all([
    fetchSnapshot(coin),
    fetchFunding(coin, days).catch(() => [] as HlFundingPoint[]),
    fetchCandles(coin, days).catch(() => [] as HlPricePoint[]),
  ]);

  return { snapshot, funding: fundingRes, price: priceRes, fetchedAt: new Date().toISOString() };
}
