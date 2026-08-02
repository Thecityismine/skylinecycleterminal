// Macro Terminal — raw data layer
//
// Aggregates every series the Macro Risk Score is built from. Each source is
// fetched independently and degrades to an empty array on failure, so one dead
// endpoint never takes the page down — the scoring layer treats a missing
// series as "unavailable" rather than substituting a fabricated value.
//
// Sources: FRED (St. Louis Fed), Yahoo Finance, CoinMetrics, DeFiLlama.

import { fetchBTCDailyPrice, type PricePoint } from '@/lib/api/coinmetrics';
import { fetchWeeklyHistory } from '@/lib/api/yahoo';
import { fetchStablecoinHistory, type StablecoinHistoryPoint } from '@/lib/api/defillama';

export type Pt = { date: string; value: number };

// ── FRED ──────────────────────────────────────────────────────────────────────

const FRED_START = '2006-01-01';   // deep enough to include the GFC in percentiles

async function fredSeries(seriesId: string, start = FRED_START): Promise<Pt[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) return [];
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${key}&file_type=json` +
    `&sort_order=asc&observation_start=${start}`;
  try {
    const res = await fetch(url, {
      next:   { revalidate: 3600 },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.observations as Array<{ date: string; value: string }>)
      .filter(o => o.value !== '.' && o.value !== '')
      .map(o => ({ date: o.date, value: Number(o.value) }))
      .filter(o => Number.isFinite(o.value));
  } catch {
    return [];
  }
}

// ── Yahoo (weekly closes) ────────────────────────────────────────────────────
// Two paths, because neither works everywhere: the unauthenticated chart endpoint
// is blocked from data-center IPs (so Vercel needs the crumb), while the crumb
// handshake fails on hosts where finance.yahoo.com won't set its session cookies
// (so local dev needs the plain endpoint). Try crumb first, then fall back.

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function yahooWeeklyPlain(ticker: string): Promise<Pt[]> {
  // An explicit period window is required: `range=max` silently downgrades the
  // granularity to quarterly bars even when interval=1wk is requested, which
  // leaves too few points for a 52-week average.
  const period2 = Math.floor(Date.now() / 1000) + 86_400;
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1wk&period1=0&period2=${period2}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept': 'application/json' },
      next:    { revalidate: 3600 },
      signal:  AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const json   = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const ts: number[]              = result.timestamp ?? [];
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

    const out: Pt[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (c == null || c <= 0) continue;
      out.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), value: c });
    }
    return out;
  } catch {
    return [];
  }
}

async function yahooWeekly(ticker: string): Promise<Pt[]> {
  try {
    const bars = await fetchWeeklyHistory(ticker);
    if (bars.length) return bars.map(b => ({ date: b.time, value: b.close }));
  } catch {
    // fall through to the unauthenticated endpoint
  }
  return yahooWeeklyPlain(ticker);
}

// ── Shape ─────────────────────────────────────────────────────────────────────

export type MacroTerminalData = {
  // Liquidity
  fedAssets:      Pt[];   // WALCL      — Fed total assets, $M, weekly
  reverseRepo:    Pt[];   // RRPONTSYD  — overnight RRP, $B, daily
  tga:            Pt[];   // WTREGEN    — Treasury General Account, $M, weekly
  usM2:           Pt[];   // WM2NS      — US M2, $B, weekly
  ecbAssets:      Pt[];   // ECBASSETSW — ECB total assets, €M, weekly
  bojAssets:      Pt[];   // JPNASSETS  — BOJ total assets, ¥100M, monthly
  usdPerEur:      Pt[];   // DEXUSEU
  jpyPerUsd:      Pt[];   // DEXJPUS

  // Equities
  spx:            Pt[];   // SP500
  nasdaq:         Pt[];   // NASDAQCOM
  dow:            Pt[];   // DJIA
  russell:        Pt[];   // Yahoo ^RUT, weekly
  marginDebt:     Pt[];   // BOGZ1FL663067003Q — margin accounts at broker-dealers, $M, quarterly

  // Credit
  hyOas:          Pt[];   // BAMLH0A0HYM2
  igOas:          Pt[];   // BAMLC0A0CM
  cccOas:         Pt[];   // BAMLH0A3HYC
  cpRate:         Pt[];   // DCPN3M — 3M nonfinancial commercial paper
  tbill3m:        Pt[];   // DTB3
  lendingStd:     Pt[];   // DRTSCILM — net % of banks tightening C&I standards, quarterly
  bankCredit:     Pt[];   // TOTBKCR — all commercial banks, $B, weekly
  nfci:           Pt[];   // NFCI — Chicago Fed National Financial Conditions Index

  // Dollar & rates
  dxy:            Pt[];   // DTWEXBGS
  realYield10y:   Pt[];   // DFII10
  ust10y:         Pt[];   // DGS10
  ust30y:         Pt[];   // DGS30
  yieldCurve:     Pt[];   // T10Y2Y

  // Volatility
  vix:            Pt[];   // VIXCLS
  vxn:            Pt[];   // VXNCLS
  ovx:            Pt[];   // OVXCLS — crude oil vol
  gvz:            Pt[];   // GVZCLS — gold vol
  move:           Pt[];   // Yahoo ^MOVE, weekly — bond vol

  // Crypto / cross-asset
  btc:            Pt[];
  gold:           Pt[];
  stablecoins:    StablecoinHistoryPoint[];

  btcHistory:     PricePoint[];   // full daily series for support-level math
  fetchedAt:      string;
};

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchMacroTerminalData(): Promise<MacroTerminalData> {
  const [
    fedAssets, reverseRepo, tga, usM2, ecbAssets, bojAssets, usdPerEur, jpyPerUsd,
    spx, nasdaq, dow, marginDebt,
    hyOas, igOas, cccOas, cpRate, tbill3m, lendingStd, bankCredit, nfci,
    dxy, realYield10y, ust10y, ust30y, yieldCurve,
    vix, vxn, ovx, gvz,
    russell, move, gold,
    btcHistory, stablecoins,
  ] = await Promise.all([
    // Liquidity
    fredSeries('WALCL'),
    fredSeries('RRPONTSYD'),
    fredSeries('WTREGEN'),
    fredSeries('WM2NS'),
    fredSeries('ECBASSETSW'),
    fredSeries('JPNASSETS'),
    fredSeries('DEXUSEU'),
    fredSeries('DEXJPUS'),
    // Equities
    fredSeries('SP500', '2010-01-01'),   // FRED caps SP500 at 10 years
    fredSeries('NASDAQCOM'),
    fredSeries('DJIA', '2010-01-01'),
    fredSeries('BOGZ1FL663067003Q'),
    // Credit
    fredSeries('BAMLH0A0HYM2'),
    fredSeries('BAMLC0A0CM'),
    fredSeries('BAMLH0A3HYC'),
    fredSeries('DCPN3M'),
    fredSeries('DTB3'),
    fredSeries('DRTSCILM'),
    fredSeries('TOTBKCR'),
    fredSeries('NFCI'),
    // Dollar & rates
    fredSeries('DTWEXBGS'),
    fredSeries('DFII10'),
    fredSeries('DGS10'),
    fredSeries('DGS30'),
    fredSeries('T10Y2Y'),
    // Volatility
    fredSeries('VIXCLS'),
    fredSeries('VXNCLS'),
    fredSeries('OVXCLS'),
    fredSeries('GVZCLS'),
    // Yahoo
    yahooWeekly('^RUT'),
    yahooWeekly('^MOVE'),
    yahooWeekly('GC=F'),
    // Crypto
    fetchBTCDailyPrice('2012-01-01').catch(() => [] as PricePoint[]),
    fetchStablecoinHistory().catch(() => [] as StablecoinHistoryPoint[]),
  ]);

  return {
    fedAssets, reverseRepo, tga, usM2, ecbAssets, bojAssets, usdPerEur, jpyPerUsd,
    spx, nasdaq, dow, russell, marginDebt,
    hyOas, igOas, cccOas, cpRate, tbill3m, lendingStd, bankCredit, nfci,
    dxy, realYield10y, ust10y, ust30y, yieldCurve,
    vix, vxn, ovx, gvz, move,
    btc: btcHistory.map(p => ({ date: p.time, value: p.price })),
    gold,
    stablecoins,
    btcHistory,
    fetchedAt: new Date().toISOString(),
  };
}
