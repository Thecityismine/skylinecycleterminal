import type { MVRVDataPoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SoprPoint = {
  time:          string;
  rawSopr:       number;       // MVRV ratio (proxy for SOPR, centered on 1.0)
  soprDeviation: number;       // MVRV - 1 (proxy for SOPR - 1, centered on 0)
  sma30:         number | null;
  sma90:         number | null;
  btcClose:      number;
};

export type SoprRegime = {
  label:       string;
  color:       string;
  description: string;
};

export type SoprReclaimStatus = {
  status:         'below' | 'transitioning' | 'reclaimed' | 'holding';
  daysAbove:      number;
  daysBelow:      number;
  label:          string;
  color:          string;
  interpretation: string;
};

export type RegimeBand = {
  y1:      number;
  y2:      number;
  fill:    string;
  opacity: number;
};

export type HistoricalSoprEvent = {
  period:          string;
  soprBehavior:    string;
  interpretation:  string;
};

// ─── Rolling SMA ─────────────────────────────────────────────────────────────

function rollingMean(values: number[], period: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= period) sum -= values[i - period];
    if (i < period - 1) return null;
    return sum / period;
  });
}

// ─── Build chart points ───────────────────────────────────────────────────────

export function buildSoprPoints(raw: MVRVDataPoint[]): SoprPoint[] {
  const mvrvValues = raw.map((r) => r.mvrv);
  const sma30v     = rollingMean(mvrvValues, 30);
  const sma90v     = rollingMean(mvrvValues, 90);

  return raw.map((r, i) => ({
    time:          r.time,
    rawSopr:       r.mvrv,
    soprDeviation: r.mvrv - 1,
    sma30:         sma30v[i],
    sma90:         sma90v[i],
    btcClose:      r.price,
  }));
}

// ─── Regime ───────────────────────────────────────────────────────────────────

export function getSoprRegime(points: SoprPoint[]): SoprRegime {
  if (points.length === 0) return { label: 'No Data', color: '#94A3B8', description: '—' };

  const last = points[points.length - 1];
  const dev  = last.soprDeviation;
  const sma90 = last.sma90 ?? last.rawSopr;

  // Count consecutive days above / below 1.0 for trend context
  let streak = 0;
  const dir = last.rawSopr >= 1.0 ? 'above' : 'below';
  for (let i = points.length - 1; i >= 0; i--) {
    const above = points[i].rawSopr >= 1.0;
    if ((dir === 'above' && above) || (dir === 'below' && !above)) streak++;
    else break;
  }

  if (dev < -0.25) return {
    label: 'Capitulation',
    color: '#FF5C5C',
    description: 'Market cap is well below realized cap. Holders are at significant aggregate loss — historically coincides with bear market bottoms.',
  };

  if (dev < 0 && streak > 30) return {
    label: 'Bear Stress',
    color: '#F97316',
    description: `Prolonged loss period (${streak} days below 1.0). Extended selling below cost basis indicates sustained bear-market pressure.`,
  };

  if (dev < 0) return {
    label: 'Loss Realization',
    color: '#F85149',
    description: 'Market cap is below realized cap. Holders are at aggregate loss. Watch for a sustained reclaim of 1.0 to confirm recovery.',
  };

  if (dev > 0 && dev < 0.05) return {
    label: 'Neutral / Transition',
    color: '#94A3B8',
    description: 'MVRV is near break-even. Market is transitioning — watch for a sustained directional move above or below 1.0.',
  };

  if (dev > 2.5 && sma90 > 3.0) return {
    label: 'Distribution Risk',
    color: '#F97316',
    description: 'MVRV is at historically elevated levels. Market cap is at major premium above realized cap — cycle top risk is elevated.',
  };

  if (dev > 0.5 && streak > 30) return {
    label: 'Healthy Bull Trend',
    color: '#35D07F',
    description: `Market has been above break-even for ${streak} days. Pullbacks to near 1.0 are historically constructive buying zones.`,
  };

  return {
    label: 'Profit Realization',
    color: '#3B82F6',
    description: 'Market cap exceeds realized cap. Holders are in aggregate profit. Trend is constructive.',
  };
}

// ─── Trend read ───────────────────────────────────────────────────────────────

export type SoprTrendRead = {
  currentLabel:   string;
  trend30:        'Rising' | 'Falling' | 'Flat';
  trend90:        'Rising' | 'Falling' | 'Flat';
  netBehavior:    string;
  marketRead:     string;
};

export function getSoprTrendRead(points: SoprPoint[]): SoprTrendRead {
  if (points.length < 10) {
    return { currentLabel: '—', trend30: 'Flat', trend90: 'Flat', netBehavior: '—', marketRead: '—' };
  }

  const last   = points[points.length - 1];
  const p30ago = points[Math.max(0, points.length - 31)];
  const p90ago = points[Math.max(0, points.length - 91)];

  const trendLabel = (now: number, before: number): 'Rising' | 'Falling' | 'Flat' => {
    const delta = now - before;
    if (delta > 0.05) return 'Rising';
    if (delta < -0.05) return 'Falling';
    return 'Flat';
  };

  const trend30 = trendLabel(last.rawSopr, p30ago.rawSopr);
  const trend90 = trendLabel(last.rawSopr, p90ago.rawSopr);
  const above   = last.rawSopr >= 1.0;

  const netBehavior = above
    ? 'Net Profit Realization'
    : 'Net Loss Realization';

  const marketRead = above
    ? trend30 === 'Rising'
      ? 'Profit-taking is accelerating. Sentiment is expanding — watch for exhaustion at historically elevated levels.'
      : trend30 === 'Falling'
      ? 'Profit-taking is easing. Market is healthy if MVRV holds above 1.0 on pullbacks.'
      : 'Market is in equilibrium above break-even. Trend is constructive but lacks directional momentum.'
    : trend30 === 'Rising'
    ? 'Losses are easing. An attempted recovery is in progress — sustained close above 1.0 needed to confirm improvement.'
    : 'Participants are realizing losses. This can signal fear but is not automatically a bottom signal without reversal confirmation.';

  return {
    currentLabel: above ? 'Above Break-Even' : 'Below Break-Even',
    trend30,
    trend90,
    netBehavior,
    marketRead,
  };
}

// ─── Reclaim status ───────────────────────────────────────────────────────────

export function getSoprReclaimStatus(points: SoprPoint[]): SoprReclaimStatus {
  if (points.length === 0) {
    return { status: 'below', daysAbove: 0, daysBelow: 0, label: '—', color: '#94A3B8', interpretation: '—' };
  }

  const last   = points[points.length - 1];
  const above  = last.rawSopr >= 1.0;
  let streak   = 0;

  for (let i = points.length - 1; i >= 0; i--) {
    const a = points[i].rawSopr >= 1.0;
    if (a === above) streak++;
    else break;
  }

  const hadOpposite = points.slice(0, points.length - streak).some((p) =>
    above ? p.rawSopr < 1.0 : p.rawSopr >= 1.0
  );

  if (!above) return {
    status:         'below',
    daysAbove:      0,
    daysBelow:      streak,
    label:          `Below Break-Even (${streak}d)`,
    color:          '#FF5C5C',
    interpretation: 'Market cap is below realized cap. Aggregate holders at loss. Needs a sustained close above 1.0 to signal recovery.',
  };

  if (streak >= 14 && hadOpposite) return {
    status:         'reclaimed',
    daysAbove:      streak,
    daysBelow:      0,
    label:          `Reclaim Confirmed (${streak}d)`,
    color:          '#35D07F',
    interpretation: 'MVRV has reclaimed 1.0 after a period of loss and held for 2+ weeks. Market structure is improving.',
  };

  if (streak >= 14) return {
    status:         'holding',
    daysAbove:      streak,
    daysBelow:      0,
    label:          `Above Break-Even (${streak}d)`,
    color:          '#35D07F',
    interpretation: 'Market has held above realized cost basis for 2+ weeks. Uptrend structure is intact.',
  };

  return {
    status:         'transitioning',
    daysAbove:      streak,
    daysBelow:      0,
    label:          `Above Break-Even (${streak}d)`,
    color:          '#3B82F6',
    interpretation: 'Recent reclaim of break-even. Needs to hold for 2+ weeks to confirm structural improvement.',
  };
}

// ─── Regime background bands ──────────────────────────────────────────────────

export const SOPR_REGIME_BANDS: RegimeBand[] = [
  { y1: 3.0,  y2: 15,   fill: '#F97316', opacity: 0.06 },  // Distribution risk
  { y1: 0.5,  y2: 3.0,  fill: '#35D07F', opacity: 0.04 },  // Healthy bull
  { y1: 0,    y2: 0.5,  fill: '#35D07F', opacity: 0.02 },  // Break-even to moderate profit
  { y1: -0.5, y2: 0,    fill: '#3B82F6', opacity: 0.04 },  // Transition
  { y1: -5,   y2: -0.5, fill: '#F85149', opacity: 0.06 },  // Capitulation
];

// ─── Historical events table ──────────────────────────────────────────────────

export const HISTORICAL_SOPR_EVENTS: HistoricalSoprEvent[] = [
  { period: '2015 Bear Market',  soprBehavior: 'Extended below 1.0',     interpretation: 'Capitulation — market at aggregate loss' },
  { period: '2018 Bear Market',  soprBehavior: 'Sharp dip below 1.0',    interpretation: 'Capitulation event — final wave of selling' },
  { period: '2019 Recovery',     soprBehavior: 'Reclaimed 1.0',          interpretation: 'Trend recovery — market returned to cost basis' },
  { period: '2020 COVID Crash',  soprBehavior: 'Brief dip, fast reclaim',interpretation: 'Stress event — structural recovery confirmed quickly' },
  { period: '2021 Cycle Peak',   soprBehavior: 'Elevated above 1.0',     interpretation: 'Distribution zone — market far above cost basis' },
  { period: '2022 Bear Market',  soprBehavior: 'Extended below 1.0',     interpretation: 'Bear structure — prolonged loss period' },
];
