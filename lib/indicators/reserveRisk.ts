import type { ReserveRiskRaw } from '@/lib/api/coinmetrics';

export type RRPoint = {
  time: string;
  price: number | null;
  reserveRisk: number | null;
};

export type RRZones = {
  accumulate:   number; // P30 — below = historically cheapest
  caution:      number; // P65 — above = elevated risk
  distribution: number; // P85 — above = late-cycle danger
};

export type RRResult = {
  points:    RRPoint[];
  zones:     RRZones;
  current:   { reserveRisk: number | null; price: number | null };
  trend:     'Improving' | 'Deteriorating' | 'Neutral';
  available: boolean;
};

// HODL Bank grows each day by the number of BTC not moved in the past year.
// Reserve Risk = Price / (hodlBank / CALIBRATION)
// CALIBRATION is tuned so values land in the 0.001–0.005 range historically.
const CALIBRATION = 1_000;

export function computeReserveRisk(raw: ReserveRiskRaw[]): RRResult {
  let hodlBank = 0;
  const rrValues: number[] = [];

  const points: RRPoint[] = raw.map((d) => {
    const dormant =
      d.splyCur != null && d.splyAct1yr != null
        ? d.splyCur - d.splyAct1yr
        : null;

    if (dormant != null && dormant > 0) hodlBank += dormant;

    const rr =
      d.price != null && dormant != null && hodlBank > 0
        ? d.price / (hodlBank / CALIBRATION)
        : null;

    if (rr != null) rrValues.push(rr);

    return { time: d.time, price: d.price, reserveRisk: rr };
  });

  const available = rrValues.length > 100;

  // Percentile thresholds — dynamic so zones stay meaningful across cycles
  const sorted = [...rrValues].sort((a, b) => a - b);
  const pct = (p: number) =>
    sorted.length > 0 ? (sorted[Math.floor(sorted.length * p)] ?? 0) : 0;

  const zones: RRZones = {
    accumulate:   pct(0.30),
    caution:      pct(0.65),
    distribution: pct(0.85),
  };

  // Current value (last non-null)
  const reversed = [...points].reverse();
  const curRR    = reversed.find((p) => p.reserveRisk != null)?.reserveRisk ?? null;
  const curPrice = reversed.find((p) => p.price != null)?.price ?? null;

  // Trend: compare current RR to 30-point moving average of RR
  const rrWithValues = points.filter((p) => p.reserveRisk != null);
  const recentRR     = rrWithValues.slice(-30).map((p) => p.reserveRisk!);
  const ma30         = recentRR.length > 0
    ? recentRR.reduce((s, v) => s + v, 0) / recentRR.length
    : null;

  let trend: RRResult['trend'] = 'Neutral';
  if (curRR != null && ma30 != null) {
    if (curRR < ma30 * 0.97)  trend = 'Improving';
    else if (curRR > ma30 * 1.03) trend = 'Deteriorating';
  }

  return {
    points,
    zones,
    current: { reserveRisk: curRR, price: curPrice },
    trend,
    available,
  };
}

export function rrSignal(
  rr: number | null,
  zones: RRZones,
): { label: string; color: string } {
  if (rr == null) return { label: '—', color: 'var(--sct-muted)' };
  if (rr < zones.accumulate)   return { label: 'Favorable · Long-Term Entry Zone',  color: '#3B82F6' };
  if (rr < zones.caution)      return { label: 'Neutral · Mid-Cycle Expansion',      color: '#35D07F' };
  if (rr < zones.distribution) return { label: 'Caution · Elevated Cycle Risk',      color: '#E6B450' };
  return                              { label: 'Late-Cycle Risk · Protect Gains',    color: '#FF5C5C' };
}
