import type { PricePoint } from '@/lib/api/coinmetrics';
import type { MacroDataPoint, LiquiditySeriesData } from '@/lib/api/fred';
import type { StablecoinHistoryPoint } from '@/lib/api/defillama';

export type LiquidityRegime = 'strong' | 'improving' | 'restrictive' | 'tight';

export const REGIME_COLOR: Record<LiquidityRegime, string> = {
  strong:      '#35D07F',
  improving:   '#EAB84D',
  restrictive: '#F97316',
  tight:       '#F85149',
};

export const REGIME_FILL: Record<LiquidityRegime, string> = {
  strong:      'rgba(53,208,127,0.09)',
  improving:   'rgba(234,184,77,0.07)',
  restrictive: 'rgba(249,115,22,0.07)',
  tight:       'rgba(248,81,73,0.09)',
};

export const REGIME_LABEL: Record<LiquidityRegime, string> = {
  strong:      'Strong Liquidity Expansion',
  improving:   'Improving Liquidity',
  restrictive: 'Restrictive / Mixed',
  tight:       'Tight Liquidity / Risk-Off',
};

export type LiquidityChartRow = {
  date:            string;
  price:           number;
  ma100w:          number | null;
  ma200w:          number | null;
  score:           number;
  regime:          LiquidityRegime;
  globalLiqScore:  number;
  dxyScore:        number;
  realYieldScore:  number;
  m2Score:         number;
  stablecoinScore: number;
  btcTrendScore:   number;
};

export type LiquidityRegimeZone = {
  start:  string;
  end:    string;
  regime: LiquidityRegime;
};

export type LiquidityCurrentStats = {
  score:              number;
  regime:             LiquidityRegime;
  btcTrendScore:      number;
  fedBalanceYoY:      number | null;
  dxyChange90d:       number | null;
  realYieldChange90d: number | null;
  m2YoY:             number | null;
  stablecoin30d:     number | null;
  globalLiqScore:    number;
  dxyScore:          number;
  realYieldScore:    number;
  m2Score:           number;
  stablecoinScore:   number;
  liquidityAxis:     number;
  btcTrendAxis:      number;
  quadrant:          'expansion' | 'recovery' | 'transition' | 'defensive';
  riskPosture:       string;
  price:             number;
  ma100w:            number | null;
  ma200w:            number | null;
};

export type LiquidityRegimeResult = {
  chartData: LiquidityChartRow[];
  zones:     LiquidityRegimeZone[];
  current:   LiquidityCurrentStats;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

function buildForwardFillMap(series: MacroDataPoint[], allDates: string[]): Map<string, number> {
  const raw = new Map(series.map(d => [d.date, d.value]));
  const out = new Map<string, number>();
  let last: number | null = null;
  for (const d of allDates) {
    if (raw.has(d)) last = raw.get(d)!;
    if (last != null) out.set(d, last);
  }
  return out;
}

function buildDailyMap(series: MacroDataPoint[]): Map<string, number> {
  return new Map(series.map(d => [d.date, d.value]));
}

function lookupNear(map: Map<string, number>, date: string, maxOffset = 5): number | null {
  if (map.has(date)) return map.get(date)!;
  const base = new Date(date + 'T00:00:00Z');
  for (let i = 1; i <= maxOffset; i++) {
    for (const sign of [1, -1]) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + sign * i);
      const key = d.toISOString().slice(0, 10);
      if (map.has(key)) return map.get(key)!;
    }
  }
  return null;
}

function dateMinus(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// ── Scoring functions ─────────────────────────────────────────────────────────

function scoreGlobalLiq(fedToday: number | null, fedYearAgo: number | null): number {
  if (fedToday == null || fedYearAgo == null || fedYearAgo === 0) return 50;
  const yoy = ((fedToday - fedYearAgo) / fedYearAgo) * 100;
  return clamp(((yoy + 15) / 30) * 100, 0, 100);
}

function scoreDXY(dxyToday: number | null, dxy90dAgo: number | null): number {
  if (dxyToday == null || dxy90dAgo == null || dxy90dAgo === 0) return 50;
  const change = ((dxyToday - dxy90dAgo) / dxy90dAgo) * 100;
  return clamp(((-change + 5) / 10) * 100, 0, 100);
}

function scoreRealYield(ryToday: number | null, ry90dAgo: number | null): number {
  if (ryToday == null || ry90dAgo == null) return 50;
  const change = ryToday - ry90dAgo;
  return clamp(((-change + 1.0) / 2.0) * 100, 0, 100);
}

function scoreM2(m2Today: number | null, m2YearAgo: number | null): number {
  if (m2Today == null || m2YearAgo == null || m2YearAgo === 0) return 50;
  const yoy = ((m2Today - m2YearAgo) / m2YearAgo) * 100;
  return clamp(((yoy + 2) / 10) * 100, 0, 100);
}

function scoreStablecoin(today: number | null, ago30: number | null): number {
  if (today == null || ago30 == null || ago30 === 0) return 50;
  const growth = ((today - ago30) / ago30) * 100;
  return clamp(((growth + 5) / 10) * 100, 0, 100);
}

function scoreBtcTrend(price: number, ma100w: number | null, ma200w: number | null): number {
  return (ma100w != null && price > ma100w ? 50 : 0) +
         (ma200w != null && price > ma200w ? 50 : 0);
}

function composite(g: number, d: number, r: number, m: number, s: number, b: number): number {
  return g * 0.30 + d * 0.20 + r * 0.20 + m * 0.15 + s * 0.10 + b * 0.05;
}

function regimeFromScore(score: number): LiquidityRegime {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'improving';
  if (score >= 25) return 'restrictive';
  return 'tight';
}

function riskPostureText(score: number, btcTrendScore: number): string {
  const btcStrong = btcTrendScore >= 50;
  if (score >= 70 && btcStrong) return 'Favor spot exposure, reduce cash weight gradually';
  if (score >= 55 && btcStrong) return 'Selective long exposure with defined risk management';
  if (score >= 50 && !btcStrong) return 'Neutral — await trend confirmation before increasing exposure';
  if (score >= 35 && btcStrong) return 'Liquidity headwinds may limit upside; size positions carefully';
  if (score < 30 && !btcStrong) return 'Preserve capital, avoid leverage, wait for macro clarity';
  return 'Mixed signals — reduce position size, hold core only';
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computeLiquidityRegime(
  prices:         PricePoint[],
  fredData:       LiquiditySeriesData,
  stablecoinHist: StablecoinHistoryPoint[],
): LiquidityRegimeResult {
  const closes    = prices.map(p => p.price);
  const ma100wArr = sma(closes, 700);
  const ma200wArr = sma(closes, 1400);
  const allDates  = prices.map(p => p.time);

  const dxyMap    = buildDailyMap(fredData.dxy);
  const ryMap     = buildDailyMap(fredData.realYield);
  const m2Map     = buildForwardFillMap(fredData.m2,         allDates);
  const fedMap    = buildForwardFillMap(fredData.fedBalance, allDates);
  const stableMap = new Map(stablecoinHist.map(p => [p.time, p.stablecoinMC]));

  const START_DISPLAY = '2019-01-01';
  const chartData: LiquidityChartRow[] = [];

  for (let i = 0; i < prices.length; i++) {
    const date  = prices[i].time;
    const price = prices[i].price;
    if (date < START_DISPLAY) continue;

    const ma100w = ma100wArr[i];
    const ma200w = ma200wArr[i];

    const dxyToday     = lookupNear(dxyMap, date);
    const dxy90dAgo    = lookupNear(dxyMap, dateMinus(date, 90));
    const ryToday      = lookupNear(ryMap, date);
    const ry90dAgo     = lookupNear(ryMap, dateMinus(date, 90));
    const m2Today      = m2Map.get(date) ?? null;
    const m2YearAgo    = m2Map.get(dateMinus(date, 365)) ?? null;
    const fedToday     = fedMap.get(date) ?? null;
    const fedYearAgo   = fedMap.get(dateMinus(date, 365)) ?? null;
    const stableToday  = stableMap.get(date) ?? null;
    const stable30dAgo = stableMap.get(dateMinus(date, 30)) ?? null;

    const globalLiqScore  = scoreGlobalLiq(fedToday, fedYearAgo);
    const dxyScore        = scoreDXY(dxyToday, dxy90dAgo);
    const realYieldScore  = scoreRealYield(ryToday, ry90dAgo);
    const m2Score         = scoreM2(m2Today, m2YearAgo);
    const stablecoinScore = scoreStablecoin(stableToday, stable30dAgo);
    const btcTrendScore   = scoreBtcTrend(price, ma100w, ma200w);

    const score  = composite(globalLiqScore, dxyScore, realYieldScore, m2Score, stablecoinScore, btcTrendScore);
    const regime = regimeFromScore(score);

    chartData.push({
      date, price, ma100w, ma200w,
      score: Math.round(score * 10) / 10,
      regime, globalLiqScore, dxyScore, realYieldScore, m2Score, stablecoinScore, btcTrendScore,
    });
  }

  // Build regime zones
  const zones: LiquidityRegimeZone[] = [];
  let cur: LiquidityRegimeZone | null = null;
  for (const row of chartData) {
    if (!cur || cur.regime !== row.regime) {
      if (cur) zones.push(cur);
      cur = { start: row.date, end: row.date, regime: row.regime };
    } else {
      cur.end = row.date;
    }
  }
  if (cur) zones.push(cur);

  // Current stats from last row
  const last     = chartData[chartData.length - 1];
  const lastDate = prices[prices.length - 1].time;

  const dxyToday     = lookupNear(dxyMap, lastDate);
  const dxy90dAgo    = lookupNear(dxyMap, dateMinus(lastDate, 90));
  const ryToday      = lookupNear(ryMap, lastDate);
  const ry90dAgo     = lookupNear(ryMap, dateMinus(lastDate, 90));
  const m2Today      = m2Map.get(lastDate) ?? null;
  const m2YearAgo    = m2Map.get(dateMinus(lastDate, 365)) ?? null;
  const fedToday     = fedMap.get(lastDate) ?? null;
  const fedYearAgo   = fedMap.get(dateMinus(lastDate, 365)) ?? null;
  const stableToday  = stableMap.get(lastDate) ?? null;
  const stable30dAgo = stableMap.get(dateMinus(lastDate, 30)) ?? null;

  const fedBalanceYoY = (fedToday != null && fedYearAgo && fedYearAgo > 0)
    ? ((fedToday - fedYearAgo) / fedYearAgo) * 100 : null;
  const dxyChange90d = (dxyToday != null && dxy90dAgo && dxy90dAgo > 0)
    ? ((dxyToday - dxy90dAgo) / dxy90dAgo) * 100 : null;
  const realYieldChange90d = (ryToday != null && ry90dAgo != null)
    ? ryToday - ry90dAgo : null;
  const m2YoY = (m2Today && m2YearAgo && m2YearAgo > 0)
    ? ((m2Today - m2YearAgo) / m2YearAgo) * 100 : null;
  const stablecoin30d = (stableToday && stable30dAgo && stable30dAgo > 0)
    ? ((stableToday - stable30dAgo) / stable30dAgo) * 100 : null;

  const btcTrendScore = last.btcTrendScore;
  const score = last.score;
  const quadrant: LiquidityCurrentStats['quadrant'] =
    score >= 50 && btcTrendScore >= 50 ? 'expansion'
    : score >= 50 && btcTrendScore < 50  ? 'recovery'
    : score <  50 && btcTrendScore >= 50 ? 'transition'
    : 'defensive';

  return {
    chartData,
    zones,
    current: {
      score, regime: last.regime, btcTrendScore,
      fedBalanceYoY, dxyChange90d, realYieldChange90d, m2YoY, stablecoin30d,
      globalLiqScore: last.globalLiqScore, dxyScore: last.dxyScore,
      realYieldScore: last.realYieldScore, m2Score: last.m2Score,
      stablecoinScore: last.stablecoinScore,
      liquidityAxis: score, btcTrendAxis: btcTrendScore,
      quadrant, riskPosture: riskPostureText(score, btcTrendScore),
      price: last.price, ma100w: last.ma100w, ma200w: last.ma200w,
    },
  };
}
