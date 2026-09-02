// Shared value formatting.
//
// Percentile readouts are written by hand on nearly every page, and each one
// used to hardcode the "th" suffix. That is right for 4 values out of 10 and
// wrong for the rest, which is how "72th pct", "71th pct" and "2th pct" all
// shipped to production at once. Anything rendering an ordinal should call
// `ordinal()` rather than concatenating a suffix at the call site.

/** 1st, 2nd, 3rd, 4th — including the 11-13 exception that catches most attempts. */
export function ordinal(n: number): string {
  const abs = Math.abs(n);
  const suffix =
    abs % 100 >= 11 && abs % 100 <= 13 ? 'th'
    : abs % 10 === 1 ? 'st'
    : abs % 10 === 2 ? 'nd'
    : abs % 10 === 3 ? 'rd'
    : 'th';
  return `${n}${suffix}`;
}
