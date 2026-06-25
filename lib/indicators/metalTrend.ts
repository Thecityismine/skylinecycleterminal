export type Metal = 'gold' | 'silver';

export type MetalRegime = 'bullish' | 'neutral' | 'bearish';
export type MacroQuadrant = 'expansion' | 'defensive' | 'recovery' | 'avoid';

export type MetalWeeklyPoint = {
  date: string;
  close: number;
  ma50w: number | null;
  ma200w: number | null;
  dxy: number | null;
  realYield: number | null;
  goldSilverRatio: number | null;
  regime: MetalRegime;
};

export type MetalCurrent = {
  price: number;
  ma50w: number | null;
  ma200w: number | null;
  distFrom50w: number | null;   // % deviation from 50W MA
  distFrom200w: number | null;  // % deviation from 200W MA
  goldSilverRatio: number | null;
  trendScore: number;           // 0-100 (higher = more extended)
  trendRegime: MetalRegime;
  macroQuadrant: MacroQuadrant;
  macroScore: number;           // 0-100 macro pressure (higher = more headwind)
  change52w: number | null;     // 52-week % return
  ath: number;                  // all-time high in dataset
  drawdownFromAth: number | null; // % below ATH (negative)
  realYieldCurrent: number | null;
  dxyRegime: 'rising' | 'falling' | 'flat';
};

export type MetalTrendResult = {
  chartData: MetalWeeklyPoint[];
  current: MetalCurrent;
};

export const METAL_CONFIG = {
  gold: {
    label: 'Gold',
    symbol: 'XAU/USD',
    unit: 'USD / oz',
    accent: '#EAB84D',
    secondary: '#F7D66A',
  },
  silver: {
    label: 'Silver',
    symbol: 'XAG/USD',
    unit: 'USD / oz',
    accent: '#94A3B8',
    secondary: '#C9D1D9',
  },
} as const;

export const GOLD_SILVER_REGIME = {
  low:  70,   // ratio < 70 → silver relatively expensive / strong momentum
  high: 90,   // ratio > 90 → silver historically cheap vs gold
} as const;

export const MACRO_QUADRANT_LABEL: Record<MacroQuadrant, string> = {
  expansion:  'Expansion Trend',
  defensive:  'Defensive Hedge',
  recovery:   'Recovery Setup',
  avoid:      'Avoid / Watch',
};

export const MACRO_QUADRANT_COLOR: Record<MacroQuadrant, string> = {
  expansion:  '#35D07F',
  defensive:  '#EAB84D',
  recovery:   '#5B84FF',
  avoid:      '#F85149',
};

export const REGIME_FILL: Record<MetalRegime, string> = {
  bullish: 'rgba(53,208,127,0.06)',
  neutral: 'rgba(230,180,80,0.04)',
  bearish: 'rgba(248,81,73,0.06)',
};

// ── Weekly resampling utilities ────────────────────────────────────────────

/** Returns the Monday (UTC) of the ISO week containing date d */
function mondayOf(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  return new Date(d.getTime() + diffToMon * 86400_000);
}

/** Downsample daily data to weekly: for each ISO week, keep the last available value */
export function downsampleToWeekly(
  daily: { date: string; value: number }[],
): { date: string; value: number }[] {
  const weekMap = new Map<string, { date: string; value: number }>();
  for (const p of daily) {
    const d = new Date(p.date + 'T00:00:00Z');
    const mon = mondayOf(d).toISOString().slice(0, 10);
    weekMap.set(mon, { date: mon, value: p.value });
  }
  return Array.from(weekMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Interpolate monthly data linearly to the given weekly date strings */
export function interpolateToWeeklyDates(
  monthly: { date: string; value: number }[],
  weeklyDates: string[],
): { date: string; value: number }[] {
  const sorted = [...monthly].sort((a, b) => a.date.localeCompare(b.date));
  const result: { date: string; value: number }[] = [];

  for (const date of weeklyDates) {
    const t = new Date(date + 'T00:00:00Z').getTime();
    let before: { date: string; value: number } | null = null;
    let after:  { date: string; value: number } | null = null;
    for (const p of sorted) {
      const pt = new Date(p.date + 'T00:00:00Z').getTime();
      if (pt <= t) before = p;
      else if (after === null) { after = p; break; }
    }
    if (before && after) {
      const bt = new Date(before.date + 'T00:00:00Z').getTime();
      const at = new Date(after.date + 'T00:00:00Z').getTime();
      const frac = (t - bt) / (at - bt);
      result.push({ date, value: before.value + frac * (after.value - before.value) });
    } else if (before) {
      result.push({ date, value: before.value });
    }
    // if no before, skip (metal data doesn't exist yet that far back)
  }
  return result;
}

// ── SMA helper ────────────────────────────────────────────────────────────

function sma(values: number[], period: number, index: number): number | null {
  if (index < period - 1) return null;
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) sum += values[i];
  return sum / period;
}

// ── Main computation function ─────────────────────────────────────────────

export function computeMetalTrend(
  metalWeekly: { date: string; value: number }[],   // weekly metal price (gold or silver)
  dxyWeekly: { date: string; value: number }[],     // weekly DXY
  realYieldWeekly: { date: string; value: number }[], // weekly 10Y real yield
  silverWeekly: { date: string; value: number }[] | null,  // null when computing silver itself
  goldWeekly:  { date: string; value: number }[] | null,   // null when computing gold itself
): MetalTrendResult {
  if (metalWeekly.length === 0) {
    return { chartData: [], current: {
      price: 0, ma50w: null, ma200w: null, distFrom50w: null, distFrom200w: null,
      goldSilverRatio: null, trendScore: 50, trendRegime: 'neutral', macroQuadrant: 'avoid',
      macroScore: 50, change52w: null, ath: 0, drawdownFromAth: null,
      realYieldCurrent: null, dxyRegime: 'flat',
    }};
  }

  const prices = metalWeekly.map(p => p.value);

  // Build lookup maps for macro data
  const dxyMap = new Map(dxyWeekly.map(p => [p.date, p.value]));
  const ryMap  = new Map(realYieldWeekly.map(p => [p.date, p.value]));
  const silverMap = silverWeekly ? new Map(silverWeekly.map(p => [p.date, p.value])) : null;
  const goldMap   = goldWeekly  ? new Map(goldWeekly.map(p => [p.date, p.value]))  : null;

  // Helper: find nearest value within ±4 weeks
  function nearest(map: Map<string, number>, date: string): number | null {
    for (let offset = 0; offset <= 28; offset += 7) {
      const d = new Date(date + 'T00:00:00Z');
      for (const delta of [0, offset, -offset].filter((v, i, a) => a.indexOf(v) === i)) {
        const key = new Date(d.getTime() + delta * 86400_000).toISOString().slice(0, 10);
        if (map.has(key)) return map.get(key)!;
      }
    }
    return null;
  }

  // Build chartData
  const chartData: MetalWeeklyPoint[] = metalWeekly.map((p, i) => {
    const ma50w  = sma(prices, 50,  i);
    const ma200w = sma(prices, 200, i);

    // Determine regime
    let regime: MetalRegime = 'neutral';
    if (ma200w !== null) {
      if (p.value > ma200w && (ma50w === null || p.value > ma50w)) regime = 'bullish';
      else if (p.value < ma200w) regime = 'bearish';
    }

    // Gold/Silver ratio
    let gsRatio: number | null = null;
    if (silverMap) {
      const sv = nearest(silverMap, p.date);
      if (sv && sv > 0) gsRatio = p.value / sv;
    } else if (goldMap) {
      const gv = nearest(goldMap, p.date);
      if (gv && gv > 0) gsRatio = gv / p.value;
    }

    return {
      date:             p.date,
      close:            p.value,
      ma50w,
      ma200w,
      dxy:              nearest(dxyMap, p.date),
      realYield:        nearest(ryMap, p.date),
      goldSilverRatio:  gsRatio,
      regime,
    };
  });

  // Current stats from last point
  const last = chartData[chartData.length - 1];
  const n    = chartData.length;

  const distFrom50w  = last.ma50w  ? ((last.close / last.ma50w)  - 1) * 100 : null;
  const distFrom200w = last.ma200w ? ((last.close / last.ma200w) - 1) * 100 : null;

  // 52-week return (≈52 points back)
  const idx52w = Math.max(0, n - 53);
  const change52w = ((last.close / chartData[idx52w].close) - 1) * 100;

  // ATH in dataset
  const ath = Math.max(...prices);
  const drawdownFromAth = ((last.close / ath) - 1) * 100;

  // Trend score (0–100, higher = more extended/expensive)
  let trendScore = 0;
  // Price vs 50W MA (30%)
  if (distFrom50w !== null) {
    trendScore += 0.30 * (distFrom50w > 10 ? 100 : distFrom50w > 3 ? 75 : distFrom50w > 0 ? 55 : distFrom50w > -5 ? 30 : 0);
  }
  // Price vs 200W MA (25%)
  if (distFrom200w !== null) {
    trendScore += 0.25 * (distFrom200w > 20 ? 100 : distFrom200w > 5 ? 75 : distFrom200w > 0 ? 55 : distFrom200w > -10 ? 25 : 0);
  }
  // Distance from ATH (15%)
  trendScore += 0.15 * (drawdownFromAth > -5 ? 100 : drawdownFromAth > -15 ? 70 : drawdownFromAth > -30 ? 40 : 10);
  // Gold/Silver ratio (15%) — high ratio = gold expensive / silver cheap / risk-off
  if (last.goldSilverRatio !== null) {
    const r = last.goldSilverRatio;
    trendScore += 0.15 * (r > 90 ? 80 : r > 70 ? 50 : 30);
  }
  // DXY trend (10%) — rising DXY = headwind for metals
  const idx8w  = Math.max(0, n - 9);
  const dxyNow = last.dxy;
  const dxy8w  = chartData[idx8w].dxy;
  let dxyRegime: 'rising' | 'falling' | 'flat' = 'flat';
  if (dxyNow !== null && dxy8w !== null) {
    const dxyChg = ((dxyNow / dxy8w) - 1) * 100;
    dxyRegime    = dxyChg > 0.5 ? 'rising' : dxyChg < -0.5 ? 'falling' : 'flat';
    trendScore  += 0.10 * (dxyRegime === 'rising' ? 70 : dxyRegime === 'flat' ? 50 : 20);
  }
  // Real yield trend (5%) — rising real yield = headwind
  const ryNow  = last.realYield;
  const ry8w   = chartData[idx8w].realYield;
  if (ryNow !== null && ry8w !== null) {
    const ryChg  = ryNow - ry8w;
    trendScore  += 0.05 * (ryChg > 0.2 ? 70 : ryChg < -0.2 ? 20 : 45);
  }

  // Macro score (0–100, higher = more headwind)
  let macroScore = 50;
  if (dxyRegime === 'rising') macroScore += 20;
  else if (dxyRegime === 'falling') macroScore -= 20;
  if (ryNow !== null && ry8w !== null) {
    const ryChg = ryNow - ry8w;
    if (ryChg > 0.2) macroScore += 15;
    else if (ryChg < -0.2) macroScore -= 15;
  }
  macroScore = Math.max(0, Math.min(100, macroScore));

  // Macro quadrant: 2×2 grid of (trend strong/weak) × (macro tailwind/headwind)
  const trendStrong = last.regime === 'bullish';
  const macroTailwind = macroScore < 50;
  let macroQuadrant: MacroQuadrant;
  if (trendStrong && macroTailwind) macroQuadrant = 'expansion';
  else if (trendStrong && !macroTailwind) macroQuadrant = 'defensive';
  else if (!trendStrong && macroTailwind) macroQuadrant = 'recovery';
  else macroQuadrant = 'avoid';

  return {
    chartData,
    current: {
      price: last.close,
      ma50w: last.ma50w,
      ma200w: last.ma200w,
      distFrom50w,
      distFrom200w,
      goldSilverRatio: last.goldSilverRatio,
      trendScore: Math.round(trendScore),
      trendRegime: last.regime,
      macroQuadrant,
      macroScore: Math.round(macroScore),
      change52w,
      ath,
      drawdownFromAth,
      realYieldCurrent: last.realYield,
      dxyRegime,
    },
  };
}
