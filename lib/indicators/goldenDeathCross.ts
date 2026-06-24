// ── Types ──────────────────────────────────────────────────────────────────

export type CrossType = 'golden' | 'death';

export type CrossEvent = {
  time:       string;
  ts:         number;
  type:       CrossType;
  price:      number;
  ma50:       number;
  ma200:      number;
  confirmed:  boolean; // maintained for 10+ days
  return90d?: number | null; // % BTC return 90 calendar days after cross
};

export type CrossRegime =
  | 'golden_confirmed'
  | 'golden_developing'
  | 'death_confirmed'
  | 'death_developing'
  | 'neutral';

export type RegimeInfo = {
  key:         CrossRegime;
  label:       string;
  shortLabel:  string;
  color:       string;
  description: string;
  posture:     string;
};

export const REGIMES: Record<CrossRegime, RegimeInfo> = {
  golden_confirmed: {
    key:         'golden_confirmed',
    label:       'Golden Cross Confirmed',
    shortLabel:  'Golden Cross',
    color:       '#35D07F',
    description: '50D is above the 200D and the cross has been maintained. Medium-term trend is constructive.',
    posture:     'Trend is bullish. Watch for spread compression as a warning signal.',
  },
  golden_developing: {
    key:         'golden_developing',
    label:       'Golden Cross Developing',
    shortLabel:  'Golden Dev.',
    color:       '#E6B450',
    description: '50D has recently crossed above the 200D but the cross is still fresh (< 10 days). Confirmation pending.',
    posture:     'Wait for confirmation. False cross risk elevated in volatile regimes.',
  },
  death_confirmed: {
    key:         'death_confirmed',
    label:       'Death Cross Confirmed',
    shortLabel:  'Death Cross',
    color:       '#F85149',
    description: '50D is below the 200D and the cross has been maintained. Medium-term trend is bearish.',
    posture:     'Trend is bearish. A recovery above both MAs required to reassess.',
  },
  death_developing: {
    key:         'death_developing',
    label:       'Death Cross Developing',
    shortLabel:  'Death Dev.',
    color:       '#E6823A',
    description: '50D has recently crossed below the 200D but not yet confirmed. May be a false break.',
    posture:     'Monitor closely. A quick recross above would invalidate.',
  },
  neutral: {
    key:         'neutral',
    label:       'Neutral / Compression',
    shortLabel:  'Neutral',
    color:       '#8B949E',
    description: 'The 50D and 200D are converging or closely aligned. No dominant trend signal.',
    posture:     'Directional signal unclear. Wait for separation.',
  },
};

// ── SMA calculation ─────────────────────────────────────────────────────────

export function calculateSMA(
  prices: number[],
  period: number
): (number | null)[] {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j];
    return sum / period;
  });
}

// ── Weekly aggregation (Friday close or last available close of ISO week) ───

export function toWeeklyCloses(
  points: { time: string; price: number }[]
): { time: string; ts: number; close: number }[] {
  const map = new Map<string, { time: string; ts: number; close: number }>();
  for (const p of points) {
    const d = new Date(p.time + 'T00:00:00Z');
    // ISO week Monday
    const day = d.getUTCDay() || 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - (day - 1));
    const key = monday.toISOString().slice(0, 10);
    // last record in the week wins (Friday close)
    map.set(key, {
      time:  p.time,
      ts:    d.getTime(),
      close: p.price,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.ts - b.ts);
}

// ── Cross detection ─────────────────────────────────────────────────────────

const CONFIRM_DAYS = 10;

export function detectCrosses(
  points: { time: string; ts: number; price: number; ma50: number | null; ma200: number | null }[]
): CrossEvent[] {
  const crosses: CrossEvent[] = [];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (prev.ma50 === null || prev.ma200 === null || curr.ma50 === null || curr.ma200 === null) continue;

    const wasBelow = prev.ma50 <= prev.ma200;
    const isAbove  = curr.ma50 >  curr.ma200;
    const wasAbove = prev.ma50 >= prev.ma200;
    const isBelow  = curr.ma50 <  curr.ma200;

    if (wasBelow && isAbove) {
      crosses.push({ time: curr.time, ts: curr.ts, type: 'golden', price: curr.price, ma50: curr.ma50, ma200: curr.ma200, confirmed: false });
    } else if (wasAbove && isBelow) {
      crosses.push({ time: curr.time, ts: curr.ts, type: 'death',  price: curr.price, ma50: curr.ma50, ma200: curr.ma200, confirmed: false });
    }
  }

  // Mark confirmed (cross maintained for CONFIRM_DAYS)
  const priceMap = new Map(points.map((p) => [p.ts, p]));
  for (const cross of crosses) {
    const confirmTs = cross.ts + CONFIRM_DAYS * 86400_000;
    const future = points.find((p) => p.ts >= confirmTs);
    if (!future || future.ma50 === null || future.ma200 === null) continue;
    cross.confirmed =
      cross.type === 'golden'
        ? future.ma50 > future.ma200
        : future.ma50 < future.ma200;
    void priceMap; // silence unused warning
  }

  return crosses;
}

// ── 90-day return computation ────────────────────────────────────────────────

export function addReturns(
  crosses: CrossEvent[],
  points:  { ts: number; price: number }[]
): CrossEvent[] {
  const sorted = [...points].sort((a, b) => a.ts - b.ts);

  return crosses.map((cross) => {
    const target = cross.ts + 90 * 86400_000;
    const future = sorted.find((p) => p.ts >= target);
    const return90d = future
      ? +((future.price - cross.price) / cross.price * 100).toFixed(1)
      : null;
    return { ...cross, return90d };
  });
}

// ── MA slope (% change over N periods) ──────────────────────────────────────

export function maSlope(
  values: (number | null)[],
  idx:    number,
  lookback = 30
): number | null {
  if (idx < lookback) return null;
  const v1 = values[idx - lookback];
  const v2 = values[idx];
  if (v1 === null || v2 === null || v1 === 0) return null;
  return +((v2 - v1) / v1 * 100).toFixed(2);
}

// ── Regime detection ─────────────────────────────────────────────────────────

export function detectRegime(
  latestCross: CrossEvent | undefined,
  ma50:        number | null,
  ma200:       number | null,
  nowTs:       number
): CrossRegime {
  if (!ma50 || !ma200) return 'neutral';

  const spread = Math.abs(ma50 - ma200) / ma200 * 100;
  if (spread < 0.5) return 'neutral';

  if (ma50 > ma200) {
    if (!latestCross || latestCross.type !== 'golden') return 'golden_confirmed';
    const daysSince = (nowTs - latestCross.ts) / 86400_000;
    return daysSince >= CONFIRM_DAYS ? 'golden_confirmed' : 'golden_developing';
  } else {
    if (!latestCross || latestCross.type !== 'death') return 'death_confirmed';
    const daysSince = (nowTs - latestCross.ts) / 86400_000;
    return daysSince >= CONFIRM_DAYS ? 'death_confirmed' : 'death_developing';
  }
}

// ── Trend confidence score (0–100) ─────────────────────────────────────────

export type ConfidenceInputs = {
  price:      number;
  ma50:       number;
  ma200:      number;
  slope50:    number | null; // 30-day slope %
  slope200:   number | null; // 30-day slope %
  spread:     number;        // (ma50-ma200)/ma200 * 100
  return90d:  number | null; // BTC 90-day return
};

export function trendConfidenceScore(inputs: ConfidenceInputs): number {
  const { price, ma50, ma200, slope50, slope200, spread, return90d } = inputs;
  const isGolden = ma50 > ma200;

  // Price vs 200D MA (35%)
  const priceVs200 = (price - ma200) / ma200 * 100;
  const priceScore = isGolden
    ? Math.max(0, Math.min(100, (priceVs200 + 30) / 60 * 100))
    : Math.max(0, Math.min(100, (-priceVs200 + 30) / 60 * 100));

  // 50D slope (25%)
  const s50 = slope50 ?? 0;
  const slope50Score = isGolden
    ? Math.max(0, Math.min(100, (s50 + 15) / 30 * 100))
    : Math.max(0, Math.min(100, (-s50 + 15) / 30 * 100));

  // 200D slope (20%)
  const s200 = slope200 ?? 0;
  const slope200Score = isGolden
    ? Math.max(0, Math.min(100, (s200 + 8) / 16 * 100))
    : Math.max(0, Math.min(100, (-s200 + 8) / 16 * 100));

  // Spread expansion (10%)
  const absSpread = Math.abs(spread);
  const spreadScore = Math.max(0, Math.min(100, absSpread / 25 * 100));

  // 90D momentum (10%)
  const ret = return90d ?? 0;
  const momentumScore = isGolden
    ? Math.max(0, Math.min(100, (ret + 50) / 100 * 100))
    : Math.max(0, Math.min(100, (-ret + 50) / 100 * 100));

  return Math.round(
    priceScore * 0.35 +
    slope50Score * 0.25 +
    slope200Score * 0.20 +
    spreadScore * 0.10 +
    momentumScore * 0.10
  );
}

// ── Chart data point assembly ────────────────────────────────────────────────

export type CrossChartPoint = {
  time:    string;
  ts:      number;
  price:   number;
  ma50:    number | null;
  ma200:   number | null;
  spread:  number | null; // (ma50-ma200)/ma200 * 100
};

export function buildChartPoints(
  prices: { time: string; ts: number; price: number }[],
  period50  = 50,
  period200 = 200
): CrossChartPoint[] {
  const values = prices.map((p) => p.price);
  const sma50  = calculateSMA(values, period50);
  const sma200 = calculateSMA(values, period200);

  return prices.map((p, i) => {
    const m50  = sma50[i];
    const m200 = sma200[i];
    const spread = m50 !== null && m200 !== null && m200 !== 0
      ? +((m50 - m200) / m200 * 100).toFixed(3)
      : null;
    return { time: p.time, ts: p.ts, price: p.price, ma50: m50, ma200: m200, spread };
  });
}
