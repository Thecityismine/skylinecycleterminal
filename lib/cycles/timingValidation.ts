import { daysBetween, fmtDate, BULL_DAYS, BEAR_DAYS, type CycleWindow } from '@/lib/cycles/durationModel';

export type ValidationRow = {
  cycleId: string;
  label: string;

  bullWindowLabel: string;
  modelBullDays: number;
  actualBullDays: number;
  bullError: number;      // actual - model, days
  bullErrorPct: number;   // error as % of model duration

  bearWindowLabel: string;
  modelBearDays: number;
  actualBearDays: number;
  bearError: number;
  bearErrorPct: number;
};

// Only cycles with a confirmed high AND a confirmed next-low can be validated —
// the current in-progress cycle and the fully projected cycle are excluded.
export function buildValidationRows(cycles: CycleWindow[]): ValidationRow[] {
  return cycles
    .filter((c) => c.status === 'completed')
    .map((c) => {
      const actualBullDays = daysBetween(c.lowDate, c.confirmedHighDate!);
      const actualBearDays = daysBetween(c.confirmedHighDate!, c.nextConfirmedLowDate!);
      const bullError = actualBullDays - c.bullDays;
      const bearError = actualBearDays - c.bearDays;

      return {
        cycleId: c.id,
        label: c.label,
        bullWindowLabel: `${fmtDate(c.lowDate)} → ${fmtDate(c.confirmedHighDate!)}`,
        modelBullDays: c.bullDays,
        actualBullDays,
        bullError,
        bullErrorPct: (bullError / c.bullDays) * 100,
        bearWindowLabel: `${fmtDate(c.confirmedHighDate!)} → ${fmtDate(c.nextConfirmedLowDate!)}`,
        modelBearDays: c.bearDays,
        actualBearDays,
        bearError,
        bearErrorPct: (bearError / c.bearDays) * 100,
      };
    });
}

// Average absolute timing error across all validated cycles, expressed as a
// fraction of model duration (0 = perfect fit, 1 = 100% off). Feeds the
// "historical timing fit" component of the confidence score.
export function averageAbsErrorFraction(rows: ValidationRow[]): number {
  if (!rows.length) return 1;
  const fractions = rows.flatMap((r) => [
    Math.abs(r.bullError) / BULL_DAYS,
    Math.abs(r.bearError) / BEAR_DAYS,
  ]);
  return fractions.reduce((s, v) => s + v, 0) / fractions.length;
}
