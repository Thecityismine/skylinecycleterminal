import { fetchDailyPrice, type PricePoint } from '@/lib/api/coinmetrics';

export type RatioKey = 'btc_ixic' | 'btc_spx' | 'eth_ixic';

export type RatioPoint = {
  time:  string;
  ts:    number;
  value: number;
};

export type RatioSeries = {
  key:     RatioKey;
  label:   string;
  points:  RatioPoint[];
  current: number | null;
  ath:     number | null;
  pctFromAth: number | null;
};

type FredPoint = { time: string; price: number };

async function fredDaily(seriesId: string): Promise<FredPoint[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) return [];
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}&api_key=${key}&file_type=json` +
    `&sort_order=asc&limit=10000`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.observations as Array<{ date: string; value: string }>)
      .filter((o) => o.value !== '.' && o.value !== '')
      .map((o)   => ({ time: o.date, price: Number(o.value) }));
  } catch {
    return [];
  }
}

function buildRatio(
  crypto:  PricePoint[],
  index:   FredPoint[],
  key:     RatioKey,
  label:   string,
): RatioSeries {
  const idxMap = new Map(index.map((d) => [d.time, d.price]));

  // Forward-fill index (equities don't trade weekends)
  let lastIdx: number | null = null;
  const dateSet = [...new Set([...crypto.map((d) => d.time), ...index.map((d) => d.time)])].sort();
  const filledIdx = new Map<string, number>();
  for (const t of dateSet) {
    const v = idxMap.get(t);
    if (v != null) lastIdx = v;
    if (lastIdx != null) filledIdx.set(t, lastIdx);
  }

  const cryptoMap = new Map(crypto.map((d) => [d.time, d.price]));

  const points: RatioPoint[] = [];
  for (const t of dateSet) {
    const c = cryptoMap.get(t);
    const i = filledIdx.get(t);
    if (c == null || i == null || i === 0 || c === 0) continue;
    points.push({ time: t, ts: new Date(t + 'T00:00:00').getTime(), value: c / i });
  }

  // Weekly downsample
  const weekly = points.filter((_, idx) => idx % 7 === 0 || idx === points.length - 1);

  const vals   = weekly.map((p) => p.value);
  const ath    = vals.length ? Math.max(...vals) : null;
  const cur    = weekly.at(-1)?.value ?? null;
  const pctFromAth = ath && cur ? ((cur - ath) / ath) * 100 : null;

  return { key, label, points: weekly, current: cur, ath, pctFromAth };
}

export type RatioData = {
  btc_ixic: RatioSeries;
  btc_spx:  RatioSeries;
  eth_ixic: RatioSeries;
};

export async function fetchRatioData(): Promise<RatioData> {
  const [btc, eth, nasdaq, sp500] = await Promise.all([
    fetchDailyPrice('btc', '2014-01-01'),
    fetchDailyPrice('eth', '2015-01-01'),
    fredDaily('NASDAQCOM'),
    fredDaily('SP500'),
  ]);

  return {
    btc_ixic: buildRatio(btc, nasdaq, 'btc_ixic', 'BTC / IXIC'),
    btc_spx:  buildRatio(btc, sp500,  'btc_spx',  'BTC / SPX'),
    eth_ixic: buildRatio(eth, nasdaq, 'eth_ixic', 'ETH / IXIC'),
  };
}
