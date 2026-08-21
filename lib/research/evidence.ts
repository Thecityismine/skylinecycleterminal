import { ZONE_CONFIG, zoneFromScore } from '@/lib/indicators/skylineScore';
import type { CycleScoreResult, ScoreZone } from '@/lib/indicators/skylineScore';
import type { ValueFloorPoint, FloorProximityScore } from '@/lib/indicators/valueFloors';
import type { ActiveCyclePosition, CompletedCycleStats } from '@/lib/indicators/cycleAnchors';
import type { MacroResponse }      from '@/lib/api/fred';

// ─── Polarity ─────────────────────────────────────────────────────────────────
//
// The two score systems in this codebase run in OPPOSITE directions:
//
//   skylineScore.computeSkylineScore  0 = accumulate      100 = distribution
//   valueFloors.getFloorProximityScore 0 = far above floor 100 = deepest value
//
// Everything in the research report is normalised onto the skylineScore
// convention and called `extension`: 0 = deepest value, 100 = most extended.
// Floor-proximity inputs are inverted on the way in. Getting this backwards
// silently flips every conclusion in the report, so it is done in exactly one
// place — `fromFloorComponent` — and nowhere else.

export type EvidenceDirection = 'supports' | 'weakens' | 'neutral';

export type EvidenceCategory =
  | 'valuation' | 'onchain' | 'sentiment' | 'macro' | 'structure' | 'timing';

export const CATEGORY_LABEL: Record<EvidenceCategory, string> = {
  valuation: 'Valuation',
  onchain:   'On-Chain Health',
  sentiment: 'Sentiment',
  macro:     'Macro Environment',
  structure: 'Market Structure',
  timing:    'Cycle Timing',
};

export type EvidenceItem = {
  id:            string;
  label:         string;
  category:      EvidenceCategory;
  reading:       string;          // the raw figure, as displayed
  interpretation: string;         // what that figure means in words
  extension:     number | null;   // 0 = deep value … 100 = extended
  weight:        number;          // relative importance within the ledger
  source:        string;
  available:     boolean;
  gapReason?:    string;          // why it could not be computed
};

// ─── Regime ───────────────────────────────────────────────────────────────────
//
// The regime names the same four bands as the Skyline Cycle Score, cut at the
// same thresholds, because both are read off a 0–100 axis running value →
// extension and the landing page shows them side by side. They used to
// disagree: the regime cut at 40/65 while the score cuts at 25/50/75, so a
// weighted extension of 28 was labelled "Accumulation" directly beneath a score
// of 25 labelled "Hold / Build", and the report's own summary line claimed a
// score of 25 sat "in the accumulation band" when it does not.
export type Thesis = ScoreZone;

export type EvidenceLedger = {
  items:              EvidenceItem[];
  available:          EvidenceItem[];
  gaps:               EvidenceItem[];
  weightedExtension:  number;   // 0–100, weight-weighted mean of available items
  thesis:             Thesis;
  coverage:           number;   // 0–1, share of total weight actually available
  supporting:         EvidenceItem[];
  weakening:          EvidenceItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function fmtUSD(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
}

// The single inversion point between the two polarity conventions.
function fromFloorComponent(floorScore: number): number {
  return clamp(100 - floorScore, 0, 100);
}

export function thesisFromExtension(extension: number): Thesis {
  return zoneFromScore(extension);
}

// The band labels are the score's own, not a parallel set of names.
export const THESIS_LABEL: Record<Thesis, string> = {
  accumulate:   ZONE_CONFIG.accumulate.label,
  build:        ZONE_CONFIG.build.label,
  caution:      ZONE_CONFIG.caution.label,
  distribution: ZONE_CONFIG.distribution.label,
};

// Which way a reading points, coarser than the four bands. Direction has to be
// judged on this rather than on band equality: an item at 10 and a regime of
// 'build' fall in different bands but both point cold, and filing that item as
// counter-evidence would invert its meaning.
export type RegimeSide = 'cold' | 'hot';

export function regimeSide(thesis: Thesis): RegimeSide {
  return thesis === 'accumulate' || thesis === 'build' ? 'cold' : 'hot';
}

// An item supports the reading when it points the same way the reading does.
// Items sitting in the middle of their own range are neutral regardless.
export function directionOf(item: EvidenceItem, thesis: Thesis): EvidenceDirection {
  if (!item.available || item.extension == null) return 'neutral';
  const e = item.extension;
  if (e >= 42 && e <= 58) return 'neutral';
  const itemSide: RegimeSide = e < 50 ? 'cold' : 'hot';
  return itemSide === regimeSide(thesis) ? 'supports' : 'weakens';
}

// ─── Builders ─────────────────────────────────────────────────────────────────

// The ten indicators behind the Skyline Cycle Score already carry a 0–100
// extension score, a weight and an availability flag, so they map straight over.
const CYCLE_CATEGORY: Record<string, EvidenceCategory> = {
  'MVRV Ratio':        'valuation',
  'Puell Multiple':    'onchain',
  'NVT Signal':        'onchain',
  'Active Addresses':  'onchain',
  'Stablecoin Supply': 'onchain',
  'Hash Rate Ribbon':  'onchain',
  'Pi Cycle Top':      'structure',
  '2Y MA Multiplier':  'structure',
  'Log Regression':    'structure',
  'Fear & Greed':      'sentiment',
};

export function fromCycleScore(result: CycleScoreResult): EvidenceItem[] {
  return result.indicators.map((ind) => ({
    id:             `cycle:${ind.name}`,
    label:          ind.name,
    category:       CYCLE_CATEGORY[ind.name] ?? 'onchain',
    reading:        ind.rawLabel,
    interpretation: ind.signal,
    extension:      ind.available ? clamp(ind.score, 0, 100) : null,
    weight:         ind.weight,
    source:         ind.source,
    available:      ind.available,
    gapReason:      ind.available ? undefined : 'Upstream data unavailable',
  }));
}

export function fromValuation(
  last: ValueFloorPoint | null,
  floor: FloorProximityScore,
): EvidenceItem[] {
  const b = floor.breakdown;

  const pctVs = (ratio: number | null | undefined) =>
    ratio == null ? null : (ratio - 1) * 100;

  return [
    {
      id:       'val:delta',
      label:    'Delta Price',
      category: 'valuation',
      reading:  fmtUSD(last?.deltaPrice),
      interpretation: last?.vsDelta != null
        ? `Price ${fmtPct(pctVs(last.vsDelta))} vs the model`
        : 'Not yet defined this early in history',
      extension: last?.deltaPrice != null ? fromFloorComponent(b.deltaFloor) : null,
      weight:    14,
      source:    'CoinMetrics (derived)',
      available: last?.deltaPrice != null,
      gapReason: last?.deltaPrice == null ? 'Average cap still exceeds realized cap' : undefined,
    },
    {
      id:       'val:realized',
      label:    'Realized Price',
      category: 'valuation',
      reading:  fmtUSD(last?.realizedPrice),
      interpretation: last?.vsRealized != null
        ? `Price ${fmtPct(pctVs(last.vsRealized))} vs aggregate holder cost basis`
        : '—',
      extension: last?.realizedPrice != null ? fromFloorComponent(b.realizedFloor) : null,
      weight:    14,
      source:    'CoinMetrics (derived)',
      available: last?.realizedPrice != null,
    },
    {
      id:       'val:ma200w',
      label:    '200-Week MA',
      category: 'structure',
      reading:  fmtUSD(last?.ma200w),
      interpretation: last?.vs200w != null
        ? `Price ${fmtPct(pctVs(last.vs200w))} vs the 200W MA`
        : '—',
      extension: last?.ma200w != null ? fromFloorComponent(b.ma200wFloor) : null,
      weight:    8,
      source:    'CoinMetrics',
      available: last?.ma200w != null,
    },
    {
      id:       'val:drawdown',
      label:    'Drawdown from ATH',
      category: 'structure',
      reading:  last ? `${last.drawdownPct.toFixed(1)}%` : '—',
      interpretation: last ? `Cycle ATH ${fmtUSD(last.ath)}` : '—',
      extension: last ? fromFloorComponent(b.drawdown) : null,
      weight:    8,
      source:    'CoinMetrics',
      available: last != null,
    },
  ];
}

// Macro is deliberately light-weighted: it sets the backdrop but should never
// outvote the on-chain and valuation evidence in a Bitcoin cycle report.
export function fromMacro(macro: MacroResponse | null): EvidenceItem[] {
  if (!macro) {
    return [{
      id:       'macro:composite',
      label:    'Macro Composite',
      category: 'macro',
      reading:  '—',
      interpretation: 'Macro series unavailable',
      extension: null,
      weight:    10,
      source:    'FRED',
      available: false,
      gapReason: 'FRED request failed or FRED_API_KEY is not configured',
    }];
  }

  // macroScore already runs 0 (supportive for BTC) → 100 (hostile for BTC),
  // which is the same direction as `extension`.
  return [
    {
      id:       'macro:composite',
      label:    'Macro Composite',
      category: 'macro',
      reading:  `${Math.round(macro.macroScore)} / 100`,
      interpretation: macro.macroScore < 40 ? 'Supportive backdrop'
        : macro.macroScore < 60 ? 'Neutral backdrop'
        : 'Restrictive backdrop',
      extension: clamp(macro.macroScore, 0, 100),
      weight:    10,
      source:    'FRED',
      available: true,
    },
    {
      id:       'macro:dxy',
      label:    'US Dollar Index',
      category: 'macro',
      reading:  `${macro.dxy.current.toFixed(1)} (${fmtPct(macro.dxy.change1M)} 1M)`,
      interpretation: macro.dxy.change1M < -0.5 ? 'Weakening dollar — supportive'
        : macro.dxy.change1M > 0.5 ? 'Strengthening dollar — a headwind'
        : 'Dollar broadly flat',
      // A falling dollar is supportive, so a rising DXY maps to higher extension.
      extension: clamp(50 + macro.dxy.change1M * 8, 0, 100),
      weight:    5,
      source:    'FRED (DTWEXBGS)',
      available: true,
    },
    {
      id:       'macro:realrate',
      label:    'Real 10Y Rate',
      category: 'macro',
      reading:  `${macro.realRate.toFixed(2)}%`,
      interpretation: macro.realRate < 0 ? 'Negative real rates — supportive'
        : macro.realRate < 2 ? 'Moderately positive real rates'
        : 'Restrictive real rates',
      extension: clamp(35 + macro.realRate * 12, 0, 100),
      weight:    5,
      source:    'FRED (DGS10 − CPI YoY)',
      available: true,
    },
  ];
}

export function fromTiming(
  position: ActiveCyclePosition,
  completed: CompletedCycleStats[],
  weeksSinceAth: number | null,
): EvidenceItem[] {
  const medianWeeksHighToLow = completed.length
    ? Math.round(
        [...completed.map((c) => c.daysHighToLow)].sort((a, b) => a - b)[
          Math.floor(completed.length / 2)
        ] / 7,
      )
    : null;

  // Deep into a drawdown is late-bear (low extension); freshly off a high is not.
  const timingExtension = weeksSinceAth != null && medianWeeksHighToLow
    ? clamp(100 - (weeksSinceAth / medianWeeksHighToLow) * 60, 0, 100)
    : null;

  return [
    {
      id:       'timing:phase',
      label:    'Model Cycle Phase',
      category: 'timing',
      reading:  position.currentPhase.replace('-', ' '),
      interpretation: `Day ${position.daysSinceLow} since the ${position.lowDateFmt} cycle low`,
      extension: position.currentPhase === 'accumulation' ? 20
        : position.currentPhase === 'expansion' ? 45
        : position.currentPhase === 'peak-risk' ? 85
        : position.currentPhase === 'distribution' ? 70
        : null,
      weight:    10,
      source:    'Skyline cycle anchors',
      available: position.currentPhase !== 'beyond-model',
      gapReason: position.currentPhase === 'beyond-model'
        ? 'Current cycle has run past the modelled window' : undefined,
    },
    {
      id:       'timing:weeksFromAth',
      label:    'Weeks Since Cycle ATH',
      category: 'timing',
      reading:  weeksSinceAth != null ? `Week ${weeksSinceAth}` : '—',
      interpretation: medianWeeksHighToLow != null && weeksSinceAth != null
        ? `Median historical high-to-low was ${medianWeeksHighToLow} weeks`
        : 'No completed-cycle baseline',
      extension: timingExtension,
      weight:    8,
      source:    'Skyline cycle anchors',
      available: timingExtension != null,
    },
  ];
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

export function buildEvidenceLedger(groups: EvidenceItem[][]): EvidenceLedger {
  const items     = groups.flat();
  const available = items.filter((i) => i.available && i.extension != null);
  const gaps      = items.filter((i) => !i.available || i.extension == null);

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const availWeight = available.reduce((s, i) => s + i.weight, 0);

  const weightedExtension = availWeight > 0
    ? clamp(
        available.reduce((s, i) => s + i.extension! * i.weight, 0) / availWeight,
        0, 100,
      )
    : 50;

  const thesis = thesisFromExtension(weightedExtension);

  return {
    items,
    available,
    gaps,
    weightedExtension,
    thesis,
    coverage: totalWeight > 0 ? availWeight / totalWeight : 0,
    supporting: available.filter((i) => directionOf(i, thesis) === 'supports'),
    weakening:  available.filter((i) => directionOf(i, thesis) === 'weakens'),
  };
}

export function byCategory(ledger: EvidenceLedger, category: EvidenceCategory): EvidenceItem[] {
  return ledger.items.filter((i) => i.category === category);
}
