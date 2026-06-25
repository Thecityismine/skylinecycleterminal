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

// Reserve Risk data — PriceUSD + SplyCur + SplyAct1yr (active supply last 1yr)
// SplyAct1yr may be paywalled; falls back to price-only with null supply fields
export type ReserveRiskRaw = {
  time: string;
  price: number | null;
  splyCur: number | null;
  splyAct1yr: number | null;
};

export async function fetchReserveRiskData(startTime = '2012-01-01'): Promise<ReserveRiskRaw[]> {
  const all: ReserveRiskRaw[] = [];
  let nextPageToken: string | null = null;

  try {
    do {
      const params: Record<string, string> = {
        assets: 'btc', metrics: 'PriceUSD,SplyCur,SplyAct1yr', frequency: '1d',
        start_time: startTime, page_size: '10000',
      };
      if (nextPageToken) params.next_page_token = nextPageToken;
      const json = await coinmetricsGet(params);
      for (const d of json.data ?? []) {
        all.push({
          time:       d.time.slice(0, 10),
          price:      d.PriceUSD    != null ? Number(d.PriceUSD)    : null,
          splyCur:    d.SplyCur     != null ? Number(d.SplyCur)     : null,
          splyAct1yr: d.SplyAct1yr  != null ? Number(d.SplyAct1yr)  : null,
        });
      }
      nextPageToken = (json as any).next_page_token ?? null;
    } while (nextPageToken);

    return all;
  } catch {
    // SplyAct1yr likely paywalled — return price-only rows
    if (all.length > 0) return all;
    const prices = await fetchBTCDailyPrice(startTime);
    return prices.map((p) => ({ time: p.time, price: p.price, splyCur: null, splyAct1yr: null }));
  }
}

// Lightweight fetch of just the latest SplyCur + SplyAct1yr for the Skyline Score
// Returns null if unavailable (paywalled or network error)
export async function fetchCurrentLTHData(): Promise<{ splyCur: number; splyAct1yr: number } | null> {
  try {
    const startDate = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    const json = await coinmetricsGet({
      assets: 'btc', metrics: 'SplyCur,SplyAct1yr', frequency: '1d',
      start_time: startDate, page_size: '5',
    });
    const rows = (json.data ?? []).reverse();
    const row  = rows.find((d) => d.SplyCur != null && d.SplyAct1yr != null);
    if (!row) return null;
    return { splyCur: Number(row.SplyCur), splyAct1yr: Number(row.SplyAct1yr) };
  } catch {
    return null;
  }
}

// Hash rate ribbon data — tries HashRate first, falls back to DiffLast (difficulty)
// Both produce equivalent 30d/60d MA relationships for capitulation detection.
export type HashRibbonRaw = {
  time:     string;
  hashRate: number | null;  // H/s if HashRate available, raw difficulty if DiffLast fallback
  price:    number | null;
  source:   'HashRate' | 'DiffLast' | 'none';
};

async function tryHashMetric(metric: string, startTime: string): Promise<HashRibbonRaw[]> {
  const all: HashRibbonRaw[] = [];
  let nextPageToken: string | null = null;
  do {
    const params: Record<string, string> = {
      assets: 'btc', metrics: `${metric},PriceUSD`, frequency: '1d',
      start_time: startTime, page_size: '10000',
    };
    if (nextPageToken) params.next_page_token = nextPageToken;
    const json = await coinmetricsGet(params);
    for (const d of json.data ?? []) {
      const hr = d[metric] != null ? Number(d[metric]) : null;
      all.push({
        time:     d.time.slice(0, 10),
        hashRate: hr,
        price:    d.PriceUSD != null ? Number(d.PriceUSD) : null,
        source:   metric as 'HashRate' | 'DiffLast',
      });
    }
    nextPageToken = (json as any).next_page_token ?? null;
  } while (nextPageToken);
  return all;
}

export async function fetchBTCHashRibbon(startTime = '2010-01-01'): Promise<HashRibbonRaw[]> {
  try {
    const data = await tryHashMetric('HashRate', startTime);
    if (data.some(d => d.hashRate != null && d.hashRate > 0)) return data;
    throw new Error('HashRate unavailable');
  } catch {
    try {
      return await tryHashMetric('DiffLast', startTime);
    } catch {
      const prices = await fetchBTCDailyPrice(startTime);
      return prices.map(p => ({ time: p.time, hashRate: null, price: p.price, source: 'none' as const }));
    }
  }
}

// ─── MVRV daily data (free-tier proxy for SOPR) ──────────────────────────────

export type MVRVDataPoint = {
  time:  string;
  price: number;
  mvrv:  number;
};

// CapMVRVCur is confirmed free in the Community API.
// We use MVRV as a directional proxy for SOPR: both center on 1.0 (break-even),
// go green above and red below, and identify the same profit/loss regimes.
export async function fetchBTCMVRVData(startTime = '2011-01-01'): Promise<MVRVDataPoint[]> {
  const all: MVRVDataPoint[] = [];
  let nextPageToken: string | null = null;

  do {
    const params: Record<string, string> = {
      assets: 'btc', metrics: 'PriceUSD,CapMVRVCur', frequency: '1d',
      start_time: startTime, page_size: '10000',
    };
    if (nextPageToken) params.next_page_token = nextPageToken;

    const json = await coinmetricsGet(params);
    for (const d of json.data ?? []) {
      if (d.PriceUSD == null || d.CapMVRVCur == null) continue;
      all.push({
        time:  d.time.slice(0, 10),
        price: Number(d.PriceUSD),
        mvrv:  Number(d.CapMVRVCur),
      });
    }
    nextPageToken = (json as any).next_page_token ?? null;
  } while (nextPageToken);

  return all;
}

// ─── Cycle Master data ────────────────────────────────────────────────────────

export type CycleMasterRaw = {
  time: string;
  price: number;
  splyCur: number | null;
  capRealUSD: number | null;
  cdd: number | null;
};

// CapMVRVCur (MVRV ratio) is available on the CoinMetrics Community free tier.
// We derive Realized Cap:  CapRealUSD = Price × SplyCur / MVRV
// because:  MVRV = CapMrktCurUSD / CapRealUSD  →  CapRealUSD = (Price × SplyCur) / MVRV
// CDD remains null — unavailable from any free public API.
export async function fetchCycleMasterData(startTime = '2010-07-01'): Promise<CycleMasterRaw[]> {
  const rows: CycleMasterRaw[] = [];
  let nextPageToken: string | null = null;

  do {
    const params: Record<string, string> = {
      assets: 'btc',
      metrics: 'PriceUSD,SplyCur,CapMVRVCur',
      frequency: '1d',
      start_time: startTime,
      page_size: '10000',
    };
    if (nextPageToken) params.next_page_token = nextPageToken;
    const json = await coinmetricsGet(params);

    for (const d of json.data ?? []) {
      if (d.PriceUSD == null) continue;
      const price   = Number(d.PriceUSD);
      const splyCur = d.SplyCur    != null ? Number(d.SplyCur)    : null;
      const mvrv    = d.CapMVRVCur != null ? Number(d.CapMVRVCur) : null;
      // Derive realized cap from MVRV (both free-tier)
      const capRealUSD =
        mvrv != null && mvrv > 0 && splyCur != null
          ? (price * splyCur) / mvrv
          : null;
      rows.push({ time: d.time.slice(0, 10), price, splyCur, capRealUSD, cdd: null });
    }
    nextPageToken = (json as any).next_page_token ?? null;
  } while (nextPageToken);

  return rows;
}

// ─── Exchange reserve data (SplyExNtv + SplyCur) ─────────────────────────────
// SplyExNtv = BTC held on exchanges (free, available from ~2016)
// Declining exchange supply = coins moving to cold storage = long-term holding behavior

export type ExchangeReservePoint = {
  time:    string;
  price:   number;
  exchBtc: number;   // BTC on exchanges (SplyExNtv)
  splyCur: number;   // circulating supply (SplyCur)
};

export async function fetchBTCExchangeReserve(startTime = '2016-01-01'): Promise<ExchangeReservePoint[]> {
  const all: ExchangeReservePoint[] = [];
  let nextPageToken: string | null = null;

  do {
    const params: Record<string, string> = {
      assets: 'btc', metrics: 'PriceUSD,SplyExNtv,SplyCur', frequency: '1d',
      start_time: startTime, page_size: '10000',
    };
    if (nextPageToken) params.next_page_token = nextPageToken;

    const json = await coinmetricsGet(params);
    for (const d of json.data ?? []) {
      if (d.PriceUSD == null || d.SplyExNtv == null || d.SplyCur == null) continue;
      all.push({
        time:    d.time.slice(0, 10),
        price:   Number(d.PriceUSD),
        exchBtc: Number(d.SplyExNtv),
        splyCur: Number(d.SplyCur),
      });
    }
    nextPageToken = (json as any).next_page_token ?? null;
  } while (nextPageToken);

  return all;
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
