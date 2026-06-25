import { fetchDailyPrice } from '@/lib/api/coinmetrics';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type BtcM2Point = {
  time:   string;
  ts:     number;
  ratio:  number;         // (BTC price / M2_billions) Ã— 1000  â‰ˆ BTC / M2_trillions
  ema200: number | null;
  ema400: number | null;
  sma52:  number | null;
};

export type BtcM2Result = {
  points:  BtcM2Point[];
  current: {
    ratio:  number | null;
    ema200: number | null;
    ema400: number | null;
    sma52:  number | null;
  };
};

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function emaCalc(values: number[], period: number): (number | null)[] {
  const k   = 2 / (period + 1);
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = e;
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

function smaCalc(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function toWeekly(daily: { time: string; price: number }[]) {
  const byWeek: Record<string, number[]> = {};
  for (const p of daily) {
    if (p.price <= 0) continue;
    const d      = new Date(p.time + 'T00:00:00Z');
    const day    = d.getUTCDay();
    const offset = day === 0 ? 6 : day - 1;
    d.setUTCDate(d.getUTCDate() - offset);
    const key    = d.toISOString().slice(0, 10);
    (byWeek[key] ??= []).push(p.price);
  }
  return Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, prices]) => ({ time, price: prices[prices.length - 1] }));
}

async function fetchM2History(startYear = 2012): Promise<{ date: string; value: number }[]> {
  const key = process.env.FRED_API_KEY?.trim();
  if (!key) throw new Error('FRED_API_KEY not set');
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=M2SL&api_key=${key}&file_type=json` +
    `&sort_order=asc&observation_start=${startYear}-01-01`;
  const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`FRED M2SL HTTP ${res.status}`);
  const json = await res.json();
  return (json.observations as Array<{ date: string; value: string }>)
    .filter(o => o.value !== '.' && o.value !== '')
    .map(o => ({ date: o.date, value: Number(o.value) }));
}

function alignM2(weekly: { time: string }[], m2: { date: string; value: number }[]): (number | null)[] {
  const m2Map = new Map(m2.map(d => [d.date.slice(0, 7), d.value]));
  return weekly.map(w => {
    const ym = w.time.slice(0, 7);
    for (let offset = 0; offset <= 3; offset++) {
      const d = new Date(ym + '-01T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth() - offset);
      const key = d.toISOString().slice(0, 7);
      if (m2Map.has(key)) return m2Map.get(key)!;
    }
    return null;
  });
}

// â”€â”€ Main export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function computeBtcM2(maxPoints = 600): Promise<BtcM2Result> {
  const [daily, m2Raw] = await Promise.all([
    fetchDailyPrice('btc', '2012-01-01'),
    fetchM2History(2012),
  ]);

  const weekly = toWeekly(daily);
  const m2Week = alignM2(weekly, m2Raw);

  const ratios: number[]        = [];
  const validWeeks: typeof weekly = [];
  for (let i = 0; i < weekly.length; i++) {
    const m2 = m2Week[i];
    if (m2 == null || m2 <= 0) continue;
    ratios.push((weekly[i].price / m2) * 1000);
    validWeeks.push(weekly[i]);
  }

  const ema200 = emaCalc(ratios, 200);
  const ema400 = emaCalc(ratios, 400);
  const sma52  = smaCalc(ratios, 52);

  const step = ratios.length > maxPoints ? Math.floor(ratios.length / maxPoints) : 1;
  const points: BtcM2Point[] = validWeeks
    .map((w, i) => ({
      time:   w.time,
      ts:     new Date(w.time + 'T00:00:00Z').getTime(),
      ratio:  ratios[i],
      ema200: ema200[i],
      ema400: ema400[i],
      sma52:  sma52[i],
    }))
    .filter((_, i) => i % step === 0 || i === validWeeks.length - 1);

  const last = points[points.length - 1];
  return {
    points,
    current: {
      ratio:  last?.ratio  ?? null,
      ema200: last?.ema200 ?? null,
      ema400: last?.ema400 ?? null,
      sma52:  last?.sma52  ?? null,
    },
  };
}
