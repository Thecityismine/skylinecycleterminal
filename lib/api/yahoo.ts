const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Crumb-based session auth ──────────────────────────────────────────────────
// Yahoo Finance quoteSummary requires a crumb + cookie pair obtained by first
// visiting finance.yahoo.com.  Cache the pair for up to 1 hour per process.

type Credentials = { crumb: string; cookie: string; ts: number };
let credCache: Credentials | null = null;

async function getCredentials(): Promise<Credentials> {
  if (credCache && Date.now() - credCache.ts < 3_600_000) return credCache;

  const homeRes = await fetch('https://finance.yahoo.com/', {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow',
  });

  // getSetCookie() returns an array (Node 18.14+); fall back to .get() string
  const rawArr: string[] =
    (homeRes.headers as any).getSetCookie?.() ??
    (homeRes.headers.get('set-cookie') ?? '').split(/,(?=[^\s])/).map((s: string) => s.trim());

  const cookie = rawArr
    .map((s: string) => s.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');

  const crumbRes = await fetch(
    'https://query2.finance.yahoo.com/v1/test/getcrumb',
    {
      headers: { 'User-Agent': BROWSER_UA, 'Cookie': cookie, 'Accept': '*/*' },
      signal: AbortSignal.timeout(10_000),
    },
  );
  const crumb = (await crumbRes.text()).trim();

  if (!crumb || crumb.includes('<') || crumb.length > 30) {
    throw new Error(`Yahoo crumb invalid (${crumb.slice(0, 40)})`);
  }

  credCache = { crumb, cookie, ts: Date.now() };
  return credCache;
}

// ── Weekly price history ──────────────────────────────────────────────────────

export type WeeklyClose = {
  time:  string;   // YYYY-MM-DD
  ts:    number;   // ms epoch
  open:  number | null;
  high:  number | null;
  low:   number | null;
  close: number;
};

export async function fetchWeeklyHistory(ticker: string): Promise<WeeklyClose[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1wk&range=max`;
  const res = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json' },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Yahoo chart ${ticker} HTTP ${res.status}`);
  const json   = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result)  throw new Error(`Yahoo chart ${ticker}: no result`);

  const timestamps: number[]       = result.timestamp ?? [];
  const q                           = result.indicators?.quote?.[0] ?? {};
  const opens:  (number | null)[]   = q.open  ?? [];
  const highs:  (number | null)[]   = q.high  ?? [];
  const lows:   (number | null)[]   = q.low   ?? [];
  const closes: (number | null)[]   = q.close ?? [];

  const out: WeeklyClose[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (c == null || c <= 0) continue;
    out.push({
      time:  new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
      ts:    timestamps[i] * 1000,
      open:  opens[i]  ?? null,
      high:  highs[i]  ?? null,
      low:   lows[i]   ?? null,
      close: c,
    });
  }
  return out;
}

// ── Quote summary (fundamentals) ─────────────────────────────────────────────

const MODULES = [
  'summaryDetail',
  'defaultKeyStatistics',
  'financialData',
  'price',
].join(',');

export type YahooFundamentals = {
  name:              string | null;
  currency:          string | null;
  price:             number | null;
  previousClose:     number | null;
  change1d:          number | null;
  marketCap:         number | null;
  high52w:           number | null;
  low52w:            number | null;
  trailingPE:        number | null;
  forwardPE:         number | null;
  priceToBook:       number | null;
  priceToSales:      number | null;
  evToEbitda:        number | null;
  pegRatio:          number | null;
  eps:               number | null;
  forwardEps:        number | null;
  sharesOutstanding: number | null;
  dividendYield:     number | null;
  revenueGrowth:     number | null;
  earningsGrowth:    number | null;
  grossMargin:       number | null;
  operatingMargin:   number | null;
  profitMargin:      number | null;
  returnOnEquity:    number | null;
  freeCashflow:      number | null;
  totalDebt:         number | null;
  totalCash:         number | null;
  currentRatio:      number | null;
  targetMeanPrice:   number | null;
  recommendation:    string | null;
};

export const EMPTY_FUNDAMENTALS: YahooFundamentals = {
  name: null, currency: null, price: null, previousClose: null, change1d: null,
  marketCap: null, high52w: null, low52w: null, trailingPE: null, forwardPE: null,
  priceToBook: null, priceToSales: null, evToEbitda: null, pegRatio: null,
  eps: null, forwardEps: null, sharesOutstanding: null, dividendYield: null,
  revenueGrowth: null, earningsGrowth: null, grossMargin: null, operatingMargin: null,
  profitMargin: null, returnOnEquity: null, freeCashflow: null, totalDebt: null,
  totalCash: null, currentRatio: null, targetMeanPrice: null, recommendation: null,
};

function raw(obj: any, key: string): number | null {
  const v = obj?.[key];
  if (v == null) return null;
  if (typeof v === 'object' && 'raw' in v) return (v as any).raw ?? null;
  if (typeof v === 'number') return v;
  return null;
}

export async function fetchFundamentals(ticker: string): Promise<YahooFundamentals> {
  const { crumb, cookie } = await getCredentials();

  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${MODULES}&crumb=${encodeURIComponent(crumb)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Cookie': cookie,
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    // If auth expired, clear cache so next request re-fetches credentials
    if (res.status === 401 || res.status === 403) credCache = null;
    throw new Error(`Yahoo quoteSummary ${ticker} HTTP ${res.status}`);
  }

  const json = await res.json();
  const r    = json?.quoteSummary?.result?.[0];
  if (!r)    throw new Error(`Yahoo quoteSummary ${ticker}: no result`);

  const sd = r.summaryDetail           ?? {};
  const ks = r.defaultKeyStatistics    ?? {};
  const fd = r.financialData           ?? {};
  const pr = r.price                   ?? {};

  const prevClose = raw(sd, 'previousClose') ?? raw(pr, 'regularMarketPreviousClose');
  const curPrice  = raw(pr, 'regularMarketPrice') ?? raw(sd, 'previousClose');
  const change1d  = curPrice != null && prevClose != null && prevClose > 0
    ? ((curPrice - prevClose) / prevClose) * 100 : null;

  return {
    name:              pr.longName ?? pr.shortName ?? null,
    currency:          pr.currency ?? null,
    price:             curPrice,
    previousClose:     prevClose,
    change1d,
    marketCap:         raw(pr, 'marketCap') ?? raw(sd, 'marketCap'),
    high52w:           raw(sd, 'fiftyTwoWeekHigh'),
    low52w:            raw(sd, 'fiftyTwoWeekLow'),
    trailingPE:        raw(sd, 'trailingPE'),
    forwardPE:         raw(sd, 'forwardPE'),
    priceToBook:       raw(ks, 'priceToBook'),
    priceToSales:      raw(sd, 'priceToSalesTrailing12Months'),
    evToEbitda:        raw(ks, 'enterpriseToEbitda'),
    pegRatio:          raw(ks, 'pegRatio'),
    eps:               raw(ks, 'trailingEps'),
    forwardEps:        raw(ks, 'forwardEps'),
    sharesOutstanding: raw(ks, 'sharesOutstanding'),
    dividendYield:     raw(sd, 'dividendYield'),
    revenueGrowth:     raw(fd, 'revenueGrowth'),
    earningsGrowth:    raw(fd, 'earningsGrowth'),
    grossMargin:       raw(fd, 'grossMargins'),
    operatingMargin:   raw(fd, 'operatingMargins'),
    profitMargin:      raw(fd, 'profitMargins'),
    returnOnEquity:    raw(fd, 'returnOnEquity'),
    freeCashflow:      raw(fd, 'freeCashflow'),
    totalDebt:         raw(fd, 'totalDebt'),
    totalCash:         raw(fd, 'totalCash'),
    currentRatio:      raw(fd, 'currentRatio'),
    targetMeanPrice:   raw(fd, 'targetMeanPrice'),
    recommendation:    fd.recommendationKey ?? null,
  };
}
