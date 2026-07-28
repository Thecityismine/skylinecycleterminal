import { addDays, type CycleWindow } from '@/lib/cycles/durationModel';

export type AnchorMode = 'fixed' | 'confirmed' | 'manual';

type PricePoint = { time: string; ts: number; price: number };

export type ConfirmedLowResult = {
  confirmed: boolean;
  date: string | null;
  price: number | null;
  ruleDetail: string;
};

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Rule-based major-low detector: scans weekly closes from `searchStartDate`
// forward for a trailing-365-day low, then requires price to have reclaimed
// the 20W MA before calling it confirmed. This intentionally mirrors a
// simplified version of the spec's 4-part rule (365d low + 20W reclaim) —
// Heikin-Ashi and Skyline Score confirmation are shown separately in the
// Bottom Confirmation panel rather than gating the anchor itself.
export function detectConfirmedLow(prices: PricePoint[], searchStartDate: string): ConfirmedLowResult {
  const startTs = new Date(searchStartDate + 'T00:00:00Z').getTime();

  const weekly: PricePoint[] = [];
  for (let i = prices.length - 1; i >= 0; i -= 7) weekly.unshift(prices[i]);

  let lowIdx = -1;
  for (let i = 0; i < weekly.length; i++) {
    if (weekly[i].ts < startTs) continue;
    const windowStart = Math.max(0, i - 52);
    const trailingMin = Math.min(...weekly.slice(windowStart, i + 1).map((w) => w.price));
    if (weekly[i].price <= trailingMin) lowIdx = i;
  }

  if (lowIdx === -1) {
    return { confirmed: false, date: null, price: null, ruleDetail: 'No qualifying 365-day low found yet since the model window opened' };
  }

  const lowPoint = weekly[lowIdx];
  const closes = weekly.map((w) => w.price);
  const ma20 = sma(closes, 20);
  const latest = closes.at(-1) ?? null;
  const reclaimed = ma20 != null && latest != null && latest > ma20;

  return {
    confirmed: reclaimed,
    date: lowPoint.time,
    price: lowPoint.price,
    ruleDetail: reclaimed
      ? `365-day low on ${lowPoint.time}, price has since reclaimed the 20W MA`
      : `365-day low on ${lowPoint.time}, awaiting 20W MA reclaim`,
  };
}

// Re-anchors the fully-projected next cycle (the one after the current
// in-progress cycle) onto whatever date the selected mode implies. Fixed
// mode leaves the model dates untouched; confirmed/manual only take effect
// once they resolve to an actual date, otherwise the fixed model is kept.
export function applyAnchorOverride(
  cycles: CycleWindow[],
  mode: AnchorMode,
  confirmedLow: ConfirmedLowResult,
  manualDate: string,
): CycleWindow[] {
  const nextIdx = cycles.findIndex((c) => c.status === 'projected');
  if (nextIdx === -1) return cycles;

  let overrideDate: string | null = null;
  let overridePrice: number | null = null;
  if (mode === 'confirmed' && confirmedLow.confirmed && confirmedLow.date) {
    overrideDate = confirmedLow.date;
    overridePrice = confirmedLow.price;
  }
  if (mode === 'manual' && manualDate) {
    overrideDate = manualDate;
  }
  if (!overrideDate) return cycles;

  const next = cycles[nextIdx];
  const updated: CycleWindow = {
    ...next,
    lowDate: overrideDate,
    lowPrice: overridePrice,
    projectedHighDate: addDays(overrideDate, next.bullDays),
    projectedLowDate: addDays(overrideDate, next.bullDays + next.bearDays),
  };

  const out = [...cycles];
  out[nextIdx] = updated;
  return out;
}
