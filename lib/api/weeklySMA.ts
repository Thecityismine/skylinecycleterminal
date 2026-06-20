import { fetchDailyPrice } from '@/lib/api/coinmetrics';

export type Zone = 'bull' | 'bear' | 'cheap' | 'none';

export type WeeklyPoint = {
  time:   string;
  ts:     number;
  price:  number;
  ma50w:  number | null;
  ma200w: number | null;
  zone:   Zone;
};

export type ZoneSegment = {
  zone: Zone;
  x1:   number;
  x2:   number;
};

export type WeeklySMAResult = {
  points:   WeeklyPoint[];
  segments: ZoneSegment[];
  current: {
    price:  number | null;
    ma50w:  number | null;
    ma200w: number | null;
    zone:   Zone;
  };
};

export type WeeklySMAData = {
  btc: WeeklySMAResult;
  eth: WeeklySMAResult;
};

// Collapse daily closes into weekly (ISO week — last trading day of each week)
function toWeekly(daily: { time: string; price: number }[]): { time: string; price: number }[] {
  const byWeek = new Map<string, { time: string; price: number }>();
  for (const p of daily) {
    if (p.price <= 0) continue;
    const d   = new Date(p.time + 'T00:00:00Z');
    // ISO week key: Sunday-based week (year + week offset)
    const day = d.getUTCDay(); // 0=Sun
    const mon = new Date(d);
    mon.setUTCDate(d.getUTCDate() - ((day + 6) % 7)); // roll back to Monday
    const key = mon.toISOString().slice(0, 10);
    byWeek.set(key, p); // last record of the week wins (Friday close)
  }
  return [...byWeek.values()].sort((a, b) => a.time.localeCompare(b.time));
}

function sma(prices: number[], i: number, window: number): number | null {
  if (i < window - 1) return null;
  let sum = 0;
  for (let j = i - window + 1; j <= i; j++) sum += prices[j];
  return sum / window;
}

function getZone(price: number, ma50w: number | null, ma200w: number | null): Zone {
  if (ma50w == null) return 'none';
  if (price >= ma50w) return 'bull';
  if (ma200w != null && price < ma200w) return 'cheap';
  return 'bear';
}

function computeSegments(points: WeeklyPoint[]): ZoneSegment[] {
  if (!points.length) return [];
  const segs: ZoneSegment[] = [];
  let cur: ZoneSegment = { zone: points[0].zone, x1: points[0].ts, x2: points[0].ts };
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.zone === cur.zone) {
      cur.x2 = p.ts;
    } else {
      segs.push(cur);
      cur = { zone: p.zone, x1: p.ts, x2: p.ts };
    }
  }
  segs.push(cur);
  return segs;
}

function processAsset(daily: { time: string; price: number }[]): WeeklySMAResult {
  const weekly = toWeekly(daily);
  const prices = weekly.map((p) => p.price);

  const points: WeeklyPoint[] = weekly.map((p, i) => {
    const ma50w  = sma(prices, i, 50);
    const ma200w = sma(prices, i, 200);
    const zone   = getZone(p.price, ma50w, ma200w);
    return {
      time:  p.time,
      ts:    new Date(p.time + 'T00:00:00Z').getTime(),
      price: p.price,
      ma50w,
      ma200w,
      zone,
    };
  });

  const last   = [...points].reverse().find((p) => p.ma50w != null) ?? points.at(-1)!;
  const segments = computeSegments(points);

  return {
    points,
    segments,
    current: {
      price:  last?.price  ?? null,
      ma50w:  last?.ma50w  ?? null,
      ma200w: last?.ma200w ?? null,
      zone:   last?.zone   ?? 'none',
    },
  };
}

export async function fetchWeeklySMAData(): Promise<WeeklySMAData> {
  const [btcDaily, ethDaily] = await Promise.all([
    fetchDailyPrice('btc', '2011-01-01'),
    fetchDailyPrice('eth', '2015-01-01'),
  ]);

  return {
    btc: processAsset(btcDaily),
    eth: processAsset(ethDaily),
  };
}

export const ZONE_FILL: Record<Zone, string> = {
  bull:  'rgba(22,163,74,0.18)',
  bear:  'rgba(185,28,28,0.22)',
  cheap: 'rgba(37,99,235,0.25)',
  none:  'transparent',
};

export const ZONE_LABEL: Record<Zone, string> = {
  bull:  'Bull Market',
  bear:  'Bear Market',
  cheap: 'Accumulation Zone',
  none:  'Insufficient Data',
};

export const ZONE_COLOR: Record<Zone, string> = {
  bull:  '#22C55E',
  bear:  '#EF4444',
  cheap: '#3B82F6',
  none:  'var(--sct-muted)',
};
