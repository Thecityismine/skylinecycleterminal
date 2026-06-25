import type { DxyDataPoint } from '@/lib/api/fred';

export type DxyRegime = 'strong' | 'weak' | 'neutral';

export type DxyWeeklyPoint = {
  date: string;
  dxy: number;
  ma50w: number | null;
  ma200w: number | null;
  btcPrice: number | null;
  regime: DxyRegime;
};

export type DxyZone = {
  start: string;
  end: string;
  regime: DxyRegime;
};

export type DxyCurrent = {
  dxy: number;
  ma50w: number | null;
  ma200w: number | null;
  change90d: number | null;
  trendRegime: DxyRegime;
  btcContext: 'headwind' | 'neutral' | 'tailwind';
  trendScore: number;
  rollingCorr: number | null;
};

export type DxyTrendResult = {
  chartData: DxyWeeklyPoint[];
  zones: DxyZone[];
  current: DxyCurrent;
};

export type MacroEvent = { date: string; label: string; description: string };

export const MACRO_EVENTS: MacroEvent[] = [
  { date: '1971-08-15', label: 'Bretton Woods', description: 'Nixon ends gold standard' },
  { date: '1985-09-22', label: 'Plaza Accord', description: 'G5 agreement to weaken USD' },
  { date: '1987-10-19', label: 'Black Monday', description: 'Stock market crash' },
  { date: '1997-07-01', label: 'Asian Crisis', description: 'Asian financial crisis' },
  { date: '1998-08-17', label: 'LTCM/Russia', description: 'Russian default and LTCM collapse' },
  { date: '2000-03-10', label: 'Dot-Com', description: 'Nasdaq peak / dot-com bust' },
  { date: '2008-09-15', label: 'GFC', description: 'Lehman / global financial crisis' },
  { date: '2020-03-20', label: 'COVID', description: 'COVID liquidity shock' },
  { date: '2022-01-01', label: 'Fed Tightening', description: 'Inflation surge / Fed rate hikes' },
];

export const REGIME_COLOR: Record<DxyRegime, string> = {
  strong:  '#F85149',   // red = headwind for BTC
  weak:    '#35D07F',   // green = tailwind for BTC
  neutral: '#EAB84D',  // amber
};

export const REGIME_FILL: Record<DxyRegime, string> = {
  strong:  'rgba(248,81,73,0.06)',
  weak:    'rgba(53,208,127,0.06)',
  neutral: 'rgba(230,180,80,0.04)',
};

export const REGIME_LABEL: Record<DxyRegime, string> = {
  strong:  'Strong Dollar',
  weak:    'Weak Dollar',
  neutral: 'Neutral',
};

export function computeDxyTrend(
  dxyData: DxyDataPoint[],
  btcPrices: { time: string; price: number }[],
): DxyTrendResult {
  // Sort ascending
  const sorted = [...dxyData].sort((a, b) => a.date.localeCompare(b.date));

  // Build BTC price lookup: date string -> price (nearest within 7 days)
  const btcMap = new Map<string, number>();
  for (const p of btcPrices) {
    btcMap.set(p.time, p.price);
  }

  // Helper: find nearest BTC price within ±7 days
  function nearestBtc(date: string): number | null {
    for (let offset = 0; offset <= 7; offset++) {
      const d = new Date(date + 'T00:00:00Z');
      for (const delta of [offset, -offset]) {
        if (delta === 0 && offset > 0) continue;
        const candidate = new Date(d.getTime() + delta * 86400000);
        const key = candidate.toISOString().slice(0, 10);
        if (btcMap.has(key)) return btcMap.get(key)!;
      }
    }
    return null;
  }

  // Compute SMAs
  function sma(values: number[], period: number, index: number): number | null {
    if (index < period - 1) return null;
    let sum = 0;
    for (let i = index - period + 1; i <= index; i++) sum += values[i];
    return sum / period;
  }

  const dxyValues = sorted.map(p => p.value);

  // Build chart data
  const chartData: DxyWeeklyPoint[] = sorted.map((p, i) => {
    const ma50w = sma(dxyValues, 50, i);
    const ma200w = sma(dxyValues, 200, i);
    let regime: DxyRegime = 'neutral';
    if (ma200w !== null) {
      regime = p.value > ma200w ? 'strong' : 'weak';
    }
    return {
      date: p.date,
      dxy: p.value,
      ma50w,
      ma200w,
      btcPrice: nearestBtc(p.date),
      regime,
    };
  });

  // Build regime zones
  const zones: DxyZone[] = [];
  if (chartData.length > 0) {
    let zoneStart = chartData[0].date;
    let zoneRegime = chartData[0].regime;
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].regime !== zoneRegime) {
        zones.push({ start: zoneStart, end: chartData[i - 1].date, regime: zoneRegime });
        zoneStart = chartData[i].date;
        zoneRegime = chartData[i].regime;
      }
    }
    zones.push({ start: zoneStart, end: chartData[chartData.length - 1].date, regime: zoneRegime });
  }

  // Current stats (last point)
  const last = chartData[chartData.length - 1];
  const idx13w = Math.max(0, chartData.length - 14); // ~13 weeks ago
  const dxy13wAgo = chartData[idx13w].dxy;
  const change90d = ((last.dxy / dxy13wAgo) - 1) * 100;

  // Trend score (0-100, higher = stronger dollar = more headwind for BTC)
  let score = 0;
  // Price vs 50W MA (30%)
  if (last.ma50w !== null) {
    const pct = ((last.dxy / last.ma50w) - 1) * 100;
    score += 0.30 * (pct > 2 ? 100 : pct > 0 ? 70 : pct > -2 ? 30 : 0);
  }
  // Price vs 200W MA (25%)
  if (last.ma200w !== null) {
    const pct = ((last.dxy / last.ma200w) - 1) * 100;
    score += 0.25 * (pct > 2 ? 100 : pct > 0 ? 70 : pct > -2 ? 30 : 0);
  }
  // 50W MA slope (20%) - compare current 50W to 8 weeks ago
  const idx8w = Math.max(0, chartData.length - 9);
  const prev50w = chartData[idx8w].ma50w;
  if (last.ma50w !== null && prev50w !== null) {
    const slope = ((last.ma50w / prev50w) - 1) * 100;
    score += 0.20 * (slope > 0.5 ? 100 : slope > 0 ? 60 : slope > -0.5 ? 30 : 0);
  }
  // 90D return (15%)
  score += 0.15 * (change90d > 3 ? 100 : change90d > 0 ? 60 : change90d > -3 ? 30 : 0);
  // DXY level vs 100 (10%)
  score += 0.10 * (last.dxy > 105 ? 100 : last.dxy > 100 ? 70 : last.dxy > 95 ? 40 : 0);

  // Rolling 26-week correlation between DXY weekly returns and BTC weekly returns
  const CORR_WINDOW = 26;
  let rollingCorr: number | null = null;
  const pairs: [number, number][] = [];
  for (let i = 1; i < chartData.length; i++) {
    const dxyRet = (chartData[i].dxy / chartData[i - 1].dxy) - 1;
    const btcCurr = chartData[i].btcPrice;
    const btcPrev = chartData[i - 1].btcPrice;
    if (btcCurr !== null && btcPrev !== null && btcPrev > 0) {
      const btcRet = (btcCurr / btcPrev) - 1;
      pairs.push([dxyRet, btcRet]);
    }
  }
  if (pairs.length >= CORR_WINDOW) {
    const recent = pairs.slice(-CORR_WINDOW);
    const xArr = recent.map(p => p[0]);
    const yArr = recent.map(p => p[1]);
    const xMean = xArr.reduce((a, b) => a + b, 0) / xArr.length;
    const yMean = yArr.reduce((a, b) => a + b, 0) / yArr.length;
    const num = xArr.reduce((s, x, i) => s + (x - xMean) * (yArr[i] - yMean), 0);
    const denX = Math.sqrt(xArr.reduce((s, x) => s + (x - xMean) ** 2, 0));
    const denY = Math.sqrt(yArr.reduce((s, y) => s + (y - yMean) ** 2, 0));
    rollingCorr = denX > 0 && denY > 0 ? num / (denX * denY) : null;
  }

  const trendRegime = last.regime;
  const btcContext = trendRegime === 'strong' ? 'headwind' : trendRegime === 'weak' ? 'tailwind' : 'neutral';

  return {
    chartData,
    zones,
    current: {
      dxy: last.dxy,
      ma50w: last.ma50w,
      ma200w: last.ma200w,
      change90d,
      trendRegime,
      btcContext,
      trendScore: Math.round(score),
      rollingCorr: rollingCorr !== null ? Math.round(rollingCorr * 100) / 100 : null,
    },
  };
}
