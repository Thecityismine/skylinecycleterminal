import { fetchBTCDailyPrice, type PricePoint } from '@/lib/api/coinmetrics';

type SimplePt = { time: string; value: number };

async function fredSeries(seriesId: string): Promise<SimplePt[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) return [];
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${key}&file_type=json` +
    `&sort_order=desc&limit=5000`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.observations as Array<{ date: string; value: string }>)
      .filter((o) => o.value !== '.' && o.value !== '')
      .map((o) => ({ time: o.date, value: Number(o.value) }))
      .reverse();
  } catch {
    return [];
  }
}

// Yahoo Finance chart API â€” no key required, used as primary source for Gold
// which is unreliable on FRED (GOLDAMGBD228NLBM returns empty intermittently)
async function yahooSeries(symbol: string): Promise<SimplePt[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1wk&range=max`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SkylineTerminal/1.0)' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[]          = result.timestamp ?? [];
    const closes: (number | null)[]     = result.indicators?.quote?.[0]?.close ?? [];

    const out: SimplePt[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null || close <= 0) continue;
      out.push({
        time:  new Date(timestamps[i] * 1000).toISOString().slice(0, 10),
        value: close,
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function goldSeries(): Promise<SimplePt[]> {
  // Primary: Yahoo Finance gold futures (GC=F) â€” reliable, no key needed
  const yahoo = await yahooSeries('GC=F');
  if (yahoo.length > 50) return yahoo;
  // Fallback: FRED London PM gold fixing
  return fredSeries('GOLDPMGBD228NLBM');
}

export type CrossAssetPoint = {
  time:   string;
  ts:     number;
  btc:    number | null;
  gold:   number | null;
  sp500:  number | null;
  nasdaq: number | null;
  dxy:    number | null;
};

export type CrossAssetLatest = {
  btc:    number | null;
  gold:   number | null;
  sp500:  number | null;
  nasdaq: number | null;
  dxy:    number | null;
};

export async function fetchCrossAssetData(): Promise<{
  points:     CrossAssetPoint[];
  latest:     CrossAssetLatest;
  btcHistory: PricePoint[];
}> {
  const [btcRaw, goldRaw, sp500Raw, nasdaqRaw, dxyRaw] = await Promise.all([
    fetchBTCDailyPrice('2012-01-01'),
    goldSeries(),                     // Yahoo Finance GC=F (gold futures) w/ FRED fallback
    fredSeries('SP500'),              // S&P 500 daily close
    fredSeries('NASDAQCOM'),          // Nasdaq Composite daily
    fredSeries('DTWEXBGS'),           // Trade Weighted USD Index (broad)
  ]);

  const dateSet = new Set<string>();
  for (const d of btcRaw)    dateSet.add(d.time);
  for (const d of goldRaw)   dateSet.add(d.time);
  for (const d of sp500Raw)  dateSet.add(d.time);
  for (const d of nasdaqRaw) dateSet.add(d.time);
  for (const d of dxyRaw)    dateSet.add(d.time);

  const dates = [...dateSet].sort();

  const mapBtc    = new Map(btcRaw.map((d) => [d.time, d.price]));
  const mapGold   = new Map(goldRaw.map((d) => [d.time, d.value]));
  const mapSp500  = new Map(sp500Raw.map((d) => [d.time, d.value]));
  const mapNasdaq = new Map(nasdaqRaw.map((d) => [d.time, d.value]));
  const mapDxy    = new Map(dxyRaw.map((d) => [d.time, d.value]));

  let lBtc:    number | null = null;
  let lGold:   number | null = null;
  let lSp500:  number | null = null;
  let lNasdaq: number | null = null;
  let lDxy:    number | null = null;

  const allPoints: CrossAssetPoint[] = dates.map((time) => {
    lBtc    = mapBtc.get(time)    ?? lBtc;
    lGold   = mapGold.get(time)   ?? lGold;
    lSp500  = mapSp500.get(time)  ?? lSp500;
    lNasdaq = mapNasdaq.get(time) ?? lNasdaq;
    lDxy    = mapDxy.get(time)    ?? lDxy;
    return {
      time,
      ts:     new Date(time + 'T00:00:00').getTime(),
      btc:    lBtc,
      gold:   lGold,
      sp500:  lSp500,
      nasdaq: lNasdaq,
      dxy:    lDxy,
    };
  });

  // Downsample to weekly for chart performance (~4000+ â†’ ~600 rows)
  const points = allPoints.filter((_, i) => i % 7 === 0 || i === allPoints.length - 1);

  return {
    points,
    latest: { btc: lBtc, gold: lGold, sp500: lSp500, nasdaq: lNasdaq, dxy: lDxy },
    btcHistory: btcRaw,
  };
}
