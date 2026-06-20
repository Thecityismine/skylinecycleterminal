import type { RealizedPricePoint } from '@/lib/api/coinmetrics';

// NUPL = (Market Cap - Realized Cap) / Market Cap
//      = (Price - Realized Price) / Price
//      = 1 - (Realized Price / Price)
//
// All data comes from CoinMetrics Community free tier via fetchBTCRealizedPrice
// (PriceUSD + CapRealUSD + SplyCur), so no paywalled metrics are required.

export type NUPLPoint = {
  time:  string;
  ts:    number;
  price: number;
  nupl:  number | null;
};

export type NUPLResult = {
  points:    NUPLPoint[];
  current:   { nupl: number | null; price: number | null };
  available: boolean;
};

export function computeNUPL(data: RealizedPricePoint[]): NUPLResult {
  const points: NUPLPoint[] = data.map((d) => ({
    time:  d.time,
    ts:    new Date(d.time + 'T00:00:00').getTime(),
    price: d.price,
    nupl:  d.realized != null && d.price > 0
      ? +((d.price - d.realized) / d.price).toFixed(4)
      : null,
  }));

  const available = points.filter((p) => p.nupl != null).length > 100;
  const last      = [...points].reverse().find((p) => p.nupl != null);

  return {
    points,
    current:   { nupl: last?.nupl ?? null, price: last?.price ?? null },
    available,
  };
}

export function nuplSignal(nupl: number | null): { label: string; color: string; zone: string } {
  if (nupl == null) return { label: '—',                               color: 'var(--sct-muted)', zone: 'Unknown'      };
  if (nupl < 0)     return { label: 'Capitulation · Extreme Buy Zone', color: '#3B82F6',          zone: 'Capitulation' };
  if (nupl < 0.25)  return { label: 'Hope · Early Accumulation',       color: '#35D07F',          zone: 'Hope'         };
  if (nupl < 0.50)  return { label: 'Optimism · Mid-Cycle',            color: '#A3E635',          zone: 'Optimism'     };
  if (nupl < 0.75)  return { label: 'Belief · Late Cycle Risk',        color: '#E6B450',          zone: 'Belief'       };
  return                   { label: 'Euphoria · Cycle Top Territory',  color: '#FF5C5C',          zone: 'Euphoria'     };
}
