export type HalvingPhaseKey =
  | 'deep_accum'
  | 'build'
  | 'pre_halving'
  | 'consolidation'
  | 'bull_expansion';

export type HalvingPhase = {
  key:         HalvingPhaseKey;
  label:       string;
  shortLabel:  string;
  weeksFrom:   number;   // negative = before halving
  weeksTo:     number;
  color:       string;
  fill:        string;
  posture:     string;
  description: string;
};

export const PHASES: HalvingPhase[] = [
  {
    key:         'deep_accum',
    label:       'Deep Accumulation',
    shortLabel:  'Deep Accum.',
    weeksFrom:   -80,
    weeksTo:     -52,
    color:       '#3B82F6',
    fill:        'rgba(59,130,246,0.20)',
    posture:     'Best long-term buying zone',
    description: 'Often near post-bear recovery — price feels broken, fear is elevated, and nobody is talking about the next halving. Historically the best risk-adjusted entry window.',
  },
  {
    key:         'build',
    label:       'Build Position',
    shortLabel:  'Build',
    weeksFrom:   -52,
    weeksTo:     -26,
    color:       '#35D07F',
    fill:        'rgba(53,208,127,0.15)',
    posture:     'Continue DCA, add on pullbacks',
    description: 'Trend usually improves but volatility remains. Halving narrative begins forming. Continue accumulating on weakness.',
  },
  {
    key:         'pre_halving',
    label:       'Pre-Halving / Chase Risk',
    shortLabel:  'Pre-Halving',
    weeksFrom:   -26,
    weeksTo:     0,
    color:       '#E6B450',
    fill:        'rgba(230,180,80,0.15)',
    posture:     'Avoid chasing vertical moves',
    description: 'Halving hype builds. Prices frequently run hard, then chop. Better entry points were 6–18 months earlier. Do not FOMO.',
  },
  {
    key:         'consolidation',
    label:       'Post-Halving Consolidation',
    shortLabel:  'Post-Halving',
    weeksFrom:   0,
    weeksTo:     12,
    color:       '#F97316',
    fill:        'rgba(249,115,22,0.15)',
    posture:     'Patience — no instant moon',
    description: 'Frequently choppy or disappointing. The supply shock has not yet tightened. Historically a patience test.',
  },
  {
    key:         'bull_expansion',
    label:       'Bull Expansion Window',
    shortLabel:  'Bull Window',
    weeksFrom:   12,
    weeksTo:     78,
    color:       '#22C55E',
    fill:        'rgba(34,197,94,0.18)',
    posture:     'Manage risk, scale out into euphoria',
    description: 'Historically where major price expansion occurred. Manage position size. Begin taking profits gradually as indicators reach extremes.',
  },
];

export type Halving = {
  label:     string;
  number:    number;
  date:      string;
  ts:        number;
  estimated: boolean;
  bearLow?:  string;   // approx cycle bear-market low date
  weeksLow?: number;   // how many weeks before this halving the bear low was
};

export const HALVINGS: Halving[] = [
  { label: 'H1', number: 1, date: '2012-11-28', ts: new Date('2012-11-28T00:00:00Z').getTime(), estimated: false },
  { label: 'H2', number: 2, date: '2016-07-09', ts: new Date('2016-07-09T00:00:00Z').getTime(), estimated: false, bearLow: '2015-01-14', weeksLow: 78 },
  { label: 'H3', number: 3, date: '2020-05-11', ts: new Date('2020-05-11T00:00:00Z').getTime(), estimated: false, bearLow: '2018-12-15', weeksLow: 73 },
  { label: 'H4', number: 4, date: '2024-04-19', ts: new Date('2024-04-19T00:00:00Z').getTime(), estimated: false, bearLow: '2022-11-21', weeksLow: 73 },
  // H5: H4 + 210,000 blocks × 600s ≈ 1,458 days
  { label: 'H5 (est.)', number: 5, date: '2028-04-20', ts: new Date('2028-04-20T00:00:00Z').getTime(), estimated: true },
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type ZoneSegment = {
  halvingLabel: string;
  halvingNum:   number;
  phase:        HalvingPhase;
  x1:           number;
  x2:           number;
};

export function computeHalvingZones(): ZoneSegment[] {
  const segments: ZoneSegment[] = [];
  for (const h of HALVINGS) {
    for (const phase of PHASES) {
      segments.push({
        halvingLabel: h.label,
        halvingNum:   h.number,
        phase,
        x1: h.ts + phase.weeksFrom * WEEK_MS,
        x2: h.ts + phase.weeksTo   * WEEK_MS,
      });
    }
  }
  return segments;
}

export type CurrentPosition = {
  weeksToH5:         number;
  weeksSinceH4:      number;
  // Phase from H5's perspective
  h5Phase:           HalvingPhase | null;
  // Phase from H4's perspective (bull expansion etc.)
  h4Phase:           HalvingPhase | null;
  // Which halving's lens dominates
  dominantPhase:     HalvingPhase | null;
  nextTransitionDate: string | null;
  nextTransitionLabel: string | null;
  weeksToNextTransition: number | null;
};

export function getCurrentPosition(now = Date.now()): CurrentPosition {
  const h4 = HALVINGS.find((h) => h.number === 4)!;
  const h5 = HALVINGS.find((h) => h.number === 5)!;

  const weeksSinceH4 = (now - h4.ts) / WEEK_MS;
  const weeksToH5    = (h5.ts - now) / WEEK_MS;

  // Phase relative to H4 (past)
  let h4Phase: HalvingPhase | null = null;
  for (const p of PHASES) {
    if (weeksSinceH4 >= p.weeksFrom + (p.weeksFrom < 0 ? 0 : 0) && weeksSinceH4 < p.weeksTo + (p.weeksTo <= 0 ? 0 : 0)) {
      // simpler: check if now is in [h4.ts + p.weeksFrom*WEEK_MS, h4.ts + p.weeksTo*WEEK_MS]
      const start = h4.ts + p.weeksFrom * WEEK_MS;
      const end   = h4.ts + p.weeksTo   * WEEK_MS;
      if (now >= start && now < end) { h4Phase = p; break; }
    }
  }
  // re-check cleanly
  h4Phase = null;
  for (const p of PHASES) {
    const start = h4.ts + p.weeksFrom * WEEK_MS;
    const end   = h4.ts + p.weeksTo   * WEEK_MS;
    if (now >= start && now < end) { h4Phase = p; break; }
  }

  // Phase relative to H5 (upcoming)
  let h5Phase: HalvingPhase | null = null;
  for (const p of PHASES) {
    const start = h5.ts + p.weeksFrom * WEEK_MS;
    const end   = h5.ts + p.weeksTo   * WEEK_MS;
    if (now >= start && now < end) { h5Phase = p; break; }
  }

  const dominantPhase = h5Phase ?? h4Phase;

  // Next transition: when does the current phase end (or next phase start)?
  let nextTransitionDate: string | null = null;
  let nextTransitionLabel: string | null = null;
  let weeksToNextTransition: number | null = null;

  // Look for the next phase boundary from H5 perspective that hasn't passed
  const allBoundaries: { ts: number; label: string }[] = [];
  for (const p of PHASES) {
    const start = h5.ts + p.weeksFrom * WEEK_MS;
    if (start > now) allBoundaries.push({ ts: start, label: `${p.label} begins (H5)` });
  }
  // Add H5 itself
  if (h5.ts > now) allBoundaries.push({ ts: h5.ts, label: 'H5 Halving (est.)' });

  allBoundaries.sort((a, b) => a.ts - b.ts);
  const next = allBoundaries[0];
  if (next) {
    nextTransitionDate   = new Date(next.ts).toISOString().slice(0, 10);
    nextTransitionLabel  = next.label;
    weeksToNextTransition = (next.ts - now) / WEEK_MS;
  }

  return { weeksToH5, weeksSinceH4, h4Phase, h5Phase, dominantPhase, nextTransitionDate, nextTransitionLabel, weeksToNextTransition };
}
