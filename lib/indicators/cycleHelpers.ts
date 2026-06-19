import type { PricePoint } from '../api/coinmetrics';

export type Halving = {
  date: string;   // "YYYY-MM-DD"
  cycle: number;
  label: string;
  block: number;
};

export const HALVINGS: Halving[] = [
  { date: '2012-11-28', cycle: 1, label: 'H1', block: 210_000 },
  { date: '2016-07-09', cycle: 2, label: 'H2', block: 420_000 },
  { date: '2020-05-11', cycle: 3, label: 'H3', block: 630_000 },
  { date: '2024-04-20', cycle: 4, label: 'H4', block: 840_000 },
  { date: '2028-04-01', cycle: 5, label: 'H5 est.', block: 1_050_000 },
];

export const CYCLE_FILL: Record<number, string> = {
  0: 'rgba(100,100,120,0.08)',
  1: 'rgba(59,130,246,0.10)',
  2: 'rgba(124,140,255,0.10)',
  3: 'rgba(53,208,127,0.10)',
  4: 'rgba(247,147,26,0.10)',
  5: 'rgba(255,92,92,0.06)',
};

export const CYCLE_STROKE: Record<number, string> = {
  0: '#64647A',
  1: '#3B82F6',
  2: '#7C8CFF',
  3: '#35D07F',
  4: '#F7931A',
  5: '#FF5C5C',
};

export const CYCLE_LABEL: Record<number, string> = {
  0: 'Pre-Cycle',
  1: 'Cycle 1',
  2: 'Cycle 2',
  3: 'Cycle 3',
  4: 'Cycle 4',
  5: 'Cycle 5',
};

export type CyclePoint = PricePoint & { cycle: number; ts: number };

export function assignCycles(prices: PricePoint[]): CyclePoint[] {
  return prices.map((p) => {
    let cycle = 0;
    for (const h of HALVINGS) {
      if (p.time >= h.date) cycle = h.cycle;
    }
    return { ...p, cycle, ts: new Date(p.time).getTime() };
  });
}

export type MAPoint = PricePoint & {
  ma: number | null;
  ma5: number | null;
  ts: number;
};

export function calculate2YearMA(prices: PricePoint[]): MAPoint[] {
  const period = 730;
  return prices.map((p, i) => {
    const ts = new Date(p.time).getTime();
    if (i < period - 1) return { ...p, ma: null, ma5: null, ts };
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j].price;
    const ma = sum / period;
    return { ...p, ma, ma5: ma * 5, ts };
  });
}

export function getCurrentCycleInfo() {
  const now = new Date().toISOString().slice(0, 10);
  // Find the most recent past halving
  let currentHalving = HALVINGS[0];
  for (const h of HALVINGS.slice(0, -1)) {
    if (now >= h.date) currentHalving = h;
  }

  const nextIdx = HALVINGS.findIndex((h) => h.date === currentHalving.date) + 1;
  const nextHalving = HALVINGS[nextIdx] ?? HALVINGS[HALVINGS.length - 1];

  const daysSince = Math.floor(
    (Date.now() - new Date(currentHalving.date).getTime()) / 86_400_000
  );
  const daysToNext = Math.max(
    0,
    Math.floor((new Date(nextHalving.date).getTime() - Date.now()) / 86_400_000)
  );

  return {
    currentCycleNum: currentHalving.cycle,
    halvingDate: currentHalving.date,
    daysSince,
    daysToNext,
    nextHalving,
    cycleProgress: Math.min(100, Math.round((daysSince / 1460) * 100)),
  };
}
