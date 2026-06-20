const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; SkylineTerminal/1.0)',
  'Accept': 'application/json',
};

// ── Weekly price history ──────────────────────────────────────────────────────

export type WeeklyClose = {
  time:  string;  // YYYY-MM-DD
  ts:    number;
  open:  number | null;
  high:  number | null;
  low:   number | null;
  close: number;
};

export async function fetchWeeklyHistory(ticker: string): Promise<WeeklyClose[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1wk&range=max`;
  const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate: 3600 }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Yahoo chart ${ticker} HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo chart ${ticker}: no result`);

  const timestamps: number[]      = result.timestamp ?? [];
  const q                          = result.indicators?.quote?.[0] ?? {};
  const opens:  (number|null)[]    = q.open   ?? [];
  const highs:  (number|null)[]    = q.high   ?? [];
  const lows:   (number|null)[]    = q.low    ?? [];
  const closes: (number|null)[]    = q.close  ?? [];

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
  name:             string | null;
  currency:         string | null;
  price:            number | null;
  previousClose:    number | null;
  change1d:         number | null;  // %
  marketCap:        number | null;
  high52w:          number | null;
  low52w:           number | null;
  trailingPE:       number | null;
  forwardPE:        number | null;
  priceToBook:      number | null;
  priceToSales:     number | null;
  evToEbitda:       number | null;
  pegRatio:         number | null;
  eps:              number | null;
  forwardEps:       number | null;
  sharesOutstanding: number | null;
  dividendYield:    number | null;
  // Quality
  revenueGrowth:    number | null;  // yoy
  earningsGrowth:   number | null;
  grossMargin:      number | null;
  operatingMargin:  number | null;
  profitMargin:     number | null;
  returnOnEquity:   number | null;
  freeCashflow:     number | null;
  totalDebt:        number | null;
  totalCash:        number | null;
  currentRatio:     number | null;
  // Analyst
  targetMeanPrice:  number | null;
  recommendation:   string | null;
};

function raw(obj: any, key: string): number | null {
  const v = obj?.[key];
  if (v == null) return null;
  if (typeof v === 'object' && 'raw' in v) return v.raw ?? null;
  if (typeof v === 'number') return v;
  return null;
}
function str(obj: any, key: string): string | null {
  const v = obj?.[key];
  if (v == null) return null;
  if (typeof v === 'object' && 'longFmt' in v) return String(v.longFmt);
  if (typeof v === 'string') return v;
  return null;
}

export async function fetchFundamentals(ticker: string): Promise<YahooFundamentals> {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${MODULES}`;
  const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate: 3600 }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Yahoo summary ${ticker} HTTP ${res.status}`);
  const json = await res.json();
  const r    = json?.quoteSummary?.result?.[0];
  if (!r)    throw new Error(`Yahoo summary ${ticker}: no result`);

  const sd = r.summaryDetail    ?? {};
  const ks = r.defaultKeyStatistics ?? {};
  const fd = r.financialData    ?? {};
  const pr = r.price            ?? {};

  const prevClose = raw(sd, 'previousClose') ?? raw(pr, 'regularMarketPreviousClose');
  const curPrice  = raw(pr, 'regularMarketPrice') ?? raw(sd, 'previousClose');
  const change1d  = curPrice != null && prevClose != null && prevClose > 0
    ? ((curPrice - prevClose) / prevClose) * 100 : null;

  return {
    name:             pr.longName ?? pr.shortName ?? null,
    currency:         pr.currency ?? null,
    price:            curPrice,
    previousClose:    prevClose,
    change1d,
    marketCap:        raw(pr, 'marketCap') ?? raw(sd, 'marketCap'),
    high52w:          raw(sd, 'fiftyTwoWeekHigh'),
    low52w:           raw(sd, 'fiftyTwoWeekLow'),
    trailingPE:       raw(sd, 'trailingPE'),
    forwardPE:        raw(sd, 'forwardPE'),
    priceToBook:      raw(ks, 'priceToBook'),
    priceToSales:     raw(sd, 'priceToSalesTrailing12Months'),
    evToEbitda:       raw(ks, 'enterpriseToEbitda'),
    pegRatio:         raw(ks, 'pegRatio'),
    eps:              raw(ks, 'trailingEps'),
    forwardEps:       raw(ks, 'forwardEps'),
    sharesOutstanding: raw(ks, 'sharesOutstanding'),
    dividendYield:    raw(sd, 'dividendYield'),
    revenueGrowth:    raw(fd, 'revenueGrowth'),
    earningsGrowth:   raw(fd, 'earningsGrowth'),
    grossMargin:      raw(fd, 'grossMargins'),
    operatingMargin:  raw(fd, 'operatingMargins'),
    profitMargin:     raw(fd, 'profitMargins'),
    returnOnEquity:   raw(fd, 'returnOnEquity'),
    freeCashflow:     raw(fd, 'freeCashflow'),
    totalDebt:        raw(fd, 'totalDebt'),
    totalCash:        raw(fd, 'totalCash'),
    currentRatio:     raw(fd, 'currentRatio'),
    targetMeanPrice:  raw(fd, 'targetMeanPrice'),
    recommendation:   fd.recommendationKey ?? null,
  };
}
