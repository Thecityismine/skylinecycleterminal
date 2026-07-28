import { CYCLE_ANCHORS } from './cycleAnchors';
import { ZONE_CONFIG, type ScoreZone } from './skylineScore';
import type { HistoricalScorePoint } from './historicalScore';

// Reads the point-in-time historical score at each known cycle turning point.
// This is the evidence layer behind /track-record: it does not decide what the
// score *should* have said, it reports what it did say and whether that landed
// in the zone you would want it to.

export type TurnKind = 'top' | 'bottom';

export type CycleTurn = {
  date:  string;
  price: number;
  kind:  TurnKind;
  /** Which cycle this turn belongs to, e.g. "2015–2018". */
  cycle: string;
};

export type AnchorReading = CycleTurn & {
  score:     number;
  zone:      ScoreZone;
  zoneLabel: string;
  zoneColor: string;
  /** The zone a working model should land in at this kind of turn. */
  expectedZone: ScoreZone;
  expectedLabel: string;
  hit: boolean;
  /** Most extreme reading within ±30 days — catches a model that was right but early or late. */
  nearby: { date: string; score: number } | null;
};

export type TrackRecord = {
  readings: AnchorReading[];
  hits:     number;
  total:    number;
  /** Every turn that did not land in its expected zone. Shown, never hidden. */
  misses:   AnchorReading[];
};

const EXPECTED: Record<TurnKind, ScoreZone> = {
  bottom: 'accumulate',
  top:    'distribution',
};

const NEARBY_WINDOW_DAYS = 30;

/** Every distinct turning point in CYCLE_ANCHORS, chronological, de-duplicated. */
export function cycleTurns(): CycleTurn[] {
  const seen = new Map<string, CycleTurn>();

  for (const a of CYCLE_ANCHORS) {
    // nextLowDate is intentionally skipped — it is always the following
    // anchor's lowDate, and would otherwise double-count every bottom.
    if (!seen.has(a.lowDate)) {
      seen.set(a.lowDate, { date: a.lowDate, price: a.lowPrice, kind: 'bottom', cycle: a.label });
    }
    if (a.highDate && a.highPrice != null && !seen.has(a.highDate)) {
      seen.set(a.highDate, { date: a.highDate, price: a.highPrice, kind: 'top', cycle: a.label });
    }
  }

  return [...seen.values()].sort((x, y) => x.date.localeCompare(y.date));
}

function nearestPoint(points: HistoricalScorePoint[], date: string): HistoricalScorePoint | null {
  const target = new Date(date + 'T00:00:00').getTime();
  let best: HistoricalScorePoint | null = null;
  let bestGap = Infinity;
  for (const p of points) {
    const gap = Math.abs(p.ts - target);
    if (gap < bestGap) { bestGap = gap; best = p; }
  }
  return best;
}

// The most extreme reading near the turn — lowest for a bottom, highest for a
// top. If the model was directionally right but a few weeks off, this shows it
// rather than letting a single-day snapshot decide the verdict.
function nearbyExtreme(
  points: HistoricalScorePoint[],
  date: string,
  kind: TurnKind,
): { date: string; score: number } | null {
  const target = new Date(date + 'T00:00:00').getTime();
  const span   = NEARBY_WINDOW_DAYS * 86_400_000;
  const window = points.filter((p) => Math.abs(p.ts - target) <= span);
  if (!window.length) return null;

  const best = window.reduce((acc, p) =>
    kind === 'bottom'
      ? (p.score < acc.score ? p : acc)
      : (p.score > acc.score ? p : acc),
  window[0]);

  return { date: best.time, score: best.score };
}

export function buildTrackRecord(points: HistoricalScorePoint[]): TrackRecord {
  const readings: AnchorReading[] = [];

  for (const turn of cycleTurns()) {
    const point = nearestPoint(points, turn.date);
    if (!point) continue;

    const expectedZone = EXPECTED[turn.kind];

    readings.push({
      ...turn,
      score:         point.score,
      zone:          point.zone,
      zoneLabel:     ZONE_CONFIG[point.zone].label,
      zoneColor:     ZONE_CONFIG[point.zone].color,
      expectedZone,
      expectedLabel: ZONE_CONFIG[expectedZone].label,
      hit:           point.zone === expectedZone,
      nearby:        nearbyExtreme(points, turn.date, turn.kind),
    });
  }

  return {
    readings,
    hits:   readings.filter((r) => r.hit).length,
    total:  readings.length,
    misses: readings.filter((r) => !r.hit),
  };
}
