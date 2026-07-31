import type { PricePoint } from '@/lib/api/coinmetrics';

// Generation Buying Zone: weekly closes against the 200 EMA and 230 SMMA.
//
// Everything here is derived from the price series. Nothing about the historical
// episodes, their prices, or their forward returns is written down, because a
// hardcoded figure drifts silently and this product's whole claim is that its
// numbers are checkable.
//
// Two things the maths makes plain, and the page must not hide:
//   - The 200 EMA needs 200 weekly closes and the 230 SMMA needs 230, so neither
//     exists before roughly mid-2014. This signal is silent on 2011-2013.
//   - Weekly *closes* are not intraday lows. Popular retellings of these events
//     quote the wick (COVID at $3,858); the weekly close was $5,359. Both are
//     true, but only one belongs on a weekly chart.

export type WeeklyPoint = {
  time: string;
  ts: number;
  close: number;
  ema200: number | null;
  smma230: number | null;
};

export type ZoneEpisode = {
  start: string;
  end: string;
  weeks: number;
  lowClose: number;
  lowTime: string;
  /** Whether price reached the deeper 230 SMMA, not just the 200 EMA. */
  reachedSmma: boolean;
  /** Null while the episode is still running: there is no forward return yet. */
  forwardReturnPct: number | null;
  peakClose: number | null;
  peakTime: string | null;
  ongoing: boolean;
  label: string | null;
};

export type ZoneCondition = { label: string; met: boolean; detail: string };

export type GenerationZoneResult = {
  weekly: WeeklyPoint[];
  current: {
    time: string;
    close: number;
    ema200: number | null;
    smma230: number | null;
    distanceToEmaPct: number | null;
    distanceToSmmaPct: number | null;
    inZone: boolean;
    depth: 'outside' | 'at-ema' | 'at-smma';
  };
  episodes: ZoneEpisode[];
  conditions: ZoneCondition[];
  alignmentPct: number;
};

/** Close within this much above an average still counts as a touch. */
const TOUCH_TOLERANCE = 0.02;

/** Consecutive touch weeks separated by less than this are one episode. */
const EPISODE_GAP_WEEKS = 6;

// Named after the fact, keyed by the month of the episode's lowest weekly close.
// Only labels episodes that have a widely used name; the rest stay unlabelled
// rather than getting one invented for them.
const EPISODE_LABELS: Record<string, string> = {
  '2015-01': '2015 bear market low',
  '2015-08': 'August 2015 sell-off',
  '2018-12': '2018 bear market',
  '2020-03': 'COVID crash',
  '2022-11': 'FTX collapse',
  '2023-09': '2023 consolidation',
};

function isoWeekKey(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const day = d.getUTCDay() || 7;
  const thu = new Date(d);
  thu.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thu.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${thu.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Last daily close of each ISO week. */
export function toWeeklyCloses(daily: PricePoint[]): { time: string; close: number }[] {
  const byWeek = new Map<string, { time: string; close: number }>();
  for (const p of [...daily].sort((a, b) => a.time.localeCompare(b.time))) {
    byWeek.set(isoWeekKey(p.time), { time: p.time, close: p.price });
  }
  return [...byWeek.values()];
}

/** Exponential moving average, seeded with the SMA of the first n. */
function ema(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < n) return out;
  const k = 2 / (n + 1);
  let prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's smoothed moving average: (prev*(n-1) + price)/n, seeded with SMA. */
function smma(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < n) return out;
  let prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i++) {
    prev = (prev * (n - 1) + values[i]) / n;
    out[i] = prev;
  }
  return out;
}

const pctFrom = (price: number, ma: number | null): number | null =>
  ma == null || ma <= 0 ? null : ((price - ma) / ma) * 100;

export function computeGenerationZone(
  daily: PricePoint[],
  extras: { fearGreed: number | null; cycleScore: number | null },
): GenerationZoneResult {
  const weeks = toWeeklyCloses(daily);
  const closes = weeks.map((w) => w.close);
  const e = ema(closes, 200);
  const s = smma(closes, 230);

  const weekly: WeeklyPoint[] = weeks.map((w, i) => ({
    time: w.time,
    ts: new Date(w.time + 'T00:00:00Z').getTime(),
    close: w.close,
    ema200: e[i],
    smma230: s[i],
  }));

  // ── Episodes ──────────────────────────────────────────────────────────────
  const episodes: ZoneEpisode[] = [];
  for (let i = 0; i < weekly.length; i++) {
    const p = weekly[i];
    const atEma = p.ema200 != null && p.close <= p.ema200 * (1 + TOUCH_TOLERANCE);
    const atSmma = p.smma230 != null && p.close <= p.smma230 * (1 + TOUCH_TOLERANCE);
    if (!atEma && !atSmma) continue;

    const prev = episodes[episodes.length - 1];
    const gap = prev ? (p.ts - new Date(prev.end + 'T00:00:00Z').getTime()) / (7 * 86400000) : Infinity;

    if (prev && gap <= EPISODE_GAP_WEEKS) {
      prev.end = p.time;
      prev.weeks += 1;
      prev.reachedSmma = prev.reachedSmma || atSmma;
      if (p.close < prev.lowClose) { prev.lowClose = p.close; prev.lowTime = p.time; }
    } else {
      episodes.push({
        start: p.time, end: p.time, weeks: 1,
        lowClose: p.close, lowTime: p.time,
        reachedSmma: atSmma,
        forwardReturnPct: null, peakClose: null, peakTime: null,
        ongoing: false, label: null,
      });
    }
  }

  const lastWeek = weekly[weekly.length - 1];
  for (const ep of episodes) {
    ep.label = EPISODE_LABELS[ep.lowTime.slice(0, 7)] ?? null;
    // Still running if its last touch is the most recent weekly candle.
    ep.ongoing = ep.end === lastWeek?.time;

    if (!ep.ongoing) {
      // Highest weekly close after the episode's low. Reported as history, not
      // as a forecast: an episode that has not resolved has no return to quote.
      const from = weekly.findIndex((w) => w.time === ep.lowTime);
      let peak = ep.lowClose;
      let peakTime = ep.lowTime;
      for (let i = from; i < weekly.length; i++) {
        if (weekly[i].close > peak) { peak = weekly[i].close; peakTime = weekly[i].time; }
      }
      if (peak > ep.lowClose) {
        ep.peakClose = peak;
        ep.peakTime = peakTime;
        ep.forwardReturnPct = ((peak - ep.lowClose) / ep.lowClose) * 100;
      }
    }
  }

  // ── Current status ────────────────────────────────────────────────────────
  const dEma = lastWeek ? pctFrom(lastWeek.close, lastWeek.ema200) : null;
  const dSmma = lastWeek ? pctFrom(lastWeek.close, lastWeek.smma230) : null;
  const atSmmaNow = dSmma != null && dSmma <= TOUCH_TOLERANCE * 100;
  const atEmaNow = dEma != null && dEma <= TOUCH_TOLERANCE * 100;

  // ── Conditions ────────────────────────────────────────────────────────────
  // A count of independent things that are true right now. Deliberately not
  // called confidence: four booleans agreeing is not a probability, and dressing
  // it as one would claim precision that does not exist.
  const conditions: ZoneCondition[] = [
    {
      label: 'Price at or below the weekly 200 EMA',
      met: atEmaNow,
      detail: dEma == null ? 'Not enough history' : `${dEma >= 0 ? '+' : ''}${dEma.toFixed(2)}% vs the 200 EMA`,
    },
    {
      label: 'Price at or below the weekly 230 SMMA',
      met: atSmmaNow,
      detail: dSmma == null ? 'Not enough history' : `${dSmma >= 0 ? '+' : ''}${dSmma.toFixed(2)}% vs the 230 SMMA`,
    },
    {
      label: 'Sentiment in extreme fear',
      met: extras.fearGreed != null && extras.fearGreed <= 25,
      detail: extras.fearGreed == null ? 'Unavailable' : `Fear & Greed at ${extras.fearGreed}`,
    },
    {
      label: 'Cycle Score in the accumulation band',
      met: extras.cycleScore != null && extras.cycleScore < 25,
      detail: extras.cycleScore == null ? 'Unavailable' : `Skyline Cycle Score at ${Math.round(extras.cycleScore)}`,
    },
  ];

  const met = conditions.filter((c) => c.met).length;

  return {
    weekly,
    current: {
      time: lastWeek?.time ?? '',
      close: lastWeek?.close ?? 0,
      ema200: lastWeek?.ema200 ?? null,
      smma230: lastWeek?.smma230 ?? null,
      distanceToEmaPct: dEma,
      distanceToSmmaPct: dSmma,
      inZone: atEmaNow || atSmmaNow,
      depth: atSmmaNow ? 'at-smma' : atEmaNow ? 'at-ema' : 'outside',
    },
    episodes,
    conditions,
    alignmentPct: Math.round((met / conditions.length) * 100),
  };
}
