// Bitcoin Power Law Model — Giovanni Santostasi / MCO Legacy parameters
// log10(P_fair) = SLOPE × log10(days_since_genesis) + INTERCEPT

export const GENESIS_MS  = new Date('2009-01-03T00:00:00Z').getTime();
const SLOPE              = 5.82;
const INTERCEPT          = -16.73;
export const FLOOR_MULT  = 0.42;
export const CEIL_MULT   = 4.27;

export type PowerLawPoint = {
  time:    string;
  ts:      number;
  price:   number | null;   // null for future projection points
  fair:    number;
  floor:   number;
  ceil:    number;
};

export type PowerLawStats = {
  price:       number;
  fair:        number;
  floor:       number;
  ceil:        number;
  pctVsFair:   number;       // (price - fair) / fair × 100
  leadFloor:   number;       // years until floor reaches current price (+ = future)
  leadCeil:    number;       // years until ceiling reaches current price (neg = past)
  zone:        'above_ceil' | 'above_fair' | 'below_fair' | 'below_floor';
};

// ── Core formula ──────────────────────────────────────────────────────────────

export function plFair(tsMs: number): number {
  const days = (tsMs - GENESIS_MS) / 86_400_000;
  if (days <= 0) return NaN;
  return Math.pow(10, SLOPE * Math.log10(days) + INTERCEPT);
}

export function plFloor(tsMs: number): number { return plFair(tsMs) * FLOOR_MULT; }
export function plCeil(tsMs:  number): number { return plFair(tsMs) * CEIL_MULT;  }

// Date (in days since genesis) when fair×mult = targetPrice
function daysWhenLineReaches(targetPrice: number, lineMult: number): number {
  // targetPrice = 10^(SLOPE × log10(D) + INTERCEPT + log10(mult))
  const logD = (Math.log10(targetPrice) - INTERCEPT - Math.log10(lineMult)) / SLOPE;
  return Math.pow(10, logD);
}

export function computeStats(price: number, nowMs: number): PowerLawStats {
  const fair  = plFair(nowMs);
  const floor = fair * FLOOR_MULT;
  const ceil  = fair * CEIL_MULT;

  const dFloor = daysWhenLineReaches(price, FLOOR_MULT);
  const dCeil  = daysWhenLineReaches(price, CEIL_MULT);
  const msFloor = GENESIS_MS + dFloor * 86_400_000;
  const msCeil  = GENESIS_MS + dCeil  * 86_400_000;

  const leadFloor = (msFloor - nowMs) / (365.25 * 86_400_000);
  const leadCeil  = (msCeil  - nowMs) / (365.25 * 86_400_000);

  const zone: PowerLawStats['zone'] =
    price > ceil  ? 'above_ceil'  :
    price > fair  ? 'above_fair'  :
    price > floor ? 'below_fair'  :
                    'below_floor';

  return { price, fair, floor, ceil, pctVsFair: ((price - fair) / fair) * 100, leadFloor, leadCeil, zone };
}

// ── Build chart data ──────────────────────────────────────────────────────────

export function buildPowerLawData(
  prices: { time: string; price: number }[],
  projectionYears = 2,
): PowerLawPoint[] {
  const historical: PowerLawPoint[] = prices.map(p => {
    const ts = new Date(p.time + 'T00:00:00Z').getTime();
    return { time: p.time, ts, price: p.price, fair: plFair(ts), floor: plFloor(ts), ceil: plCeil(ts) };
  });

  // Weekly projection points past the last data point
  const lastTs = historical.at(-1)?.ts ?? Date.now();
  const endMs  = lastTs + projectionYears * 365.25 * 86_400_000;
  const future: PowerLawPoint[] = [];
  for (let ts = lastTs + 7 * 86_400_000; ts <= endMs; ts += 7 * 86_400_000) {
    const d = new Date(ts);
    const time = d.toISOString().slice(0, 10);
    future.push({ time, ts, price: null, fair: plFair(ts), floor: plFloor(ts), ceil: plCeil(ts) });
  }

  return [...historical, ...future];
}
