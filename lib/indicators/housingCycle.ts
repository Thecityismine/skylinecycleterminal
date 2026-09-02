import type { FredPoint } from '@/lib/api/fredHousing';

// The housing cycle backbone.
//
// The "18-year cycle" is a useful frame and a dangerous one. Useful because
// housing genuinely does move in long waves that dwarf the business cycle.
// Dangerous because the frame invites the exact error the spec warned against:
// counting years since the last low and concluding something. Eighteen years is
// an average of a small sample, and averages do not schedule turning points.
//
// So nothing here is keyed to a date. Every phase boundary below — historical
// and current — is derived from the price series itself.
//
// PRICES ARE DEFLATED, and that decision carries the chart. Nominal house
// prices spend almost the whole record rising, which makes every cycle except
// 2008 invisible and teaches the reader that housing only goes up. In real
// terms:
//
//   1989 peak → 1996 trough at -14%, back to even in 2000 ....... 11 years
//   2006 peak → 2011 trough at -35%, back to even in 2021 ....... 15 years
//
// A buyer at the 2006 peak waited fifteen years to break even in purchasing
// power while their nominal statement looked fine the whole time. That is the
// most useful thing this chart has to say, and a nominal axis erases it.

export type CyclePoint = {
  date:     string;
  ts:       number;
  /** Case-Shiller, as published. */
  nominal:  number;
  /** Case-Shiller in today's dollars. */
  real:     number;
  /** % below the running real peak, always <= 0. */
  drawdown: number;
};

export type SegmentKind = 'expansion' | 'contraction' | 'recovery';

export type CycleSegment = {
  kind:    SegmentKind;
  start:   string;
  end:     string;
  startTs: number;
  endTs:   number;
  label:   string;
  /** Deepest real drawdown reached inside the segment, for contractions. */
  depth?:  number;
};

/** The six phases, in cycle order. */
export const PHASES = [
  { key: 'cycle_low',   name: 'Capitulation / Cycle Low',  color: '#22D3EE' },
  { key: 'early',       name: 'Early Expansion',           color: '#35D07F' },
  { key: 'mid_slow',    name: 'Mid-Cycle Slowdown',        color: '#E6B450' },
  { key: 'second',      name: 'Second Expansion',          color: '#35D07F' },
  { key: 'euphoria',    name: 'Euphoria / Winner’s Curse', color: '#F97316' },
  { key: 'contraction', name: 'Peak / Contraction',        color: '#FF5C5C' },
] as const;

export type PhaseKey = (typeof PHASES)[number]['key'];

export type CyclePosition = {
  phase:      PhaseKey;
  name:       string;
  color:      string;
  /** Every input that moved the verdict, so the call can be audited. */
  evidence:   Array<{ label: string; value: string; supports: boolean }>;
  read:       string;
  /** What would have to change for the phase to advance. */
  nextSignal: string;
};

/**
 * Deflates Case-Shiller by headline CPI to today's dollars.
 *
 * Both series are monthly and share first-of-month dates, so they join on the
 * date string directly. A month present in one and not the other is dropped
 * rather than interpolated — inventing a denominator to keep a row is not worth
 * it when the series already runs to 470-odd observations.
 */
export function buildRealSeries(caseShiller: FredPoint[], cpi: FredPoint[]): CyclePoint[] {
  if (!caseShiller.length || !cpi.length) return [];

  const cpiByDate = new Map(cpi.map((p) => [p.date, p.value]));
  const latestCpi = cpi[cpi.length - 1].value;
  if (!(latestCpi > 0)) return [];

  const joined: Array<Omit<CyclePoint, 'drawdown'>> = [];
  for (const p of caseShiller) {
    const c = cpiByDate.get(p.date);
    if (!c || !(c > 0)) continue;
    joined.push({
      date:    p.date,
      ts:      new Date(`${p.date}T00:00:00Z`).getTime(),
      nominal: p.value,
      real:    (p.value * latestCpi) / c,
    });
  }

  let peak = 0;
  return joined.map((p) => {
    if (p.real > peak) peak = p.real;
    return { ...p, drawdown: peak > 0 ? ((p.real - peak) / peak) * 100 : 0 };
  });
}

/** A drawdown shallower than this is noise, not a cycle. */
const MIN_CYCLE_DEPTH = 5;

/**
 * Splits the record into expansion / contraction / recovery segments.
 *
 * Walks the running real peak. Each time price falls more than MIN_CYCLE_DEPTH
 * below a peak, that peak begins a contraction, which runs to the lowest point
 * before the peak is regained; the climb back is the recovery. Everything else
 * is expansion. No dates are supplied — the 1990 and 2006 cycles fall out of the
 * series on their own, which is the point.
 */
export function detectCycleSegments(points: CyclePoint[]): CycleSegment[] {
  if (points.length < 24) return [];

  const seg: CycleSegment[] = [];
  const year = (d: string) => d.slice(0, 4);
  const push = (kind: SegmentKind, a: CyclePoint, b: CyclePoint, label: string, depth?: number) => {
    if (b.ts <= a.ts) return;
    seg.push({ kind, start: a.date, end: b.date, startTs: a.ts, endTs: b.ts, label, depth });
  };

  let i = 0;
  let expansionStart = points[0];

  while (i < points.length) {
    // Advance to the next point that has broken below a peak by enough to count.
    while (i < points.length && points[i].drawdown > -MIN_CYCLE_DEPTH) i++;
    if (i >= points.length) break;

    // The peak this drawdown is measured from is the last point at drawdown 0.
    let p = i;
    while (p > 0 && points[p].drawdown !== 0) p--;
    const peak = points[p];

    // Trough: lowest real price before the peak is regained (or the series end).
    let t = i;
    let j = i;
    while (j < points.length && points[j].real < peak.real) {
      if (points[j].real < points[t].real) t = j;
      j++;
    }
    const trough = points[t];
    const recovered = j < points.length ? points[j] : null;

    push('expansion', expansionStart, peak, `Expansion to the ${year(peak.date)} peak`);
    push('contraction', peak, trough,
      `${year(peak.date)} peak → ${year(trough.date)} trough`, trough.drawdown);

    if (recovered) {
      push('recovery', trough, recovered,
        `Recovery — ${year(recovered.date)} regains ${year(peak.date)} in real terms`);
      expansionStart = recovered;
      i = j;
    } else {
      // Still below the old peak at the end of the record: the segment is open.
      push('recovery', trough, points[points.length - 1], 'Below the prior real peak');
      break;
    }
  }

  // Trailing expansion, if the record ends at or near a high.
  const last = points[points.length - 1];
  if (expansionStart.ts < last.ts && !seg.some((s) => s.endTs >= last.ts)) {
    push('expansion', expansionStart, last, 'Expansion to date');
  }
  return seg;
}

export type PositionInputs = {
  points:    CyclePoint[];
  /** 0-100 from the real-estate pillars. Low means expensive. */
  valuation: number | null;
  /** 0-100. High means supply is loosening and buyers are gaining. */
  supply:    number | null;
  /** 0-100. Low means credit is tight or stressed. */
  credit:    number | null;
  /** 0-100 from the builder group. Low means weakening. */
  builders:  number | null;
};

function changeOver(points: CyclePoint[], months: number): number | null {
  if (points.length <= months) return null;
  const now = points[points.length - 1].real;
  const then = points[points.length - 1 - months].real;
  return then > 0 ? ((now - then) / then) * 100 : null;
}

/**
 * Places the current position on the cycle from present conditions.
 *
 * The tests run in cycle order and the first match wins, because the phases are
 * not mutually exclusive on any single measure — a 6% drawdown occurs in a
 * mid-cycle pause and on the way into a contraction alike. What separates those
 * two is not the price, it is whether builders and supply confirm, which is why
 * they are inputs here rather than decoration on the page.
 */
export function computeCyclePosition(inp: PositionInputs): CyclePosition | null {
  const { points, valuation, supply, credit, builders } = inp;
  if (points.length < 36) return null;

  const dd   = points[points.length - 1].drawdown;
  const ch12 = changeOver(points, 12);
  const ch36 = changeOver(points, 36);

  const falling = ch12 != null && ch12 < -0.5;
  const rising  = ch12 != null && ch12 > 1;
  const stalled = ch36 != null && Math.abs(ch36) < 5;

  let phase: PhaseKey;
  let read: string;
  let nextSignal: string;

  if (dd <= -20) {
    phase = 'cycle_low';
    read = 'Real prices sit deep below the prior peak. Historically this is where the long-horizon buyer has been paid, and it has never felt that way at the time — the incoming data is at its worst precisely here.';
    nextSignal = 'A year of rising real prices off the trough would move this to Early Expansion.';
  } else if (dd <= -8 && rising) {
    phase = 'early';
    read = 'Real prices are climbing out of a drawdown but have not regained the prior peak. This is the stretch where the headlines are still negative and the data has already turned.';
    nextSignal = 'Regaining the prior real peak would move this to Second Expansion.';
  } else if (dd > -3 && rising && valuation != null && valuation < 30) {
    phase = 'euphoria';
    read = 'Real prices are at record levels and still rising while valuation sits at a historical extreme. This part of the cycle produces the worst entries, and it is the part that feels safest.';
    nextSignal = 'Builders weakening, or supply loosening, would move this to Peak / Contraction.';
  } else if (dd > -5 && rising) {
    phase = 'second';
    read = 'Real prices are at or near highs and still advancing. The expansion is intact.';
    nextSignal = 'Valuation reaching an extreme while supply loosens would move this toward Euphoria.';
  } else if (falling || stalled) {
    // The genuinely hard call: a pause inside an expansion, or the turn itself.
    // Price alone cannot separate the two, so confirmation is required.
    const supplyConfirms  = supply   != null && supply   >= 60;
    const buildersConfirm = builders != null && builders <  45;
    const confirmations   = [supplyConfirms, buildersConfirm].filter(Boolean).length;

    if (confirmations >= 1) {
      phase = 'contraction';
      read = stalled
        ? 'Real prices are off their peak and have gone essentially nowhere for three years while supply loosens and builders weaken. The correction is running through inflation rather than through falling nominal prices, which is why it does not look like one.'
        : 'Real prices are declining from the peak with supply and builders both confirming. This is a contraction rather than a pause.';
      nextSignal = 'A real drawdown past 20% would move this to Capitulation / Cycle Low.';
    } else {
      phase = 'mid_slow';
      read = 'Real prices have paused, but neither supply nor builders confirm a turn. This pattern has historically resolved back into expansion more often than into contraction.';
      nextSignal = 'Builders weakening or supply loosening would move this to Peak / Contraction.';
    }
  } else {
    phase = 'mid_slow';
    read = 'Real prices are flat with no confirming signal in either direction. The cycle is between phases.';
    nextSignal = 'A sustained move in real prices, in either direction, will resolve this.';
  }

  const contracting = phase === 'contraction' || phase === 'cycle_low';
  const fmt = (v: number | null) => (v == null ? 'n/a' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);

  const evidence: CyclePosition['evidence'] = [];
  const add = (label: string, value: string, supports: boolean) =>
    evidence.push({ label, value, supports });

  add('Real drawdown from peak', `${dd.toFixed(1)}%`, contracting ? dd < -3 : dd > -5);
  add('Real change, 12 months', fmt(ch12), contracting ? falling : rising);
  add('Real change, 36 months', fmt(ch36), contracting ? stalled || (ch36 ?? 0) < 0 : (ch36 ?? 0) > 0);
  if (supply    != null) add('Supply & demand',    `${Math.round(supply)}/100`,    contracting ? supply >= 60  : supply < 60);
  if (builders  != null) add('Homebuilder signal', `${Math.round(builders)}/100`,  contracting ? builders < 45 : builders >= 45);
  if (valuation != null) add('Valuation',          `${Math.round(valuation)}/100`, valuation < 30);
  if (credit    != null) add('Credit conditions',  `${Math.round(credit)}/100`,    credit < 50);

  const meta = PHASES.find((p) => p.key === phase)!;
  return { phase, name: meta.name, color: meta.color, evidence, read, nextSignal };
}

export const SEGMENT_COLOR: Record<SegmentKind, string> = {
  expansion:   '#35D07F',
  contraction: '#FF5C5C',
  recovery:    '#3B82F6',
};
