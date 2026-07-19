import { requiredCollateralValueForTargetLtv } from './ltv';

// How much additional BTC must be pledged to bring the loan back to `targetLtv`
// at the current BTC price, without repaying any principal.
export function additionalBtcNeeded(
  loanBalance: number,
  currentBtcCollateral: number,
  currentBtcPrice: number,
  targetLtv: number,
): number {
  if (currentBtcPrice <= 0) return 0;
  const requiredCollateralValue = requiredCollateralValueForTargetLtv(loanBalance, targetLtv);
  const requiredBtc = requiredCollateralValue / currentBtcPrice;
  return Math.max(0, requiredBtc - currentBtcCollateral);
}

// How much principal must be repaid to bring the loan back to `targetLtv`
// at the current collateral value, without adding BTC.
export function repaymentRequired(
  collateralValueUsd: number,
  loanBalance: number,
  targetLtv: number,
): number {
  const targetLoanBalance = collateralValueUsd * targetLtv;
  return Math.max(0, loanBalance - targetLoanBalance);
}

// Whether an emergency cash reserve is enough to cover the repayment needed
// to restore `targetLtv` at a given (stressed) BTC price.
export function emergencyReserveCoverage(
  emergencyCashReserve: number,
  repaymentNeeded: number,
): { coveragePct: number; covered: boolean } {
  if (repaymentNeeded <= 0) return { coveragePct: 100, covered: true };
  const coveragePct = (emergencyCashReserve / repaymentNeeded) * 100;
  return { coveragePct, covered: coveragePct >= 100 };
}

// Reverse calculator: the largest loan that keeps liquidation at or below
// `desiredLiquidationPrice`, given a fixed BTC collateral amount.
export function maxLoanAtLiquidationPrice(
  btcCollateral: number,
  desiredLiquidationPrice: number,
  liquidationLtv: number,
): number {
  return btcCollateral * desiredLiquidationPrice * liquidationLtv;
}
