import type { EtfDailyFlow } from '../api/etfFlows';

export type EtfFlowPoint = EtfDailyFlow & {
  rolling7: number | null;
  rolling30: number | null;
  cumulative: number;
  isHighInflow: boolean;
  isHighOutflow: boolean;
};

export type FlowScore = {
  score: number;
  label: string;
  color: string;
  description: string;
};

export type FlowDivergence = {
  status: 'bullish' | 'bearish' | 'aligned-bull' | 'aligned-bear';
  label: string;
  color: string;
  description: string;
};

// ─── Rolling / cumulative ─────────────────────────────────────────────────────

export function rollingSum(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    return values.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0);
  });
}

export function cumulativeSum(values: number[]): number[] {
  let acc = 0;
  return values.map(v => (acc += v));
}

// ─── Build chart-ready points ─────────────────────────────────────────────────

export function buildChartPoints(data: EtfDailyFlow[]): EtfFlowPoint[] {
  if (data.length === 0) return [];

  const flows = data.map(d => d.totalNetFlowUsd);
  const r7   = rollingSum(flows, 7);
  const r30  = rollingSum(flows, 30);
  const cum  = cumulativeSum(flows);

  const sorted = [...flows].sort((a, b) => a - b);
  const p5  = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;

  return data.map((d, i) => ({
    ...d,
    rolling7:      r7[i],
    rolling30:     r30[i],
    cumulative:    cum[i],
    isHighInflow:  d.totalNetFlowUsd >= p95,
    isHighOutflow: d.totalNetFlowUsd <= p5,
  }));
}

// ─── Summary stats ────────────────────────────────────────────────────────────

export function computeStats(data: EtfDailyFlow[]) {
  if (data.length === 0) return null;

  const flows  = data.map(d => d.totalNetFlowUsd);
  const r7     = rollingSum(flows, 7);
  const r30    = rollingSum(flows, 30);
  const cum    = cumulativeSum(flows);

  const last    = data[data.length - 1];
  const flow7d  = r7[r7.length - 1]   ?? null;
  const flow30d = r30[r30.length - 1] ?? null;
  const cumTotal = cum[cum.length - 1];

  // Consecutive inflow / outflow streak
  let streak = 0;
  let streakDir: 'inflow' | 'outflow' | 'flat' = 'flat';
  for (let i = data.length - 1; i >= 0; i--) {
    const f = data[i].totalNetFlowUsd;
    const dir = f > 0 ? 'inflow' : f < 0 ? 'outflow' : 'flat';
    if (i === data.length - 1) { streakDir = dir; streak = 1; }
    else if (dir === streakDir && dir !== 'flat') streak++;
    else break;
  }

  // Issuer breadth — most recent trading day
  const ISSUER_KEYS = ['ibit','fbtc','bitb','arkb','btco','ezbc','brrr','hodl','btcw','msbt','gbtc','btcMini'] as const;
  let positiveIssuers = 0, negativeIssuers = 0;
  for (const k of ISSUER_KEYS) {
    const v = (last as Record<string, unknown>)[k] as number | undefined;
    if (v == null) continue;
    if (v > 0) positiveIssuers++;
    else if (v < 0) negativeIssuers++;
  }

  return {
    last,
    flow7d,
    flow30d,
    cumTotal,
    streak,
    streakDir,
    positiveIssuers,
    negativeIssuers,
    totalIssuers: positiveIssuers + negativeIssuers,
  };
}

// ─── Flow score (0–100) ───────────────────────────────────────────────────────

export function computeFlowScore(data: EtfDailyFlow[]): FlowScore {
  const fallback: FlowScore = {
    score: 50, label: 'Insufficient Data',
    color: '#94A3B8', description: 'Not enough history to score flows.',
  };
  if (data.length < 30) return fallback;

  const stats = computeStats(data);
  if (!stats) return fallback;

  const { flow7d, flow30d, positiveIssuers, totalIssuers, last } = stats;

  // All flows in millions for normalisation
  const allFlows = data.map(d => d.totalNetFlowUsd / 1e6);
  const maxAbs   = Math.max(...allFlows.map(Math.abs), 1);

  // 7D trend (30%)
  const norm7  = flow7d != null  ? Math.max(-1, Math.min(1, flow7d / (maxAbs * 7 * 1e6)))  : 0;
  const s7     = (norm7 * 0.5 + 0.5) * 30;

  // 30D trend (30%)
  const norm30 = flow30d != null ? Math.max(-1, Math.min(1, flow30d / (maxAbs * 30 * 1e6))) : 0;
  const s30    = (norm30 * 0.5 + 0.5) * 30;

  // Breadth (15%)
  const breadth = totalIssuers > 0 ? positiveIssuers / totalIssuers : 0.5;
  const sBreadth = breadth * 15;

  // BTC trend vs 50-day avg (10%)
  const prices   = data.slice(-50).map(d => d.btcClose).filter(p => p > 0);
  const avg50    = prices.length > 0 ? prices.reduce((s, v) => s + v, 0) / prices.length : null;
  const sBtc     = avg50 != null ? (last.btcClose > avg50 ? 10 : 2) : 5;

  // Cumulative flow trend (15%)
  const cum = cumulativeSum(data.map(d => d.totalNetFlowUsd));
  const sCum = cum[cum.length - 1] > 0 ? 15 : 3;

  const score = Math.max(0, Math.min(100, s7 + s30 + sBreadth + sBtc + sCum));

  if (score >= 75) return {
    score, label: 'Strong Institutional Accumulation', color: '#35D07F',
    description: '7D and 30D flows both positive. Multiple issuers reporting inflows. ETF demand is a structural tailwind for BTC.',
  };
  if (score >= 50) return {
    score, label: 'Improving Demand', color: '#5B84FF',
    description: 'Net positive flow trend developing. Watch for confirmation across multiple issuers and sustained 30D positivity.',
  };
  if (score >= 25) return {
    score, label: 'Institutional Indecision', color: '#EAB84D',
    description: '7D flow mixed, 30D near zero. ETFs are neither adding meaningful buying pressure nor significant selling pressure.',
  };
  return {
    score, label: 'Institutional De-Risking', color: '#F85149',
    description: '30D flows remain negative. Multiple major issuers reporting outflows. ETF demand is a headwind for BTC price.',
  };
}

// ─── Flow / price divergence ──────────────────────────────────────────────────

export function computeDivergence(data: EtfDailyFlow[]): FlowDivergence | null {
  if (data.length < 30) return null;

  const stats = computeStats(data);
  if (!stats?.flow30d) return null;

  const recent      = data.slice(-30);
  const first       = recent[0].btcClose;
  const last        = recent[recent.length - 1].btcClose;
  const btcReturn30 = first > 0 ? (last - first) / first : 0;
  const { flow30d } = stats;

  if (flow30d > 0 && btcReturn30 <= 0.01) return {
    status: 'bullish', label: 'Bullish Divergence', color: '#35D07F',
    description: 'ETF demand improving while Bitcoin price is flat or down. Institutions accumulating into price weakness.',
  };
  if (flow30d < 0 && btcReturn30 >= -0.01) return {
    status: 'bearish', label: 'Bearish Divergence', color: '#F85149',
    description: 'ETF flows weakening while Bitcoin price holds or rises. Institutional demand is not confirming the move.',
  };
  if (flow30d > 0) return {
    status: 'aligned-bull', label: 'Demand Confirmed', color: '#5B84FF',
    description: 'ETF inflows and BTC price both rising. Institutional demand is confirming the bullish trend.',
  };
  return {
    status: 'aligned-bear', label: 'Dual Weakness', color: '#EAB84D',
    description: 'ETF outflows and BTC price declining together. Institutional selling is compounding the price weakness.',
  };
}
