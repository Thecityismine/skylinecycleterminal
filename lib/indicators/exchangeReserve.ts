import type { ExchangeReservePoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HodlWavePoint = {
  time:       string;
  btcClose:   number;
  exchBtc:    number;           // raw BTC on exchanges
  exchPct:    number;           // % of circulating supply on exchanges
  exch30d:    number | null;    // 30D SMA of exchPct
  exch90d:    number | null;    // 90D SMA of exchPct
  change30d:  number | null;    // pp change vs 30d ago
  change90d:  number | null;    // pp change vs 90d ago
  change180d: number | null;    // pp change vs 180d ago
};

export type HodlRegime = {
  label:       string;
  color:       string;
  description: string;
};

export type DistributionScore = {
  score:       number;     // 0–100: 0 = strong accumulation, 100 = heavy distribution
  label:       string;
  color:       string;
  description: string;
  breakdown: {
    exch90d:    number;    // contribution: exchange supply 90D trend
    exch180d:   number;    // contribution: exchange supply 180D trend
    btcReturn:  number;    // contribution: BTC 90D price return
    btcVsMa:    number;    // contribution: BTC vs 200DMA
    exchVsAvg:  number;    // contribution: exchange % vs 365D average
  };
};

export type HodlMarker = {
  time:  string;
  type:  'peak' | 'bottom';
  label: string;
  color: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function normalize(v: number, lo: number, hi: number): number {
  return clamp(((v - lo) / (hi - lo)) * 100, 0, 100);
}

function sma(values: number[], period: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= period) sum -= values[i - period];
    return i >= period - 1 ? sum / period : null;
  });
}

// ─── Build HODL wave points ───────────────────────────────────────────────────

export function buildHodlWavePoints(raw: ExchangeReservePoint[]): HodlWavePoint[] {
  const sorted = [...raw].sort((a, b) => a.time.localeCompare(b.time));

  const exchPcts = sorted.map((r) => (r.exchBtc / r.splyCur) * 100);
  const ma30     = sma(exchPcts, 30);
  const ma90     = sma(exchPcts, 90);

  return sorted.map((r, i) => ({
    time:      r.time,
    btcClose:  r.price,
    exchBtc:   r.exchBtc,
    exchPct:   exchPcts[i],
    exch30d:   ma30[i],
    exch90d:   ma90[i],
    change30d:  i >= 30  ? exchPcts[i] - exchPcts[i - 30]  : null,
    change90d:  i >= 90  ? exchPcts[i] - exchPcts[i - 90]  : null,
    change180d: i >= 180 ? exchPcts[i] - exchPcts[i - 180] : null,
  }));
}

// ─── Regime ───────────────────────────────────────────────────────────────────

export function getHodlRegime(points: HodlWavePoint[]): HodlRegime {
  if (points.length < 100) {
    return { label: 'Insufficient Data', color: '#6B7280', description: 'Not enough history.' };
  }

  const last     = points[points.length - 1];
  const prev90   = points[Math.max(0, points.length - 91)];
  const exchDiff = last.exchPct - prev90.exchPct;       // +pp = rising (distribution), -pp = falling (accumulation)
  const btcDiff  = ((last.btcClose - prev90.btcClose) / prev90.btcClose) * 100;
  const isBtcUp  = btcDiff > 10;
  const isBtcDn  = btcDiff < -10;
  const isExchUp = exchDiff > 0.5;
  const isExchDn = exchDiff < -0.5;

  if (isExchDn && isBtcUp) {
    return {
      label: 'Healthy Expansion',
      color: '#35D07F',
      description: 'Coins leaving exchanges while price rises — holders are not selling into strength.',
    };
  }
  if (isExchDn && !isBtcUp) {
    return {
      label: 'Long-Term Accumulation',
      color: '#3B82F6',
      description: 'Coins leaving exchanges and moving to cold storage. Classic accumulation behavior.',
    };
  }
  if (isExchUp && isBtcUp) {
    return {
      label: 'Distribution Risk',
      color: '#FF5C5C',
      description: 'More coins moving to exchanges while price rises. Holders may be preparing to sell.',
    };
  }
  if (isExchUp && isBtcDn) {
    return {
      label: 'Market Stress',
      color: '#E6B450',
      description: 'Coins flowing to exchanges while price falls. Forced selling or panic signals.',
    };
  }
  return {
    label: 'Neutral / Consolidation',
    color: '#6B7280',
    description: 'Exchange supply and price moving without a dominant trend. Range-bound market behavior.',
  };
}

// ─── Distribution Score 0–100 ────────────────────────────────────────────────
// 100 = maximum distribution risk (exchange supply rising into price strength)
//   0 = maximum accumulation (exchange supply falling, coins in cold storage)

export function getDistributionScore(points: HodlWavePoint[]): DistributionScore {
  if (points.length < 200) {
    return {
      score: 50, label: 'Insufficient Data', color: '#6B7280',
      description: 'Need at least 200 days of data.',
      breakdown: { exch90d: 50, exch180d: 50, btcReturn: 50, btcVsMa: 50, exchVsAvg: 50 },
    };
  }

  const last  = points[points.length - 1];
  const p30   = points[Math.max(0, points.length - 31)];
  const p90   = points[Math.max(0, points.length - 91)];
  const p180  = points[Math.max(0, points.length - 181)];
  const p200  = points[Math.max(0, points.length - 201)];
  const p365  = points[Math.max(0, points.length - 366)];

  // 1. Exchange supply 90D trend (rising = distribution risk, weight 40%)
  const ch90pp  = last.exchPct - p90.exchPct;
  const exch90d = normalize(ch90pp, -5, 5);   // -5pp drop → 0, +5pp rise → 100

  // 2. Exchange supply 180D trend (weight 25%)
  const ch180pp  = last.exchPct - p180.exchPct;
  const exch180d = normalize(ch180pp, -8, 8);

  // 3. BTC 90D price return (rising BTC with rising exchange = distribution risk, weight 15%)
  const btcRet90d = ((last.btcClose - p90.btcClose) / p90.btcClose) * 100;
  const btcReturn = normalize(btcRet90d, -50, 100);

  // 4. BTC vs 200DMA (extended price = distribution risk, weight 10%)
  const ma200prices = points.slice(Math.max(0, points.length - 201), points.length - 1).map((p) => p.btcClose);
  const ma200 = ma200prices.length > 0
    ? ma200prices.reduce((s, v) => s + v, 0) / ma200prices.length
    : last.btcClose;
  const btcVsMa = normalize(last.btcClose / ma200, 0.8, 2.5);

  // 5. Exchange % vs 365D average (elevated supply on exchanges vs history, weight 10%)
  const avg365 = p365
    ? points.slice(Math.max(0, points.length - 366)).reduce((s, p) => s + p.exchPct, 0) /
      Math.min(366, points.length)
    : last.exchPct;
  const exchVsAvg = normalize(last.exchPct / avg365, 0.88, 1.15);

  const score = Math.round(
    exch90d  * 0.40 +
    exch180d * 0.25 +
    btcReturn * 0.15 +
    btcVsMa  * 0.10 +
    exchVsAvg * 0.10,
  );

  const clampedScore = clamp(score, 0, 100);

  let label: string, color: string, description: string;
  if (clampedScore < 25) {
    label = 'Strong Accumulation';
    color = '#3B82F6';
    description = 'Exchange supply declining significantly. Long-term holders are pulling coins off markets.';
  } else if (clampedScore < 50) {
    label = 'Neutral / Holding';
    color = '#35D07F';
    description = 'Exchange supply broadly stable. No dominant accumulation or distribution pressure.';
  } else if (clampedScore < 75) {
    label = 'Moderate Distribution';
    color = '#E6B450';
    description = 'Exchange supply rising. Holders may be positioning to sell into current prices.';
  } else {
    label = 'Heavy Distribution Risk';
    color = '#FF5C5C';
    description = 'Exchange supply rising sharply. More coins available on markets suggests distribution.';
  }

  return {
    score: clampedScore,
    label,
    color,
    description,
    breakdown: { exch90d, exch180d, btcReturn, btcVsMa, exchVsAvg },
  };
}

// ─── Key historical cycle events ─────────────────────────────────────────────

export const HODL_CYCLE_EVENTS: HodlMarker[] = [
  { time: '2017-12-17', type: 'peak',   label: 'Peak 2017',     color: '#FF5C5C' },
  { time: '2018-12-15', type: 'bottom', label: 'Bear Low 2018', color: '#35D07F' },
  { time: '2021-11-08', type: 'peak',   label: 'Peak 2021',     color: '#FF5C5C' },
  { time: '2022-11-21', type: 'bottom', label: 'Bear Low 2022', color: '#35D07F' },
  { time: '2024-03-14', type: 'peak',   label: 'ATH 2024',      color: '#E6B450' },
];

export const HALVINGS_WITH_EXCHANGE: Array<{ ts: number; label: string }> = [
  { ts: new Date('2016-07-09').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19').getTime(), label: 'H4' },
];
