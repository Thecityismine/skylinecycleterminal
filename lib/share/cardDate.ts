// What date a share card should be stamped with.
//
// Every card used to print the moment it was rendered. That is wrong for most
// of every day: on-chain and daily-close series only publish once the UTC day
// closes, so a card made at midday carries yesterday's readings under today's
// heading. A reader checks the price against an exchange, sees a gap, and stops
// trusting the chart over a number that was never claiming to be current.
//
// So the stamp comes from the data. The card says the date its figures are
// actually from.

/** Field names checked first, in order, before falling back to a scan. */
const PREFERRED_ARRAYS = ['points', 'data', 'series', 'chart', 'history'];

function lastDateOf(arr: unknown): string | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const last = arr[arr.length - 1] as Record<string, unknown> | undefined;
  const raw = last?.time ?? last?.date;
  return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
}

/**
 * The date of the newest real observation in a payload.
 *
 * Prefers an explicit `dataAsOf`, then a conventionally-named series, then any
 * array of dated points. Future dates are rejected rather than preferred:
 * several cards carry projections, and stamping a card with the end of a
 * forecast would be worse than stamping it with today.
 */
export function cardAsOfIso(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  const explicit = p.dataAsOf;
  if (typeof explicit === 'string' && /^\d{4}-\d{2}-\d{2}/.test(explicit)) {
    return explicit.slice(0, 10);
  }

  const today = new Date().toISOString().slice(0, 10);
  const usable = (d: string | null) => (d && d <= today ? d : null);

  for (const key of PREFERRED_ARRAYS) {
    const found = usable(lastDateOf(p[key]));
    if (found) return found;
  }

  // Nothing conventionally named. Take the longest dated array, which is almost
  // always the main series rather than a handful of markers or annotations.
  let best: { len: number; date: string } | null = null;
  for (const v of Object.values(p)) {
    if (!Array.isArray(v)) continue;
    const d = usable(lastDateOf(v));
    if (d && (!best || v.length > best.len)) best = { len: v.length, date: d };
  }
  return best?.date ?? null;
}

/**
 * The stamp itself. Falls back to the render time when a payload carries no
 * dated series at all, which is correct for the few cards that are a snapshot
 * of a single moment rather than a time series.
 */
export function formatCardDate(payload: { generatedAt: string }): string {
  const iso = cardAsOfIso(payload);
  const d = iso
    ? new Date(iso + 'T00:00:00Z')
    : new Date(payload.generatedAt);

  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...(iso ? { timeZone: 'UTC' } : {}),
  });
}

/** "Aug 21" from a date, for labelling which close a single figure came from. */
export function shortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
