export type PricePoint = {
  time: string;  // "YYYY-MM-DD"
  price: number;
};

// Metrics definitely available in the CoinMetrics Community (free) API:
// PriceUSD, CapMrktCurUSD, TxCnt, AdrActCnt, IssTotNtv
// Paid/unavailable: CapMVRVCur, TxTfrValAdjUSD (return 403)
export type OnChainPoint = {
  time: string;
  price: number | null;
  txCnt: number | null;
  adrActCnt: number | null;
  marketCap: number | null;
  issTotNtv: number | null;  // daily BTC issuance (block reward)
};

async function coinmetricsGet(params: Record<string, string>): Promise<{ data: Record<string, string>[] }> {
  const url = new URL('https://community-api.coinmetrics.io/v4/timeseries/asset-metrics');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`CoinMetrics HTTP ${res.status}`);
  return res.json();
}

// Generic daily price fetch — asset can be 'btc' or 'eth'
export async function fetchDailyPrice(asset: string = 'btc', startTime = '2012-01-01'): Promise<PricePoint[]> {
  const all: PricePoint[] = [];
  let nextPageToken: string | null = null;

  do {
    const params: Record<string, string> = {
      assets: asset, metrics: 'PriceUSD', frequency: '1d',
      start_time: startTime, page_size: '10000',
    };
    if (nextPageToken) params.next_page_token = nextPageToken;

    const json = await coinmetricsGet(params);

    for (const d of json.data ?? []) {
      if (d.PriceUSD != null) all.push({ time: d.time.slice(0, 10), price: Number(d.PriceUSD) });
    }
    nextPageToken = (json as any).next_page_token ?? null;
  } while (nextPageToken);

  return all;
}

// BTC-specific alias kept for existing callers (realized price page, etc.)
export async function fetchBTCDailyPrice(startTime = '2012-01-01'): Promise<PricePoint[]> {
  return fetchDailyPrice('btc', startTime);
}

// Realized Price = CapRealUSD / SplyCur — the average cost basis of all BTC holders
// CapRealUSD may or may not be in the free Community tier; falls back to price-only if 403.
export type RealizedPricePoint = {
  time: string;
  price: number;
  realized: number | null;  // null if CapRealUSD not available in free tier
};

export async function fetchBTCRealizedPrice(startTime = '2012-01-01'): Promise<RealizedPricePoint[]> {
  const all: RealizedPricePoint[] = [];
  let nextPageToken: string | null = null;

  try {
    do {
      const params: Record<string, string> = {
        assets: 'btc', metrics: 'PriceUSD,CapRealUSD,SplyCur', frequency: '1d',
        start_time: startTime, page_size: '10000',
      };
      if (nextPageToken) params.next_page_token = nextPageToken;

      const json = await coinmetricsGet(params);

      for (const d of json.data ?? []) {
        if (d.PriceUSD == null) continue;
        const capReal = d.CapRealUSD != null ? Number(d.CapRealUSD) : null;
        const sply    = d.SplyCur    != null ? Number(d.SplyCur)    : null;
        all.push({
          time:     d.time.slice(0, 10),
          price:    Number(d.PriceUSD),
          realized: capReal != null && sply != null && sply > 0 ? capReal / sply : null,
        });
      }
      nextPageToken = (json as any).next_page_token ?? null;
    } while (nextPageToken);

    return all;
  } catch {
    // CapRealUSD likely paywalled — return price-only data with realized: null
    if (all.length > 0) return all;
    const prices = await fetchBTCDailyPrice(startTime);
    return prices.map((p) => ({ ...p, realized: null }));
  }
}

// Full free-tier on-chain metrics — used by the Skyline Cycle Score computation
export async function fetchOnChainMetrics(startTime = '2022-01-01'): Promise<OnChainPoint[]> {
  // Only request metrics known to be in the free Community API
  const FREE_METRICS = 'PriceUSD,CapMrktCurUSD,TxCnt,AdrActCnt,IssTotNtv';
  const all: OnChainPoint[] = [];
  let nextPageToken: string | null = null;

  do {
    const params: Record<string, string> = {
      assets: 'btc', metrics: FREE_METRICS, frequency: '1d',
      start_time: startTime, page_size: '10000',
    };
    if (nextPageToken) params.next_page_token = nextPageToken;

    const json = await coinmetricsGet(params);

    for (const d of json.data ?? []) {
      all.push({
        time:      d.time.slice(0, 10),
        price:     d.PriceUSD      != null ? Number(d.PriceUSD)      : null,
        txCnt:     d.TxCnt         != null ? Number(d.TxCnt)         : null,
        adrActCnt: d.AdrActCnt     != null ? Number(d.AdrActCnt)     : null,
        marketCap: d.CapMrktCurUSD != null ? Number(d.CapMrktCurUSD) : null,
        issTotNtv: d.IssTotNtv     != null ? Number(d.IssTotNtv)     : null,
      });
    }
    nextPageToken = (json as any).next_page_token ?? null;
  } while (nextPageToken);

  return all;
}
