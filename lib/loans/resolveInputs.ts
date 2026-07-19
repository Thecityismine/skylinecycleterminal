import { btcRequiredForTargetLtv, maxLoanAtTargetLtv, collateralValue } from './ltv';
import type { LoanInputs } from './types';

export type ResolvedLoanFields = {
  loanAmount:    number;
  btcCollateral: number;
  targetLtvPct:  number;
};

// Applies the active input mode's "given 2, solve for the 3rd" derivation.
// The two fields the mode treats as direct inputs pass through unchanged;
// the third is computed fresh from the current BTC price every call.
export function resolveInputs(inputs: LoanInputs): ResolvedLoanFields {
  const { mode, loanAmount, btcCollateral, targetLtvPct, currentBtcPrice } = inputs;

  if (mode === 'loanAmount') {
    return {
      loanAmount,
      btcCollateral: btcRequiredForTargetLtv(loanAmount, currentBtcPrice, targetLtvPct / 100),
      targetLtvPct,
    };
  }

  if (mode === 'btcCollateral') {
    return {
      loanAmount: maxLoanAtTargetLtv(btcCollateral, currentBtcPrice, targetLtvPct / 100),
      btcCollateral,
      targetLtvPct,
    };
  }

  // 'targetLtv' mode — loan amount and collateral are the direct inputs; LTV is derived.
  const cv = collateralValue(btcCollateral, currentBtcPrice);
  return {
    loanAmount,
    btcCollateral,
    targetLtvPct: cv > 0 ? (loanAmount / cv) * 100 : 0,
  };
}
