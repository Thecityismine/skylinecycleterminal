// All LTV/rate inputs are decimals internally (25% = 0.25), matching the rest
// of this module — convert from a "25" UI input with `/ 100` at the edges.

export function collateralValue(btcCollateral: number, btcPrice: number): number {
  return btcCollateral * btcPrice;
}

export function ltv(loanBalance: number, collateralValueUsd: number): number {
  return collateralValueUsd > 0 ? loanBalance / collateralValueUsd : 0;
}

// BTC required to open a loan of `loanAmount` at `targetLtv`.
export function btcRequiredForTargetLtv(loanAmount: number, btcPrice: number, targetLtv: number): number {
  if (btcPrice <= 0 || targetLtv <= 0) return 0;
  return loanAmount / (btcPrice * targetLtv);
}

// Max loan obtainable by pledging `btcCollateral` at `targetLtv`.
export function maxLoanAtTargetLtv(btcCollateral: number, btcPrice: number, targetLtv: number): number {
  return btcCollateral * btcPrice * targetLtv;
}

// Collateral value (in USD) required to bring `loanBalance` back to `targetLtv`.
export function requiredCollateralValueForTargetLtv(loanBalance: number, targetLtv: number): number {
  return targetLtv > 0 ? loanBalance / targetLtv : 0;
}
