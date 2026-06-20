import { fetchDailyPrice, type PricePoint } from '@/lib/api/coinmetrics';

export type RatioKey = 'btc_ixic' | 'btc_spx' | 'eth_ixic' | 'btc_eth';

export type RatioPoint = {
  time:  string;
  ts:    number;
  value: number;
};

export type RatioSeries = {
  key:        RatioKey;
  label:      string;
  points:     RatioPoint[];
  current:    number | null;
  ath:        number | null;
  pctFromAth: number | null;
};

export type RotationSignal = {
  ethBtc:    number | null;  // ETH/BTC current ratio
  ma365:     number | null;  // 365-day MA of ETH/BTC
  deviation: number | null;  // % above/below MA
  pct4yr:    number | null;  // percentile rank in 4-year window
  signal:    'strong_eth' | 'favor_eth' | 'neutral' | 'favor_btc' | 'strong_btc';
  label:     string;
  color:     string;
  // Historical ETH/BTC for the rotation sparkline
  history:   { ts: number; ethBtc: number; ma365: number | null }[];
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
  crypto: PricePoint[],
  index:  FredPoint[],
  key:    RatioKey,
  label:  string,
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

  const weekly = points.filter((_, idx) => idx % 7 === 0 || idx === points.length - 1);

  const vals      = weekly.map((p) => p.value);
  const ath       = vals.length ? Math.max(...vals) : null;
  const cur       = weekly.at(-1)?.value ?? null;
  const pctFromAth = ath && cur ? ((cur - ath) / ath) * 100 : null;

  return { key, label, points: weekly, current: cur, ath, pctFromAth };
}

function buildBtcEthRatio(btc: PricePoint[], eth: PricePoint[]): RatioSeries {
  const btcMap = new Map(btc.map((d) => [d.time, d.price]));
  const ethMap = new Map(eth.map((d) => [d.time, d.price]));

  const dates = [...new Set([...btc.map((d) => d.time), ...eth.map((d) => d.time)])].sort();

  let lb: number | null = null;
  let le: number | null = null;
  const points: RatioPoint[] = [];

  for (const t of dates) {
    lb = btcMap.get(t) ?? lb;
    le = ethMap.get(t) ?? le;
    if (lb && le && lb > 0 && le > 0) {
      points.push({ time: t, ts: new Date(t + 'T00:00:00').getTime(), value: lb / le });
    }
  }

  const weekly = points.filter((_, idx) => idx % 7 === 0 || idx === points.length - 1);

  const vals      = weekly.map((p) => p.value);
  const ath       = vals.length ? Math.max(...vals) : null;
  const cur       = weekly.at(-1)?.value ?? null;
  const pctFromAth = ath && cur ? ((cur - ath) / ath) * 100 : null;

  return { key: 'btc_eth', label: 'BTC / ETH', points: weekly, current: cur, ath, pctFromAth };
}

function computeRotationSignal(btc: PricePoint[], eth: PricePoint[]): RotationSignal {
  const btcMap = new Map(btc.map((d) => [d.time, d.price]));
  const ethMap = new Map(eth.map((d) => [d.time, d.price]));
  const dates  = [...new Set([...btc.map((d) => d.time), ...eth.map((d) => d.time)])].sort();

  let lb: number | null = null;
  let le: number | null = null;

  const daily: { time: string; ts: number; ratio: number }[] = [];
  for (const t of dates) {
    lb = btcMap.get(t) ?? lb;
    le = ethMap.get(t) ?? le;
    if (lb && le && lb > 0 && le > 0) {
      daily.push({ time: t, ts: new Date(t + 'T00:00:00').getTime(), ratio: le / lb });
    }
  }

  if (!daily.length) {
    return { ethBtc: null, ma365: null, deviation: null, pct4yr: null,
             signal: 'neutral', label: 'No data', color: 'var(--sct-muted)', history: [] };
  }

  const current = daily.at(-1)!.ratio;

  // 365-day MA
  const w365   = daily.slice(-365);
  const ma365  = w365.reduce((s, d) => s + d.ratio, 0) / w365.length;

  // % deviation from MA
  const deviation = (current - ma365) / ma365;

  // 4-year percentile
  const w4yr   = daily.slice(-1461);
  const sorted = [...w4yr].sort((a, b) => a.ratio - b.ratio);
  const rank   = sorted.findIndex((d) => d.ratio >= current);
  const pct4yr = (rank / sorted.length) * 100;

  // Signal
  let signal: RotationSignal['signal'];
  let label: string;
  let color: string;

  if (deviation < -0.35) {
    signal = 'strong_eth'; label = 'Strong Rotate to ETH · Deep Value vs BTC'; color = '#3B82F6';
  } else if (deviation < -0.12) {
    signal = 'favor_eth';  label = 'Favor ETH · Below 365-Day MA';             color = '#35D07F';
  } else if (deviation < 0.12) {
    signal = 'neutral';    label = 'Neutral · Hold Current Mix';                color = 'var(--sct-muted)';
  } else if (deviation < 0.35) {
    signal = 'favor_btc';  label = 'Favor BTC · ETH Extended vs MA';           color = '#E6B450';
  } else {
    signal = 'strong_btc'; label = 'Rotate to BTC · ETH Well Above MA';        color = '#FF5C5C';
  }

  // Downsample history to weekly for the sparkline
  const rounder365 = daily.map((d, i) => {
    const window = daily.slice(Math.max(0, i - 364), i + 1);
    const ma     = window.reduce((s, x) => s + x.ratio, 0) / window.length;
    return { ts: d.ts, ethBtc: d.ratio, ma365: i >= 364 ? ma : null };
  }).filter((_, i) => i % 7 === 0 || i === daily.length - 1);

  return { ethBtc: current, ma365, deviation, pct4yr, signal, label, color, history: rounder365 };
}

export type RatioData = {
  btc_ixic:       RatioSeries;
  btc_spx:        RatioSeries;
  eth_ixic:       RatioSeries;
  btc_eth:        RatioSeries;
  rotationSignal: RotationSignal;
};

export async function fetchRatioData(): Promise<RatioData> {
  const [btc, eth, nasdaq, sp500] = await Promise.all([
    fetchDailyPrice('btc', '2015-01-01'),
    fetchDailyPrice('eth', '2015-01-01'),
    fredDaily('NASDAQCOM'),
    fredDaily('SP500'),
  ]);

  return {
    btc_ixic:       buildRatio(btc, nasdaq, 'btc_ixic', 'BTC / IXIC'),
    btc_spx:        buildRatio(btc, sp500,  'btc_spx',  'BTC / SPX'),
    eth_ixic:       buildRatio(eth, nasdaq, 'eth_ixic', 'ETH / IXIC'),
    btc_eth:        buildBtcEthRatio(btc, eth),
    rotationSignal: computeRotationSignal(btc, eth),
  };
}
