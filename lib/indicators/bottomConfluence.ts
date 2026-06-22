import type { MVRVDataPoint, HashRibbonRaw, ExchangeReservePoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SignalStatus = 'confirmed' | 'developing' | 'inactive';

export type BottomConfluencePoint = {
  time:   string;
  ts:     number;
  btcClose: number;

  // Signal 1: Supply in Profit proxy via MVRV
  // MVRV < 1.0 ≈ majority of supply underwater
  mvrv:           number;
  supplyStatus:   SignalStatus;

  // Signal 2: Hash Ribbon (30D/60D MA crossover)
  // 30D MA < 60D MA = miner capitulation
  hr30d:          number | null;
  hr60d:          number | null;
  hrRatio:        number | null;   // hr30d / hr60d
  hashStatus:     SignalStatus;

  // Signal 3: 2Y Cost Basis proxy via 730-day SMA
  // Price < 2Y MA = recent buyers underwater
  ma2y:           number | null;
  priceTo2y:      number | null;   // price / ma2y
  twoYStatus:     SignalStatus;

  // Signal 4: LTH Accumulation proxy via exchange supply flow
  // Exchange % falling = coins to cold storage = accumulation
  exchPct:        number | null;
  exchChange30d:  number | null;   // pp change in exchange %
  lthStatus:      SignalStatus;

  // Composite
  confluenceScore: number;   // 0.0–4.0 (each signal worth 1.0 if confirmed, 0.5 if developing)
};

export type ConfluencePeriod = {
  x1:       number;   // start timestamp
  x2:       number;   // end timestamp
  label:    string;
  maxScore: number;
  color:    string;
};

export type ConfluenceEvent = {
  time:       string;
  ts:         number;
  btcPrice:   number;
  score:      number;
  ret1y:      number | null;   // % return 1 year later
  ret2y:      number | null;   // % return 2 years later
  status:     'historical' | 'current';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function smaArr(values: (number | null)[], period: number): (number | null)[] {
  let sum = 0, count = 0;
  const out: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v != null) { sum += v; count++; }
    if (i >= period) {
      const old = values[i - period];
      if (old != null) { sum -= old; count--; }
    }
    out.push(i >= period - 1 && count === period ? sum / count : null);
  }
  return out;
}

const STATUS_POINTS: Record<SignalStatus, number> = {
  confirmed:  1.0,
  developing: 0.5,
  inactive:   0.0,
};

// ─── Build confluence point series ────────────────────────────────────────────

export function buildBottomConfluencePoints(
  mvrvData:     MVRVDataPoint[],
  hashData:     HashRibbonRaw[],
  exchangeData: ExchangeReservePoint[],
): BottomConfluencePoint[] {
  // Build lookup maps for secondary data sources
  const hashMap = new Map<string, number>();
  for (const h of hashData) {
    if (h.hashRate != null) hashMap.set(h.time, h.hashRate);
  }

  const exchMap = new Map<string, { exchBtc: number; splyCur: number }>();
  for (const e of exchangeData) {
    exchMap.set(e.time, { exchBtc: e.exchBtc, splyCur: e.splyCur });
  }

  // Sort MVRV data (primary series)
  const sorted = [...mvrvData].sort((a, b) => a.time.localeCompare(b.time));

  // Pre-compute rolling arrays over the sorted primary series
  const prices   = sorted.map((d) => d.price);
  const ma2yArr  = smaArr(prices, 730);  // 2-year MA

  const hrRaw    = sorted.map((d) => hashMap.get(d.time) ?? null);
  const hr30dArr = smaArr(hrRaw, 30);
  const hr60dArr = smaArr(hrRaw, 60);

  // Exchange % and its 30D change
  const exchPctRaw = sorted.map((d) => {
    const e = exchMap.get(d.time);
    if (!e || e.splyCur === 0) return null;
    return (e.exchBtc / e.splyCur) * 100;
  });

  // Build result
  const out: BottomConfluencePoint[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const d       = sorted[i];
    const ts      = new Date(d.time + 'T00:00:00').getTime();
    const price   = d.price;
    const mvrv    = d.mvrv;

    // --- Signal 1: MVRV proxy ---
    // MVRV < 1.0 → price below average realized price → majority of supply at loss
    const supplyStatus: SignalStatus =
      mvrv < 1.0  ? 'confirmed'  :
      mvrv < 1.5  ? 'developing' :
                    'inactive';

    // --- Signal 2: Hash Ribbon ---
    const hr30d  = hr30dArr[i];
    const hr60d  = hr60dArr[i];
    const hrRatio = (hr30d != null && hr60d != null && hr60d > 0) ? hr30d / hr60d : null;
    const hashStatus: SignalStatus =
      hrRatio == null  ? 'inactive'   :
      hrRatio < 1.0    ? 'confirmed'  :
      hrRatio < 1.03   ? 'developing' :
                         'inactive';

    // --- Signal 3: 2Y Cost Basis ---
    // 2Y MA of price ≈ average entry price of recent 2-year buyers
    const ma2y = ma2yArr[i];
    const priceTo2y = (ma2y != null && ma2y > 0) ? price / ma2y : null;
    const twoYStatus: SignalStatus =
      priceTo2y == null ? 'inactive'   :
      priceTo2y < 1.0   ? 'confirmed'  :   // price below 2Y MA
      priceTo2y < 1.1   ? 'developing' :   // within 10% above 2Y MA
                          'inactive';

    // --- Signal 4: LTH Accumulation (exchange supply flow) ---
    const exchPct    = exchPctRaw[i];
    const exchPct30  = i >= 30 ? exchPctRaw[i - 30] : null;
    const exchCh30d  = (exchPct != null && exchPct30 != null) ? exchPct - exchPct30 : null;

    const lthStatus: SignalStatus =
      exchCh30d == null ? 'inactive'   :
      exchCh30d < -0.15 ? 'confirmed'  :   // clearly falling (accumulation)
      exchCh30d < +0.10 ? 'developing' :   // roughly flat
                          'inactive';

    // --- Confluence score ---
    const confluenceScore =
      STATUS_POINTS[supplyStatus] +
      STATUS_POINTS[hashStatus]   +
      STATUS_POINTS[twoYStatus]   +
      STATUS_POINTS[lthStatus];

    out.push({
      time: d.time, ts, btcClose: price,
      mvrv, supplyStatus,
      hr30d, hr60d, hrRatio, hashStatus,
      ma2y, priceTo2y, twoYStatus,
      exchPct, exchChange30d: exchCh30d, lthStatus,
      confluenceScore,
    });
  }

  return out;
}

// ─── Detect confluence periods (for chart shading) ────────────────────────────

export function findConfluencePeriods(points: BottomConfluencePoint[]): ConfluencePeriod[] {
  const MIN_SCORE  = 2.0;   // at least 2/4 signals active
  const MIN_DAYS   = 14;    // persist for at least 2 weeks
  const periods: ConfluencePeriod[] = [];

  let start: BottomConfluencePoint | null = null;
  let maxScore = 0;
  let runLen   = 0;

  for (const p of points) {
    if (p.confluenceScore >= MIN_SCORE) {
      if (!start) start = p;
      maxScore = Math.max(maxScore, p.confluenceScore);
      runLen++;
    } else {
      if (start && runLen >= MIN_DAYS) {
        periods.push({
          x1:    start.ts,
          x2:    p.ts,
          label: maxScore >= 3.5 ? 'Full Confluence' : 'Partial Confluence',
          maxScore,
          color: maxScore >= 3.5 ? 'rgba(53,208,127,0.10)' : 'rgba(230,180,80,0.08)',
        });
      }
      start    = null;
      maxScore = 0;
      runLen   = 0;
    }
  }
  // Close any open period at the end
  if (start && runLen >= MIN_DAYS) {
    const last = points[points.length - 1];
    periods.push({
      x1:    start.ts,
      x2:    last.ts,
      label: maxScore >= 3.5 ? 'Full Confluence' : 'Partial Confluence',
      maxScore,
      color: maxScore >= 3.5 ? 'rgba(53,208,127,0.10)' : 'rgba(230,180,80,0.08)',
    });
  }
  return periods;
}

// ─── Detect peak confluence events (for returns table) ───────────────────────

export function findConfluenceEvents(points: BottomConfluencePoint[]): ConfluenceEvent[] {
  const MIN_SCORE = 2.5;
  const MIN_GAP   = 180;   // require 180-day gap between events
  const events: ConfluenceEvent[] = [];

  // Build price map for forward-return lookups
  const priceByTs = new Map<number, number>();
  for (const p of points) priceByTs.set(p.ts, p.btcClose);

  // Find all days at MIN_SCORE, then keep only the day with the highest score
  // within each 180-day window (deduplication)
  let lastEventTs = 0;

  for (const p of points) {
    if (p.confluenceScore < MIN_SCORE) continue;
    if (p.ts - lastEventTs < MIN_GAP * 86_400_000) continue;

    // Confirm this is a local peak within the next 30 days
    const peakInWindow = points
      .filter((q) => q.ts >= p.ts && q.ts < p.ts + 30 * 86_400_000)
      .reduce((best, q) => q.confluenceScore > best.confluenceScore ? q : best, p);

    if (peakInWindow !== p) continue;

    // Forward returns
    const ts1y = p.ts + 365 * 86_400_000;
    const ts2y = p.ts + 730 * 86_400_000;
    const p1y  = priceByTs.get(ts1y) ?? findNearest(points, ts1y)?.btcClose;
    const p2y  = priceByTs.get(ts2y) ?? findNearest(points, ts2y)?.btcClose;

    const ret1y = p1y != null ? ((p1y - p.btcClose) / p.btcClose) * 100 : null;
    const ret2y = p2y != null ? ((p2y - p.btcClose) / p.btcClose) * 100 : null;

    events.push({
      time:     p.time,
      ts:       p.ts,
      btcPrice: p.btcClose,
      score:    p.confluenceScore,
      ret1y,
      ret2y,
      status:   (Date.now() - p.ts < 90 * 86_400_000) ? 'current' : 'historical',
    });

    lastEventTs = p.ts;
  }

  return events.slice(-8);   // keep last 8 events max
}

function findNearest(
  points: BottomConfluencePoint[],
  targetTs: number,
): BottomConfluencePoint | null {
  let best: BottomConfluencePoint | null = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(p.ts - targetTs);
    if (diff < bestDiff) { best = p; bestDiff = diff; }
  }
  return bestDiff < 15 * 86_400_000 ? best : null;  // only within 15 days
}

// ─── Regime label ─────────────────────────────────────────────────────────────

export function getConfluenceLabel(score: number): {
  label: string;
  color: string;
  sublabel: string;
} {
  if (score >= 3.5) return {
    label: 'Full Historical Confluence',
    color: '#35D07F',
    sublabel: 'All four on-chain stress signals aligning simultaneously. Historically rare.',
  };
  if (score >= 2.5) return {
    label: 'Strong Bottoming Environment',
    color: '#3B82F6',
    sublabel: '3 of 4 signals active. Significant on-chain stress visible across multiple indicators.',
  };
  if (score >= 1.5) return {
    label: 'Stress Building / Watchlist',
    color: '#E6B450',
    sublabel: '2 of 4 signals developing. Worth monitoring but not historically high-confidence.',
  };
  return {
    label: 'No Bottom Confluence',
    color: '#FF5C5C',
    sublabel: 'Fewer than 2 signals active. No significant on-chain stress alignment detected.',
  };
}

// ─── Historical reference events ──────────────────────────────────────────────

export const BOTTOM_EVENTS = [
  { time: '2015-01-14', label: '2015 Low',  color: '#35D07F' },
  { time: '2018-12-15', label: '2018 Low',  color: '#35D07F' },
  { time: '2020-03-13', label: 'COVID',     color: '#F2B84B' },
  { time: '2022-11-21', label: '2022 Low',  color: '#35D07F' },
];

export const HALVINGS_BOTTOM = [
  { ts: new Date('2012-11-28').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19').getTime(), label: 'H4' },
];

// ─── Signal timeline (sequence in which signals activated) ───────────────────

export type TimelineEvent = {
  signal: string;
  date:   string;
  status: SignalStatus;
};

export function getSignalTimeline(points: BottomConfluencePoint[]): TimelineEvent[] {
  // Walk backwards from the most recent point to find when each signal
  // last became "confirmed" for the current (or most recent) confluence period
  const last = points[points.length - 1];
  if (!last || last.confluenceScore < 1.0) return [];

  const activations: TimelineEvent[] = [];

  const signals: Array<{ name: string; getStatus: (p: BottomConfluencePoint) => SignalStatus }> = [
    { name: 'MVRV below 1.5 (supply stress)',  getStatus: (p) => p.supplyStatus },
    { name: 'Hash Ribbon capitulation',          getStatus: (p) => p.hashStatus   },
    { name: 'Price below 2Y cost basis',         getStatus: (p) => p.twoYStatus   },
    { name: 'Exchange supply declining',          getStatus: (p) => p.lthStatus    },
  ];

  for (const sig of signals) {
    // Find the most recent activation (transition from inactive → confirmed/developing)
    for (let i = points.length - 1; i > 0; i--) {
      const cur  = points[i];
      const prev = points[i - 1];
      const curStatus  = sig.getStatus(cur);
      const prevStatus = sig.getStatus(prev);

      if (
        (curStatus === 'confirmed' || curStatus === 'developing') &&
        prevStatus === 'inactive'
      ) {
        activations.push({ signal: sig.name, date: cur.time, status: curStatus });
        break;
      }
    }
  }

  return activations.sort((a, b) => a.date.localeCompare(b.date));
}
