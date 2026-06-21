// ─── Types ────────────────────────────────────────────────────────────────────

export type RawPoint = {
  time: string;
  price: number;
  splyCur: number | null;
  capRealUSD: number | null;
  cdd: number | null;
};

export type CycleMasterPoint = {
  time: string;
  ts: number;
  price: number;
  realized: number | null;
  transferred: number | null;
  terminal: number | null;
  balance: number | null;
  cdd: number | null;
  cdd90: number | null; // 90-day SMA of CDD
};

export type CycleZone =
  | 'capitulation'
  | 'accumulation'
  | 'expansion'
  | 'elevated'
  | 'distribution';

export type CycleMasterScore = {
  score: number;   // 0–100
  zone: CycleZone;
  label: string;
  color: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function sma(arr: (number | null)[], window: number, idx: number): number | null {
  if (idx < window - 1) return null;
  let sum = 0;
  let count = 0;
  for (let i = idx - window + 1; i <= idx; i++) {
    const v = arr[i];
    if (v != null) { sum += v; count++; }
  }
  return count > 0 ? sum / count : null;
}

// ─── Computation ──────────────────────────────────────────────────────────────

export function computeCycleMaster(raw: RawPoint[]): CycleMasterPoint[] {
  const cddArr: (number | null)[] = raw.map((r) => r.cdd);

  // Cumulative CDD running sum
  let cumulativeCDD = 0;

  const out: CycleMasterPoint[] = [];

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];

    // Accumulate CDD
    if (r.cdd != null) cumulativeCDD += r.cdd;

    const sply = r.splyCur;
    const capReal = r.capRealUSD;

    // Realized Price = CapRealUSD / SplyCur
    const realized =
      capReal != null && sply != null && sply > 0 ? capReal / sply : null;

    // Transferred Price = cumulativeCDD / SplyCur
    const transferred =
      sply != null && sply > 0 && cumulativeCDD > 0
        ? cumulativeCDD / sply
        : null;

    // Terminal Price = transferredPrice × 21
    const terminal = transferred != null ? transferred * 21 : null;

    // Balance Price = realizedPrice − transferredPrice
    const balance =
      realized != null && transferred != null ? realized - transferred : null;

    // 90-day SMA of CDD
    const cdd90 = sma(cddArr, 90, i);

    out.push({
      time: r.time,
      ts: new Date(r.time + 'T00:00:00Z').getTime(),
      price: r.price,
      realized,
      transferred,
      terminal,
      balance,
      cdd: r.cdd,
      cdd90,
    });
  }

  return out;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function zoneOf(score: number): { zone: CycleZone; label: string; color: string } {
  if (score < 20) return { zone: 'capitulation',  label: 'Capitulation',  color: '#3B82F6' };
  if (score < 40) return { zone: 'accumulation',  label: 'Accumulation',  color: '#35D07F' };
  if (score < 60) return { zone: 'expansion',     label: 'Expansion',     color: '#94A3B8' };
  if (score < 80) return { zone: 'elevated',      label: 'Elevated',      color: '#E6B450' };
  return              { zone: 'distribution',  label: 'Distribution',  color: '#FF5C5C' };
}

export function scoreCycleMaster(point: CycleMasterPoint): CycleMasterScore {
  const { price, realized, transferred, terminal, cdd, cdd90 } = point;

  // Each ratio normalized 0–100 (clamped)
  const priceToBalance = realized != null && transferred != null
    ? clamp((price / ((realized - transferred) * 1.5)) * 100, 0, 100)
    : 50;

  const priceToRealized = realized != null
    ? clamp((price / (realized * 2)) * 100, 0, 100)
    : 50;

  const priceToTransferred = transferred != null
    ? clamp((price / (transferred * 3)) * 100, 0, 100)
    : 50;

  const priceToTerminal = terminal != null
    ? clamp((price / terminal) * 100, 0, 100)
    : 50;

  // CDD trend component: normalize cdd/cdd90 ratio
  let cddComponent = 50;
  if (cdd != null && cdd90 != null && cdd90 > 0) {
    cddComponent = clamp((cdd / cdd90) * 50, 0, 100);
  }

  // Weighted sum: 25% + 20% + 20% + 25% + 10%
  const score =
    priceToBalance   * 0.25 +
    priceToRealized  * 0.20 +
    priceToTransferred * 0.20 +
    priceToTerminal  * 0.25 +
    cddComponent     * 0.10;

  const { zone, label, color } = zoneOf(score);

  return { score: Math.round(score * 10) / 10, zone, label, color };
}
