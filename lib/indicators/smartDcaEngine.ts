// Risk -> suggested DCA multiplier. A separate, purpose-built table from
// riskScore.ts's ALLOCATION_TABLE (which uses different band boundaries for
// general profit-taking guidance) — this one is calibrated specifically for
// "how much bigger/smaller should today's recurring buy be."

export type MultiplierBand = {
  maxScore:   number;
  multiplier: number | 'pause';
  label:      string;
};

export const MULTIPLIER_TABLE: MultiplierBand[] = [
  { maxScore: 0.2, multiplier: 3.0,     label: 'Aggressive Accumulation' },
  { maxScore: 0.3, multiplier: 2.5,     label: 'Strong Accumulation' },
  { maxScore: 0.4, multiplier: 2.0,     label: 'Accumulation' },
  { maxScore: 0.5, multiplier: 1.5,     label: 'Above Normal' },
  { maxScore: 0.6, multiplier: 1.0,     label: 'Normal DCA' },
  { maxScore: 0.7, multiplier: 0.5,     label: 'Reduce' },
  { maxScore: 0.8, multiplier: 0.25,    label: 'Minimal' },
  { maxScore: Infinity, multiplier: 'pause', label: 'Pause' },
];

export function multiplierFor(score: number): MultiplierBand {
  return MULTIPLIER_TABLE.find((b) => score < b.maxScore) ?? MULTIPLIER_TABLE[MULTIPLIER_TABLE.length - 1];
}

export function fmtMultiplier(multiplier: number | 'pause'): string {
  return multiplier === 'pause' ? 'Pause' : `${multiplier.toFixed(2)}x`;
}
