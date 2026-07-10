import type { PricePoint } from '@/lib/api/coinmetrics';
import type { MacroDataPoint, LiquiditySeriesData } from '@/lib/api/fred';
import type { StablecoinHistoryPoint } from '@/lib/api/defillama';

// ── Types ─────────────────────────────────────────────────────────────────────

export type GliPoint = { time: string; value: number };

export type BTCGliRow = {
  time:           string;
  ts:             number;
  btcClose:       number;
  gliRaw:         number | null;
  gliShifted:     number | null;
  gliMomentum20d: number | null;
};

export type GLITurningPoint = {
  time:        string;   // original (unshifted) GLI date
  shiftedTime: string;   // date it appears on the BTC timeline (time + lag)
  type:        'top' | 'bottom';
  gliValue:    number;
};

export type LagCorrelationResult = {
  lagDays:     number;
  correlation: number | null;
  sampleSize:  number;
};

export type LiquiditySignal = 'tailwind' | 'headwind' | 'divergence' | 'breakdown' | 'neutral';

export const SIGNAL_COLOR: Record<LiquiditySignal, string> = {
  tailwind:   '#35D07F',
  headwind:   '#F85149',
  divergence: '#E6B450',
  breakdown:  '#8B949E',
  neutral:    '#5B84FF',
};

export const SIGNAL_LABEL: Record<LiquiditySignal, string> = {
  tailwind:   'Liquidity Tailwind',
  headwind:   'Liquidity Headwind',
  divergence: 'Liquidity Divergence',
  breakdown:  'Relationship Breakdown',
  neutral:    'Neutral / Mixed',
};

export type GLICurrentStats = {
  btcPrice:       number;
  gli:            number | null;
  gliTrend:       'rising' | 'falling' | 'flat';
  lagDays:        number;
  correlation90d: number | null;
  signal:         LiquiditySignal;
  confidence:     'High' | 'Moderate' | 'Low';
  btcAboveTrend:  boolean;
};

export type GLILagResult = {
  rows:          BTCGliRow[];
  turningPoints: GLITurningPoint[];
  lagTests:      LagCorrelationResult[];
  current:       GLICurrentStats;
  macroRead:     string;
};

export const LAG_PRESETS = [30, 45, 60, 75, 90] as const;
const CANDIDATE_LAGS = [0, 15, 30, 45, 60, 75, 90, 120];
const RETURN_PERIOD = 30;

// ── Date helpers ──────────────────────────────────────────────────────────────

function dateOffset(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
  for (let i = 1; i <= maxOffset; i++) {
    for (const sign of [1, -1]) {
      const key = dateOffset(date, sign * i);
      if (map.has(key)) return map.get(key)!;
    }
  }
  return null;
}

// ── Stats helpers ─────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function zScoreSeries(values: (number | null)[]): (number | null)[] {
  const valid = values.filter((v): v is number => v != null);
  if (valid.length < 2) return values.map(() => null);
  const m = mean(valid);
  const variance = mean(valid.map(v => (v - m) ** 2));
  const std = Math.sqrt(variance) || 1;
  return values.map(v => (v == null ? null : (v - m) / std));
}

function minMaxScale(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map(v => ((v - min) / range) * 100);
}

function pctChange(today: number | null, prior: number | null): number | null {
  if (today == null || prior == null || prior === 0) return null;
  return ((today - prior) / Math.abs(prior)) * 100;
}

function pearson(a: number[], b: number[]): number | null {
  const n = a.length;
  if (n < 10) return null;
  const ma = mean(a), mb = mean(b);
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    cov += da * db; va += da * da; vb += db * db;
  }
  const denom = Math.sqrt(va * vb);
  return denom === 0 ? null : cov / denom;
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

// ── Skyline GLI composite ─────────────────────────────────────────────────────

// Skyline GLI is built on liquidity *growth momentum* (YoY / 90d / 30d change),
// not raw levels — raw M2/Fed balance levels trend secularly upward and would
// swamp the index with a one-way drift, leaving nothing to lag/lead against.
export function computeSkylineGLI(
  fredData:       LiquiditySeriesData,
  stablecoinHist: StablecoinHistoryPoint[],
  allDates:       string[],
): GliPoint[] {
  const dxyMap    = buildDailyMap(fredData.dxy);
  const ryMap     = buildDailyMap(fredData.realYield);
  const m2Map     = buildForwardFillMap(fredData.m2, allDates);
  const fedMap    = buildForwardFillMap(fredData.fedBalance, allDates);
  const stableMap = new Map(stablecoinHist.map(p => [p.time, p.stablecoinMC]));

  const m2Growth:     (number | null)[] = [];
  const fedGrowth:    (number | null)[] = [];
  const dxyGrowthInv: (number | null)[] = [];
  const ryChangeInv:  (number | null)[] = [];
  const stableGrowth: (number | null)[] = [];

  for (const date of allDates) {
    m2Growth.push(pctChange(m2Map.get(date) ?? null, m2Map.get(dateOffset(date, -365)) ?? null));
    fedGrowth.push(pctChange(fedMap.get(date) ?? null, fedMap.get(dateOffset(date, -365)) ?? null));

    const dxyChg = pctChange(lookupNear(dxyMap, date), lookupNear(dxyMap, dateOffset(date, -90)));
    dxyGrowthInv.push(dxyChg == null ? null : -dxyChg);

    const ryToday = lookupNear(ryMap, date);
    const ryAgo   = lookupNear(ryMap, dateOffset(date, -90));
    ryChangeInv.push(ryToday == null || ryAgo == null ? null : -(ryToday - ryAgo));

    stableGrowth.push(pctChange(stableMap.get(date) ?? null, stableMap.get(dateOffset(date, -30)) ?? null));
  }

  const zM2  = zScoreSeries(m2Growth);
  const zFed = zScoreSeries(fedGrowth);
  const zDxy = zScoreSeries(dxyGrowthInv);
  const zRy  = zScoreSeries(ryChangeInv);
  const zSt  = zScoreSeries(stableGrowth);

  const composite: (number | null)[] = allDates.map((_, i) => {
    const parts: [number | null, number][] = [
      [zM2[i], 0.30], [zFed[i], 0.20], [zDxy[i], 0.20], [zRy[i], 0.15], [zSt[i], 0.15],
    ];
    if (parts.some(([v]) => v == null)) return null;
    return parts.reduce((sum, [v, w]) => sum + v! * w, 0);
  });

  const validIdx = composite.reduce<number[]>((acc, v, i) => { if (v != null) acc.push(i); return acc; }, []);
  if (validIdx.length === 0) return [];

  const scaled = minMaxScale(validIdx.map(i => composite[i]!));
  return validIdx.map((i, k) => ({ time: allDates[i], value: +scaled[k].toFixed(2) }));
}

// ── Lag shift + merge ─────────────────────────────────────────────────────────

export function buildLagRows(btcPrices: PricePoint[], gliRaw: GliPoint[], lagDays: number): BTCGliRow[] {
  const gliMap = new Map(gliRaw.map(p => [p.time, p.value]));

  const rows: BTCGliRow[] = btcPrices.map(p => ({
    time:           p.time,
    ts:             new Date(p.time + 'T00:00:00Z').getTime(),
    btcClose:       p.price,
    gliRaw:         gliMap.get(p.time) ?? null,
    gliShifted:     lookupNear(gliMap, dateOffset(p.time, -lagDays), 3),
    gliMomentum20d: null,
  }));

  for (let i = 0; i < rows.length; i++) {
    const cur  = rows[i].gliShifted;
    const prev = i >= 20 ? rows[i - 20].gliShifted : null;
    rows[i].gliMomentum20d = (cur != null && prev != null && prev !== 0)
      ? ((cur - prev) / Math.abs(prev)) * 100
      : null;
  }
  return rows;
}

// ── Turning points ────────────────────────────────────────────────────────────

function collapseTurningPoints(points: GLITurningPoint[], minGapDays: number): GLITurningPoint[] {
  const out: GLITurningPoint[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && last.type === p.type &&
        (new Date(p.time + 'T00:00:00Z').getTime() - new Date(last.time + 'T00:00:00Z').getTime()) <= minGapDays * 86_400_000) {
      const moreExtreme = p.type === 'top' ? p.gliValue > last.gliValue : p.gliValue < last.gliValue;
      if (moreExtreme) out[out.length - 1] = p;
    } else {
      out.push(p);
    }
  }
  return out;
}

export function detectTurningPoints(gliRaw: GliPoint[], lagDays: number, lookback = 20): GLITurningPoint[] {
  const points: GLITurningPoint[] = [];
  for (let i = lookback; i < gliRaw.length - lookback; i++) {
    const window = gliRaw.slice(i - lookback, i + lookback + 1);
    const val = gliRaw[i].value;
    const isTop    = window.every(w => w.value <= val) && window.some(w => w.value < val);
    const isBottom = window.every(w => w.value >= val) && window.some(w => w.value > val);
    if (isTop || isBottom) {
      points.push({
        time:        gliRaw[i].time,
        shiftedTime: dateOffset(gliRaw[i].time, lagDays),
        type:        isTop ? 'top' : 'bottom',
        gliValue:    val,
      });
    }
  }
  return collapseTurningPoints(points, lookback);
}

export type GLIPhaseZone = { start: string; end: string; phase: 'rising' | 'falling' };

// Background shading between consecutive turning points — rising (bottom→top)
// or falling (top→bottom) phases, positioned on the shifted (chart) timeline.
export function buildPhaseZones(turningPoints: GLITurningPoint[]): GLIPhaseZone[] {
  const zones: GLIPhaseZone[] = [];
  for (let i = 0; i < turningPoints.length - 1; i++) {
    const a = turningPoints[i], b = turningPoints[i + 1];
    if (a.type === b.type) continue;
    zones.push({ start: a.shiftedTime, end: b.shiftedTime, phase: a.type === 'bottom' ? 'rising' : 'falling' });
  }
  return zones;
}

// ── Correlation ───────────────────────────────────────────────────────────────

export function rollingCorrelation(rows: BTCGliRow[], window = 90, returnPeriod = RETURN_PERIOD): number | null {
  const n = rows.length;
  const btcRet: number[] = [];
  const gliRet: number[] = [];
  for (let i = Math.max(returnPeriod, n - window); i < n; i++) {
    const btcPrior = rows[i - returnPeriod].btcClose;
    const gPrior   = rows[i - returnPeriod].gliShifted;
    const gToday   = rows[i].gliShifted;
    const btcToday = rows[i].btcClose;
    if (gPrior == null || gToday == null || gPrior === 0 || btcPrior === 0) continue;
    btcRet.push((btcToday - btcPrior) / btcPrior);
    gliRet.push((gToday - gPrior) / Math.abs(gPrior));
  }
  return pearson(btcRet, gliRet);
}

export function testLags(
  btcPrices:     PricePoint[],
  gliRaw:        GliPoint[],
  candidateLags: number[] = CANDIDATE_LAGS,
  returnPeriod = RETURN_PERIOD,
): LagCorrelationResult[] {
  const btcMap = new Map(btcPrices.map(p => [p.time, p.price]));
  const gliMap = new Map(gliRaw.map(p => [p.time, p.value]));
  const dates  = btcPrices.map(p => p.time);

  return candidateLags.map(lag => {
    const btcRet: number[] = [];
    const gliRet: number[] = [];
    for (let i = returnPeriod; i < dates.length; i++) {
      const d = dates[i];
      const dPrev = dates[i - returnPeriod];
      const btcToday = btcMap.get(d), btcPrior = btcMap.get(dPrev);
      const gToday = lookupNear(gliMap, dateOffset(d, -lag), 3);
      const gPrior = lookupNear(gliMap, dateOffset(dPrev, -lag), 3);
      if (btcToday == null || btcPrior == null || gToday == null || gPrior == null || gPrior === 0 || btcPrior === 0) continue;
      btcRet.push((btcToday - btcPrior) / btcPrior);
      gliRet.push((gToday - gPrior) / Math.abs(gPrior));
    }
    return { lagDays: lag, correlation: pearson(btcRet, gliRet), sampleSize: btcRet.length };
  });
}

// ── Signal + macro read ───────────────────────────────────────────────────────

function classifySignal(rows: BTCGliRow[], corr: number | null): {
  signal: LiquiditySignal; btcAboveTrend: boolean; gliTrend: 'rising' | 'falling' | 'flat';
} {
  const n = rows.length;
  const sma50 = sma(rows.map(r => r.btcClose), 50);
  const last = rows[n - 1];
  const btcAboveTrend = sma50[n - 1] != null ? last.btcClose > sma50[n - 1]! : false;

  const momentum = last.gliMomentum20d;
  const gliTrend: 'rising' | 'falling' | 'flat' =
    momentum == null || Math.abs(momentum) < 0.5 ? 'flat' : momentum > 0 ? 'rising' : 'falling';

  let signal: LiquiditySignal;
  if (corr == null || corr < -0.3) {
    signal = 'breakdown';
  } else if (gliTrend === 'rising' && btcAboveTrend && corr >= 0.3) {
    signal = 'tailwind';
  } else if (gliTrend === 'falling' && !btcAboveTrend && corr >= 0.3) {
    signal = 'headwind';
  } else if ((gliTrend === 'rising' && !btcAboveTrend) || (gliTrend === 'falling' && btcAboveTrend)) {
    signal = 'divergence';
  } else {
    signal = 'neutral';
  }
  return { signal, btcAboveTrend, gliTrend };
}

function generateMacroRead(current: GLICurrentStats): string {
  const { signal, gliTrend, correlation90d, lagDays } = current;
  const corrTxt = correlation90d != null ? `${correlation90d >= 0 ? '+' : ''}${correlation90d.toFixed(2)}` : 'unavailable';

  switch (signal) {
    case 'tailwind':
      return `GLI is rising on the ${lagDays}-day shifted view, and BTC is confirming with price above its 50-day trend. The ${lagDays}-day correlation reading of ${corrTxt} supports treating liquidity as a tailwind right now — a supportive backdrop for continuation, not a standalone buy signal.`;
    case 'headwind':
      return `GLI is rolling over on the ${lagDays}-day shifted view, and BTC is trading below its 50-day trend at the same time. With this offset, that points toward a weaker liquidity window ahead. Correlation is ${corrTxt} — wait for price confirmation before treating this as active.`;
    case 'divergence':
      return gliTrend === 'rising'
        ? `GLI is rising on the ${lagDays}-day shifted view, but BTC has not yet confirmed with a reclaim of trend. This is a lead/lag divergence — liquidity may be pointing to a more supportive window before price catches up, or the relationship simply hasn't kicked in yet at this lag.`
        : `GLI is rolling over on the ${lagDays}-day shifted view while BTC price is still holding above trend. BTC may be lagging a deteriorating liquidity backdrop — watch for trend confirmation over the coming weeks.`;
    case 'breakdown':
      return `The BTC/GLI relationship is weak or inverted right now (${lagDays}-day correlation: ${corrTxt}). Treat the lag model as unreliable at this offset — try a different lag in the optimizer below, and lean on other confirmation tools (DXY, seasonality, on-chain) instead.`;
    default:
      return `GLI and BTC are not showing a clear lead/lag relationship at a ${lagDays}-day offset right now (correlation: ${corrTxt}). This is a warning light, not a steering wheel — use it alongside other macro and cycle indicators before acting.`;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function computeBTCGliLag(btcPrices: PricePoint[], gliRaw: GliPoint[], lagDays: number): GLILagResult {
  const rows          = buildLagRows(btcPrices, gliRaw, lagDays);
  const turningPoints = detectTurningPoints(gliRaw, lagDays);
  const lagTests      = testLags(btcPrices, gliRaw);
  const correlation90d = rollingCorrelation(rows);

  const last = rows[rows.length - 1];
  const { signal, btcAboveTrend, gliTrend } = classifySignal(rows, correlation90d);
  const confidence: GLICurrentStats['confidence'] =
    correlation90d == null ? 'Low' : Math.abs(correlation90d) >= 0.6 ? 'High' : Math.abs(correlation90d) >= 0.3 ? 'Moderate' : 'Low';

  const current: GLICurrentStats = {
    btcPrice: last.btcClose,
    gli: last.gliShifted,
    gliTrend,
    lagDays,
    correlation90d,
    signal,
    confidence,
    btcAboveTrend,
  };

  return { rows, turningPoints, lagTests, current, macroRead: generateMacroRead(current) };
}
