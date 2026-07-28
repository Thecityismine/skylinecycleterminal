import { CYCLE_ANCHORS, type CycleAnchor } from '@/lib/indicators/cycleAnchors';

export const BULL_DAYS = 1064;
export const BEAR_DAYS = 364;
export const TOTAL_CYCLE_DAYS = BULL_DAYS + BEAR_DAYS;

export function addDays(dateStr: string, days: number): string {
  const ms = new Date(dateStr + 'T00:00:00Z').getTime() + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  return Math.round(
    (new Date(end + 'T00:00:00Z').getTime() - new Date(start + 'T00:00:00Z').getTime()) / 86_400_000
  );
}

export function toTs(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getTime();
}

export function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export type CycleWindow = {
  id: string;
  label: string;
  lowDate: string;
  lowPrice: number | null;

  projectedHighDate: string;
  projectedLowDate: string;

  confirmedHighDate?: string;
  confirmedHighPrice?: number;

  nextConfirmedLowDate?: string;
  nextConfirmedLowPrice?: number;

  bullDays: number;
  bearDays: number;

  // 'completed'   — low, high, and next low are all confirmed historical prices
  // 'in-progress' — low is confirmed, high/next-low are model projections
  // 'projected'   — every date in this window is a model projection, nothing confirmed
  status: 'completed' | 'in-progress' | 'projected';
};

// Builds the full cycle-window series: confirmed historical cycles from
// CYCLE_ANCHORS, the currently in-progress cycle, and one fully projected
// cycle chained off it (next low -> +1064d high -> +364d low).
export function buildCycleWindows(anchors: CycleAnchor[] = CYCLE_ANCHORS): CycleWindow[] {
  const windows: CycleWindow[] = [];

  for (const a of anchors) {
    const isCompleted = !!(a.highDate && a.highPrice != null && a.nextLowDate && a.nextLowPrice != null);

    windows.push({
      id: a.cycleId,
      label: a.label,
      lowDate: a.lowDate,
      lowPrice: a.lowPrice,
      projectedHighDate: addDays(a.lowDate, BULL_DAYS),
      projectedLowDate: addDays(a.lowDate, TOTAL_CYCLE_DAYS),
      confirmedHighDate: a.highDate,
      confirmedHighPrice: a.highPrice,
      nextConfirmedLowDate: a.nextLowDate,
      nextConfirmedLowPrice: a.nextLowPrice,
      bullDays: BULL_DAYS,
      bearDays: BEAR_DAYS,
      status: isCompleted ? 'completed' : 'in-progress',
    });
  }

  const last = windows[windows.length - 1];
  if (last) {
    const nextLowDate = last.projectedLowDate;
    windows.push({
      id: `${last.id}-next`,
      label: 'Next Modeled Cycle',
      lowDate: nextLowDate,
      lowPrice: null,
      projectedHighDate: addDays(nextLowDate, BULL_DAYS),
      projectedLowDate: addDays(nextLowDate, TOTAL_CYCLE_DAYS),
      bullDays: BULL_DAYS,
      bearDays: BEAR_DAYS,
      status: 'projected',
    });
  }

  return windows;
}

export type CyclePhase = 'expansion' | 'peak-risk' | 'distribution' | 'accumulation' | 'beyond-model';

export const PEAK_WINDOW_START = 1000;
export const PEAK_WINDOW_END = 1125;
export const BOTTOM_WINDOW_START = 1350;
export const BOTTOM_WINDOW_END = 1500;

export function phaseFromDaysSinceLow(daysSinceLow: number): CyclePhase {
  if (daysSinceLow < PEAK_WINDOW_START) return 'expansion';
  if (daysSinceLow <= PEAK_WINDOW_END) return 'peak-risk';
  if (daysSinceLow < BOTTOM_WINDOW_START) return 'distribution';
  if (daysSinceLow <= BOTTOM_WINDOW_END) return 'accumulation';
  return 'beyond-model';
}

// Clamped 0-1 progress of `now` between `start` and `end` (both ISO dates).
export function phaseProgress(start: string, end: string, now: string): number {
  const span = daysBetween(start, end);
  if (span <= 0) return 0;
  const elapsed = daysBetween(start, now);
  return Math.max(0, Math.min(1, elapsed / span));
}
