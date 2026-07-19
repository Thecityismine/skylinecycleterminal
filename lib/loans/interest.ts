// Simple interest, matching most BTC-backed lenders' published APR quotes —
// the exact accrual method (monthly payment / accrued / deducted upfront)
// varies by lender, disclosed in RiskDisclosure rather than modeled per-lender.
export function accruedInterest(principal: number, annualRate: number, termYears: number): number {
  return principal * annualRate * termYears;
}

export function originationFeeAmount(principal: number, originationFeePct: number): number {
  return principal * originationFeePct;
}

export function totalLoanCost(interest: number, originationFee: number): number {
  return interest + originationFee;
}

export function effectiveCostPct(totalCost: number, principal: number): number {
  return principal > 0 ? (totalCost / principal) * 100 : 0;
}

// How much collateral value must appreciate to offset the financing cost —
// not a claim that borrowing is profitable, just the breakeven bar.
export function breakEvenAppreciationPct(totalCost: number, collateralValueUsd: number): number {
  return collateralValueUsd > 0 ? (totalCost / collateralValueUsd) * 100 : 0;
}

export function costPerMonth(totalCost: number, termMonths: number): number {
  return termMonths > 0 ? totalCost / termMonths : 0;
}
