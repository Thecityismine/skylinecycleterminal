import type { CycleScoreResult, IndicatorResult } from '@/lib/indicators/skylineScore';

type PricePoint = { time: string; price: number };

export type SignalStatus = 'confirming' | 'not-confirming' | 'unavailable';

export type ConfirmationSignal = {
  key: string;
  label: string;
  status: SignalStatus;
  detail: string;
  source: string;
};

export type ConfirmationSummary = {
  signals: ConfirmationSignal[];
  confirmingCount: number;
  total: number;
};

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Step-back weekly resample (anchored on the most recent day, not calendar weeks) —
// good enough for a moving-average trend read, not used for exact date labeling.
function weeklyCloses(prices: PricePoint[]): number[] {
  const out: number[] = [];
  for (let i = prices.length - 1; i >= 0; i -= 7) out.unshift(prices[i].price);
  return out;
}

type MonthCandle = { month: string; o: number; h: number; l: number; c: number };

// Daily closes only (no intraday OHLC available from the free price feed), so
// monthly O/H/L/C is approximated from the first/max/min/last daily close in
// each calendar month. Good enough to read a Heikin-Ashi trend turn, not a
// substitute for real intramonth wicks.
function monthlyCandles(prices: PricePoint[]): MonthCandle[] {
  const byMonth = new Map<string, number[]>();
  for (const p of prices) {
    const key = p.time.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(p.price);
  }
  return [...byMonth.entries()].map(([month, closes]) => ({
    month,
    o: closes[0],
    h: Math.max(...closes),
    l: Math.min(...closes),
    c: closes[closes.length - 1],
  }));
}

function heikinAshiTrend(candles: MonthCandle[]): { bullish: boolean; flippedThisMonth: boolean } | null {
  if (candles.length < 3) return null;
  let haOpen = (candles[0].o + candles[0].c) / 2;
  let haClose = (candles[0].o + candles[0].h + candles[0].l + candles[0].c) / 4;
  let prevBullish = haClose > haOpen;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const nextHaOpen = (haOpen + haClose) / 2;
    const nextHaClose = (c.o + c.h + c.l + c.c) / 4;
    const bullish = nextHaClose > nextHaOpen;
    if (i === candles.length - 1) {
      return { bullish, flippedThisMonth: bullish !== prevBullish };
    }
    haOpen = nextHaOpen;
    haClose = nextHaClose;
    prevBullish = bullish;
  }
  return null;
}

function findIndicator(indicators: IndicatorResult[], name: string): IndicatorResult | undefined {
  return indicators.find((i) => i.name === name);
}

// Reuses the already-computed Skyline Score sub-indicators (MVRV proxy, Puell,
// Hash Rate Ribbon, Reserve Risk) rather than standing up separate on-chain
// pipelines — same numbers shown on the Skyline Score page, just re-read here
// as binary confirm/not-confirm checks against the "buy zone" threshold.
function fromIndicator(indicators: IndicatorResult[], name: string, label: string, key: string): ConfirmationSignal {
  const ind = findIndicator(indicators, name);
  if (!ind || !ind.available) {
    return { key, label, status: 'unavailable', detail: 'Insufficient data', source: 'Skyline Score' };
  }
  const confirming = ind.score < 38; // matches skylineScore.ts "Buy" / "Strong Buy" threshold
  return {
    key, label,
    status: confirming ? 'confirming' : 'not-confirming',
    detail: `${ind.rawLabel} · ${ind.signal}`,
    source: ind.source,
  };
}

export function buildConfirmationSignals(
  prices: PricePoint[],
  skyline: CycleScoreResult | null,
): ConfirmationSummary {
  const signals: ConfirmationSignal[] = [];

  // 1. Monthly Heikin-Ashi bear-end turn
  const ha = heikinAshiTrend(monthlyCandles(prices));
  signals.push(ha ? {
    key: 'heikin-ashi',
    label: 'Monthly Heikin-Ashi',
    status: ha.bullish && ha.flippedThisMonth ? 'confirming' : 'not-confirming',
    detail: ha.bullish
      ? (ha.flippedThisMonth ? 'Flipped bullish this month' : 'Bullish, no fresh flip')
      : 'Still bearish',
    source: 'Approximated from daily closes',
  } : { key: 'heikin-ashi', label: 'Monthly Heikin-Ashi', status: 'unavailable', detail: 'Insufficient history', source: 'Approximated from daily closes' });

  // 2. 200-week MA position
  const weekly = weeklyCloses(prices);
  const ma200w = sma(weekly, 200);
  const lastClose = weekly.at(-1) ?? null;
  signals.push(ma200w != null && lastClose != null ? {
    key: '200w-ma',
    label: '200W Moving Average',
    status: lastClose > ma200w ? 'confirming' : 'not-confirming',
    detail: `Price ${lastClose > ma200w ? 'above' : 'below'} 200W MA ($${Math.round(ma200w).toLocaleString()})`,
    source: 'Computed from price series',
  } : { key: '200w-ma', label: '200W Moving Average', status: 'unavailable', detail: 'Insufficient history', source: 'Computed from price series' });

  // 3. 20-week MA reclaim (short-term structure)
  const ma20w = sma(weekly, 20);
  signals.push(ma20w != null && lastClose != null ? {
    key: '20w-reclaim',
    label: '20W MA Reclaim',
    status: lastClose > ma20w ? 'confirming' : 'not-confirming',
    detail: `Price ${lastClose > ma20w ? 'holding above' : 'below'} 20W MA ($${Math.round(ma20w).toLocaleString()})`,
    source: 'Computed from price series',
  } : { key: '20w-reclaim', label: '20W MA Reclaim', status: 'unavailable', detail: 'Insufficient history', source: 'Computed from price series' });

  const indicators = skyline?.indicators ?? [];
  signals.push(fromIndicator(indicators, 'MVRV Ratio', 'MVRV (proxy)', 'mvrv'));
  signals.push(fromIndicator(indicators, 'Puell Multiple', 'Puell Multiple', 'puell'));
  signals.push(fromIndicator(indicators, 'Hash Rate Ribbon', 'Hash Ribbon', 'hash-ribbon'));
  signals.push(fromIndicator(indicators, 'Reserve Risk', 'LTH Dormancy (Reserve Risk)', 'lth-dormancy'));

  // 8. Skyline Cycle Score itself — "accumulate" zone counts as confirming
  signals.push(skyline ? {
    key: 'skyline-score',
    label: 'Skyline Cycle Score',
    status: skyline.score < 25 ? 'confirming' : 'not-confirming',
    detail: `${skyline.score} / 100 · ${skyline.zoneLabel}`,
    source: 'Skyline Score',
  } : { key: 'skyline-score', label: 'Skyline Cycle Score', status: 'unavailable', detail: 'Not loaded', source: 'Skyline Score' });

  const confirmingCount = signals.filter((s) => s.status === 'confirming').length;
  return { signals, confirmingCount, total: signals.length };
}
