import type { PricePoint } from '@/lib/api/coinmetrics';

// NUPL proxy using the 730-day (2-year) moving average as a realized price substitute.
// True NUPL needs CapRealUSD which is paywalled on the CoinMetrics Community tier.
// The 2YMA closely tracks the realized price and is used as a LTH cost-basis proxy
// by Plan B, Benjamin Cowen, and others — values land in the same zone ranges.
//
// Formula: NUPL_proxy = (Price - MA730) / Price
//   < 0    Capitulation  — price below 2YMA, holders in aggregate loss
//   0–0.35 Hope          — early recovery above cost basis
//   0.35–0.60 Optimism   — mid-cycle expansion
//   0.60–0.75 Belief     — late cycle, elevated unrealized gains
//   > 0.75 Euphoria      — historically corresponds to cycle tops

export type NUPLPoint = {
  time:  string;
  ts:    number;
  price: number;
  nupl:  number | null;
};

export type NUPLResult = {
  points:    NUPLPoint[];
  current:   { nupl: number | null; price: number | null; ma730: number | null };
  available: boolean;
};

const WINDOW = 730;

export function computeNUPL(prices: PricePoint[]): NUPLResult {
  const clean = prices.filter((p) => p.price > 0);

  const points: NUPLPoint[] = clean.map((p, i) => {
    let ma730: number | null = null;
    if (i >= WINDOW - 1) {
      const slice = clean.slice(i - WINDOW + 1, i + 1);
      ma730 = slice.reduce((s, d) => s + d.price, 0) / slice.length;
    }
    const nupl = ma730 != null ? +((p.price - ma730) / p.price).toFixed(4) : null;
    return { time: p.time, ts: new Date(p.time + 'T00:00:00').getTime(), price: p.price, nupl };
  });

  const available = points.filter((p) => p.nupl != null).length > 100;

  const reversed = [...points].reverse();
  const last     = reversed.find((p) => p.nupl != null);
  const lastMa   = last ? (() => {
    const idx = clean.findIndex((p) => p.time === last.time);
    if (idx < WINDOW - 1) return null;
    const slice = clean.slice(idx - WINDOW + 1, idx + 1);
    return slice.reduce((s, d) => s + d.price, 0) / slice.length;
  })() : null;

  return {
    points,
    current: { nupl: last?.nupl ?? null, price: last?.price ?? null, ma730: lastMa },
    available,
  };
}

export function nuplSignal(nupl: number | null): { label: string; color: string; zone: string } {
  if (nupl == null)  return { label: '—',                               color: 'var(--sct-muted)', zone: 'Unknown'      };
  if (nupl < 0)      return { label: 'Capitulation · Extreme Buy Zone', color: '#3B82F6',          zone: 'Capitulation' };
  if (nupl < 0.35)   return { label: 'Hope · Early Recovery',           color: '#35D07F',          zone: 'Hope'         };
  if (nupl < 0.60)   return { label: 'Optimism · Mid-Cycle',            color: '#A3E635',          zone: 'Optimism'     };
  if (nupl < 0.75)   return { label: 'Belief · Late Cycle Risk',        color: '#E6B450',          zone: 'Belief'       };
  return                    { label: 'Euphoria · Cycle Top Territory',  color: '#FF5C5C',          zone: 'Euphoria'     };
}
