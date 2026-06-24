export type HalvingWindowData = {
  halvingDate: string;
  halvingTs: number;
  year: number;
  label: string;
  shortLabel: string;
  accumulationStartTs: number;
  accumulationEndTs: number;
  deriskStartTs: number;
  deriskEndTs: number;
  accumulationPoint: { time: string; ts: number; price: number } | null;
  deriskPoint: { time: string; ts: number; price: number } | null;
  projected: boolean;
};

const WINDOW_DAYS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const HALVING_DATES = [
  { label: 'H1 — 2012', shortLabel: 'H1',         year: 2012, date: '2012-11-28' },
  { label: 'H2 — 2016', shortLabel: 'H2',         year: 2016, date: '2016-07-09' },
  { label: 'H3 — 2020', shortLabel: 'H3',         year: 2020, date: '2020-05-11' },
  { label: 'H4 — 2024', shortLabel: 'H4',         year: 2024, date: '2024-04-19' },
  { label: 'H5 — 2028 (est.)', shortLabel: 'H5*', year: 2028, date: '2028-04-20' },
] as const;

export function buildHalvingWindows(
  dailyData: { time: string; price: number }[]
): HalvingWindowData[] {
  const indexed = dailyData.map((p) => ({
    time: p.time,
    ts: new Date(p.time + 'T00:00:00Z').getTime(),
    price: p.price,
  }));

  const now = Date.now();

  return HALVING_DATES.map(({ label, shortLabel, year, date }) => {
    const halvingTs = new Date(date + 'T00:00:00Z').getTime();
    const accumulationStartTs = halvingTs - WINDOW_DAYS * DAY_MS;
    const accumulationEndTs   = halvingTs;
    const deriskStartTs       = halvingTs;
    const deriskEndTs         = halvingTs + WINDOW_DAYS * DAY_MS;
    const projected           = halvingTs > now;

    const accRange = indexed.filter(
      (p) => p.ts >= accumulationStartTs && p.ts <= accumulationEndTs && p.price > 0
    );
    const accumulationPoint =
      !projected && accRange.length > 0
        ? accRange.reduce((min, p) => (p.price < min.price ? p : min))
        : null;

    // De-risk window is computed up to today if the window extends past now
    const deriskCap = Math.min(deriskEndTs, now);
    const deriskRange = indexed.filter(
      (p) => p.ts >= deriskStartTs && p.ts <= deriskCap && p.price > 0
    );
    const deriskPoint =
      !projected && deriskRange.length > 0
        ? deriskRange.reduce((max, p) => (p.price > max.price ? p : max))
        : null;

    return {
      halvingDate: date,
      halvingTs,
      year,
      label,
      shortLabel,
      accumulationStartTs,
      accumulationEndTs,
      deriskStartTs,
      deriskEndTs,
      accumulationPoint,
      deriskPoint,
      projected,
    };
  });
}

// Determine which window today falls in (if any)
export type WindowPhase =
  | { type: 'accumulation'; window: HalvingWindowData }
  | { type: 'derisk';       window: HalvingWindowData }
  | { type: 'neutral' };

export function getCurrentWindowPhase(
  windows: HalvingWindowData[],
  now = Date.now()
): WindowPhase {
  for (const w of windows) {
    if (now >= w.accumulationStartTs && now < w.accumulationEndTs) {
      return { type: 'accumulation', window: w };
    }
    if (now >= w.deriskStartTs && now < w.deriskEndTs) {
      return { type: 'derisk', window: w };
    }
  }
  return { type: 'neutral' };
}
