export function marginCallPrice(loanBalance: number, btcCollateral: number, marginCallLtv: number): number {
  if (btcCollateral <= 0 || marginCallLtv <= 0) return 0;
  return loanBalance / (btcCollateral * marginCallLtv);
}

export function liquidationPrice(loanBalance: number, btcCollateral: number, liquidationLtv: number): number {
  if (btcCollateral <= 0 || liquidationLtv <= 0) return 0;
  return loanBalance / (btcCollateral * liquidationLtv);
}

// % change from `fromPrice` to `toPrice` — negative means toPrice is lower.
export function pctChange(fromPrice: number, toPrice: number): number {
  return fromPrice > 0 ? ((toPrice - fromPrice) / fromPrice) * 100 : 0;
}

// Loan balance after interest/fees accrue onto the principal — used to show
// how the liquidation price drifts over the loan term as balance grows.
export function futureLoanBalance(principal: number, accruedInterest: number, originationFee: number): number {
  return principal + accruedInterest + originationFee;
}
