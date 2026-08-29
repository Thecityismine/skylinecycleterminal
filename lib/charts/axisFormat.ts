// Shared date-axis tick formatting.
//
// The chart and its share card each carried their own copy of a formatter that
// rendered every tick as "MMM yy". Over a decade of history that reads fine, but
// on a short window it collapses: a 3-month view produced ten ticks reading
// "Jun 26, Jun 26, Jun 26, Jul 26, Jul 26, Jul 26, Jul 26, Aug 26, Aug 26, Aug 26"
// — three distinct labels across ten gridlines, with no way to tell the ticks
// apart.
//
// Precision is chosen from the span actually being displayed rather than from a
// timeframe label, so it stays correct when the reader zooms into an arbitrary
// region instead of picking a preset.

/** Days covered by an ascending series of "YYYY-MM-DD" strings. */
export function spanDays(times: string[]): number {
  if (times.length < 2) return 0;
  const first = new Date(times[0] + 'T00:00:00').getTime();
  const last  = new Date(times[times.length - 1] + 'T00:00:00').getTime();
  return Math.max(0, (last - first) / 86_400_000);
}

/**
 * Tick label for a date axis, with precision matched to the visible window.
 *
 *   up to ~4 months   "Aug 14"    day is the only thing that distinguishes ticks
 *   up to ~2.5 years  "Aug 26"    month and year
 *   beyond that       "2026"      year alone; months are noise at that density
 */
export function formatDateTick(iso: string, span: number): string {
  const dt = new Date(iso + 'T00:00:00');
  if (span <= 120) return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (span <= 900) return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return dt.getFullYear().toString();
}
