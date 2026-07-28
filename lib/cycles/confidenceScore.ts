import type { CyclePhase } from '@/lib/cycles/durationModel';

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

// Where the Skyline Score "should" sit if the current phase is behaving as
// the timing model implies. Distance from this target — not the raw score —
// is what feeds the confidence component: a low score during accumulation is
// aligned, a low score during expansion is a mismatch either way.
const PHASE_TARGET_SCORE: Record<CyclePhase, number> = {
  expansion: 55,
  'peak-risk': 75,
  distribution: 60,
  accumulation: 20,
  'beyond-model': 20,
};

export type ConfidenceInputs = {
  avgAbsErrorFraction: number;   // from timingValidation.averageAbsErrorFraction — 0 = perfect
  confirmingCount: number;        // from confirmationSignals
  totalSignals: number;
  skylineScore: number | null;    // 0-100
  phase: CyclePhase;
  priceStructureScore: number;    // 0-100, derived from 20W/200W MA alignment
  macroLiquidityScore?: number;   // 0-100, defaults to neutral — not modeled in v1
};

export type ConfidenceResult = {
  score: number;
  label: 'Low' | 'Moderate' | 'High';
  components: {
    historicalFit: number;
    onChainConfirmation: number;
    skylineAlignment: number;
    priceStructure: number;
    macroLiquidity: number;
  };
};

// Weights match the product spec: historical fit 35%, Skyline Score 20%,
// on-chain confirmation 20%, price structure 15%, macro liquidity 10%.
export function computeTimingConfidence(inputs: ConfidenceInputs): ConfidenceResult {
  const historicalFit = clamp(100 - inputs.avgAbsErrorFraction * 400);
  const onChainConfirmation = inputs.totalSignals > 0
    ? clamp((inputs.confirmingCount / inputs.totalSignals) * 100)
    : 50;

  const target = PHASE_TARGET_SCORE[inputs.phase];
  const skylineAlignment = inputs.skylineScore == null
    ? 50
    : clamp(100 - Math.abs(inputs.skylineScore - target) * 1.5);

  const priceStructure = clamp(inputs.priceStructureScore);
  const macroLiquidity = clamp(inputs.macroLiquidityScore ?? 50);

  const score = Math.round(
    historicalFit * 0.35 +
    skylineAlignment * 0.20 +
    onChainConfirmation * 0.20 +
    priceStructure * 0.15 +
    macroLiquidity * 0.10
  );

  const label = score >= 70 ? 'High' : score >= 45 ? 'Moderate' : 'Low';

  return {
    score,
    label,
    components: {
      historicalFit: Math.round(historicalFit),
      onChainConfirmation: Math.round(onChainConfirmation),
      skylineAlignment: Math.round(skylineAlignment),
      priceStructure: Math.round(priceStructure),
      macroLiquidity: Math.round(macroLiquidity),
    },
  };
}
