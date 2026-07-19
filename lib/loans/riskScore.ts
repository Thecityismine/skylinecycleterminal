function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ── Overall 0-100 loan risk score ─────────────────────────────────────────────
// A low score means the current assumptions provide more room today — not a
// guarantee of safety. All five sub-scores are 0 (safest) to 100 (riskiest).

export type LoanRiskInputs = {
  startingLtvRisk:        number;
  marginCushionRisk:      number;
  liquidationCushionRisk: number;
  interestRisk:           number;
  emergencyLiquidityRisk: number;
};

export function calculateLoanRiskScore(input: LoanRiskInputs): number {
  const raw =
    input.startingLtvRisk * 0.40 +
    input.marginCushionRisk * 0.25 +
    input.liquidationCushionRisk * 0.20 +
    input.interestRisk * 0.10 +
    input.emergencyLiquidityRisk * 0.05;
  return Math.round(clamp(raw, 0, 100));
}

// Starting LTV risk: scales against the liquidation threshold itself, since
// "40% LTV" means very different things at a 60% vs 80% liquidation line.
export function scoreStartingLtv(startingLtv: number, liquidationLtv: number): number {
  return liquidationLtv > 0 ? clamp((startingLtv / liquidationLtv) * 100, 0, 100) : 100;
}

// Cushion risk: cushionPct is the (positive) % BTC would need to fall to hit
// the threshold. maxCushion is the cushion size that reads as ~0 risk.
export function scoreCushion(cushionPct: number, maxCushion: number): number {
  return clamp(100 - (cushionPct / maxCushion) * 100, 0, 100);
}

// Interest risk: typical BTC-backed loan APRs run roughly 0-20%.
export function scoreInterest(annualRatePct: number): number {
  return clamp((annualRatePct / 20) * 100, 0, 100);
}

// Emergency liquidity risk: inverse of reserve coverage at a stress price.
// No reserve modeled at all reads as maximum risk — "no contingency plan."
export function scoreEmergencyLiquidity(coveragePct: number | null): number {
  if (coveragePct == null) return 100;
  return clamp(100 - coveragePct, 0, 100);
}

export type LoanRiskLabel = 'very-low' | 'low' | 'moderate' | 'high' | 'critical';

export const LOAN_RISK_BANDS: { key: LoanRiskLabel; label: string; max: number; color: string }[] = [
  { key: 'very-low', label: 'Very Low Risk', max: 20,  color: '#35D07F' },
  { key: 'low',      label: 'Low Risk',      max: 40,  color: '#5B84FF' },
  { key: 'moderate', label: 'Moderate Risk', max: 60,  color: '#EAB84D' },
  { key: 'high',     label: 'High Risk',     max: 80,  color: '#F7931A' },
  { key: 'critical', label: 'Critical',      max: 101, color: '#F85149' },
];

export function getLoanRiskBand(score: number) {
  return LOAN_RISK_BANDS.find((b) => score < b.max) ?? LOAN_RISK_BANDS[LOAN_RISK_BANDS.length - 1];
}

// ── LTV zones (for the stress table / curve — a raw LTV%, not the risk score) ─

export type LtvZoneKey = 'conservative' | 'moderate' | 'elevated' | 'marginWatch' | 'critical' | 'liquidation';

export type LtvZone = { key: LtvZoneKey; label: string; max: number; color: string };

// Bands are relative to the loan's own margin-call/liquidation thresholds so
// they stay meaningful across lenders with different limits — the "critical"
// and "liquidation" bands are pinned to the scenario's actual thresholds.
export function buildLtvZones(marginCallLtv: number, liquidationLtv: number): LtvZone[] {
  const marginWatchStart = marginCallLtv * (5 / 6); // ~50 when marginCall=60, matches spec example
  return [
    { key: 'conservative', label: 'Conservative',   max: 0.25,             color: '#35D07F' },
    { key: 'moderate',     label: 'Moderate',        max: 0.35,             color: '#5B84FF' },
    { key: 'elevated',     label: 'Elevated',        max: marginWatchStart, color: '#EAB84D' },
    { key: 'marginWatch',  label: 'Margin Watch',    max: marginCallLtv,    color: '#F7931A' },
    { key: 'critical',     label: 'Critical',        max: liquidationLtv,  color: '#F85149' },
    { key: 'liquidation',  label: 'Liquidation',     max: Infinity,         color: '#FF2D55' },
  ];
}

export function getLtvZone(ltvValue: number, zones: LtvZone[]): LtvZone {
  return zones.find((z) => ltvValue < z.max) ?? zones[zones.length - 1];
}
