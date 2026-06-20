import type { PricePoint } from '@/lib/api/coinmetrics';

export type Regime = 'bull' | 'bear' | 'neutral';

export type RegimePoint = {
  time:        string;
  ts:          number;    // ms timestamp for recharts log-scale X axis
  price:       number;
  ma200:       number | null;
  regime:      Regime;
  regimeStart: string;    // start date of the current contiguous regime span
};

export type RegimeZone = {
  start:       string;
  end:         string;
  startTs:     number;
  endTs:       number;
  regime:      Regime;
  durationDays: number;
  startPrice:  number;
  endPrice:    number;
  returnPct:   number;
  ongoing:     boolean;
};

export type RegimeCurrent = {
  regime:        Regime;
  daysInRegime:  number;
  priceVsMA200:  number | null;  // % above/below MA200
  ma200Direction: 'rising' | 'falling' | 'flat';
  confidencePct: number;         // 0–100, strength of the signal
  price:         number | null;
  ma200:         number | null;
};

export type RegimeResult = {
  points:  RegimePoint[];
  zones:   RegimeZone[];
  current: RegimeCurrent;
};

// ── SMA ──────────────────────────────────────────────────────────────────────

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

// ── Regime classification ─────────────────────────────────────────────────────
// Bull  = price above rising 200DMA  (slope over 30d > 0)
// Bear  = price below falling 200DMA (slope over 30d < 0)
// Neutral = everything else (early data or ambiguous crossover)

export function computeRegime(prices: PricePoint[]): RegimeResult {
  const closes   = prices.map((d) => d.price);
  const ma200Arr = sma(closes, 200);

  // Build regime-per-day array
  const rawRegimes: Regime[] = closes.map((price, i) => {
    const ma200 = ma200Arr[i];
    if (ma200 == null || i < 230) return 'neutral';
    const ma200Past = ma200Arr[i - 30] ?? null;
    const slope     = ma200Past != null ? ma200 - ma200Past : 0;
    if (price > ma200 && slope > 0) return 'bull';
    if (price < ma200 && slope < 0) return 'bear';
    return 'neutral';
  });

  // Track the start of each contiguous regime span
  const regimeStarts: string[] = [];
  let currentStart = prices[0]?.time ?? '';
  let prevRegime   = rawRegimes[0] ?? 'neutral';
  for (let i = 0; i < prices.length; i++) {
    if (rawRegimes[i] !== prevRegime) {
      currentStart = prices[i].time;
      prevRegime   = rawRegimes[i];
    }
    regimeStarts.push(currentStart);
  }

  // Build final points array
  const points: RegimePoint[] = prices.map((d, i) => ({
    time:        d.time,
    ts:          new Date(d.time + 'T00:00:00').getTime(),
    price:       d.price,
    ma200:       ma200Arr[i],
    regime:      rawRegimes[i],
    regimeStart: regimeStarts[i],
  }));

  // Group into contiguous zones
  const zones: RegimeZone[] = [];
  if (points.length > 0) {
    let zStart = 0;
    for (let i = 1; i <= points.length; i++) {
      const isLast    = i === points.length;
      const changed   = !isLast && points[i].regime !== points[zStart].regime;
      if (changed || isLast) {
        const zEnd = isLast ? i - 1 : i - 1;
        const sp   = points[zStart].price;
        const ep   = points[zEnd].price;
        zones.push({
          start:        points[zStart].time,
          end:          points[zEnd].time,
          startTs:      points[zStart].ts,
          endTs:        points[zEnd].ts,
          regime:       points[zStart].regime,
          durationDays: zEnd - zStart + 1,
          startPrice:   sp,
          endPrice:     ep,
          returnPct:    sp > 0 ? ((ep - sp) / sp) * 100 : 0,
          ongoing:      isLast,
        });
        if (!isLast) zStart = i;
      }
    }
  }

  // Current stats
  const last     = points[points.length - 1];
  const lastZone = zones[zones.length - 1];
  const ma200Now = last?.ma200 ?? null;
  const pricePct = ma200Now && ma200Now > 0
    ? ((last.price - ma200Now) / ma200Now) * 100
    : null;

  const ma200Slope30 = (() => {
    const i    = points.length - 1;
    const now  = ma200Arr[i];
    const past = ma200Arr[Math.max(0, i - 30)];
    if (now == null || past == null) return 0;
    return now - past;
  })();

  const ma200Direction: RegimeCurrent['ma200Direction'] =
    ma200Slope30 > 150 ? 'rising' : ma200Slope30 < -150 ? 'falling' : 'flat';

  // Confidence: driven by distance from MA200 and slope strength
  const confidencePct = Math.min(100, Math.round(
    Math.abs(pricePct ?? 0) * 2.5 + Math.abs(ma200Slope30) / 200,
  ));

  return {
    points,
    zones,
    current: {
      regime:        last?.regime ?? 'neutral',
      daysInRegime:  lastZone?.durationDays ?? 0,
      priceVsMA200:  pricePct,
      ma200Direction,
      confidencePct,
      price:         last?.price ?? null,
      ma200:         ma200Now,
    },
  };
}

// ── Helpers for display ───────────────────────────────────────────────────────

export const REGIME_COLOR: Record<Regime, string> = {
  bull:    '#35D07F',
  bear:    '#FF5C5C',
  neutral: '#6F7A86',
};

export const REGIME_FILL: Record<Regime, string> = {
  bull:    'rgba(53,208,127,0.10)',
  bear:    'rgba(255,92,92,0.10)',
  neutral: 'rgba(139,148,158,0.06)',
};

export const REGIME_LABEL: Record<Regime, string> = {
  bull:    'Bull Market',
  bear:    'Bear Market',
  neutral: 'Transition',
};

export function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function fmtReturn(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}
