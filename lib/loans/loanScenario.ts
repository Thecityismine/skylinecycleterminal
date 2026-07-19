import { collateralValue, ltv } from './ltv';
import { marginCallPrice, liquidationPrice, pctChange, futureLoanBalance } from './liquidation';
import { accruedInterest, originationFeeAmount, totalLoanCost, effectiveCostPct, breakEvenAppreciationPct } from './interest';
import { repaymentRequired, emergencyReserveCoverage } from './actions';
import {
  calculateLoanRiskScore, scoreStartingLtv, scoreCushion, scoreInterest, scoreEmergencyLiquidity,
  getLoanRiskBand,
} from './riskScore';
import type { LoanRiskLabel } from './riskScore';

export type LoanScenario = {
  btcEntryPrice:      number;
  currentBtcPrice:    number;
  btcCollateral:      number;

  principal:          number;
  outstandingBalance: number;

  annualInterestRate: number; // decimal, 0.11 = 11%
  termMonths:         number;
  originationFeePct:  number; // decimal, 0.01 = 1%

  targetLtv:          number; // decimal
  marginCallLtv:       number; // decimal
  liquidationLtv:      number; // decimal

  emergencyCashReserve?: number;
};

export type LoanCalculation = {
  collateralValue:          number;
  currentLtv:                number; // decimal

  marginCallPrice:           number;
  liquidationPrice:          number;
  futureLiquidationPrice:    number; // after a full term's accrued interest/fees

  declineToMarginCallPct:    number;
  declineToLiquidationPct:   number;

  annualInterestCost:        number;
  originationFee:            number;
  estimatedTotalCost:        number;
  effectiveCostPct:          number;
  breakEvenAppreciationPct:  number;

  emergencyReserveCoveragePct: number | null;
  repaymentToRestoreTarget:    number;

  riskScore:  number;
  riskLabel:  LoanRiskLabel;
  riskColor:  string;
};

export function calculateLoanScenario(scenario: LoanScenario): LoanCalculation {
  if (scenario.btcCollateral <= 0 || scenario.currentBtcPrice <= 0 || scenario.outstandingBalance < 0) {
    throw new Error('Invalid loan scenario inputs');
  }

  const collatValue = collateralValue(scenario.btcCollateral, scenario.currentBtcPrice);
  const currentLtv = ltv(scenario.outstandingBalance, collatValue);

  const mcPrice  = marginCallPrice(scenario.outstandingBalance, scenario.btcCollateral, scenario.marginCallLtv);
  const liqPrice = liquidationPrice(scenario.outstandingBalance, scenario.btcCollateral, scenario.liquidationLtv);

  const declineToMarginCallPct  = pctChange(scenario.currentBtcPrice, mcPrice);
  const declineToLiquidationPct = pctChange(scenario.currentBtcPrice, liqPrice);

  const termYears = scenario.termMonths / 12;
  const interestCost = accruedInterest(scenario.principal, scenario.annualInterestRate, termYears);
  const originationFee = originationFeeAmount(scenario.principal, scenario.originationFeePct);
  const totalCost = totalLoanCost(interestCost, originationFee);

  const endOfTermBalance = futureLoanBalance(scenario.principal, interestCost, originationFee);
  const futureLiqPrice = liquidationPrice(endOfTermBalance, scenario.btcCollateral, scenario.liquidationLtv);

  const repaymentToRestoreTarget = repaymentRequired(collatValue, scenario.outstandingBalance, scenario.targetLtv);
  const emergencyReserveCoveragePct = scenario.emergencyCashReserve != null
    ? emergencyReserveCoverage(scenario.emergencyCashReserve, repaymentToRestoreTarget).coveragePct
    : null;

  const startingLtvRisk = scoreStartingLtv(scenario.targetLtv, scenario.liquidationLtv);
  const marginCushionRisk = scoreCushion(Math.abs(declineToMarginCallPct), 80);
  const liquidationCushionRisk = scoreCushion(Math.abs(declineToLiquidationPct), 90);
  const interestRisk = scoreInterest(scenario.annualInterestRate * 100);
  const emergencyLiquidityRisk = scoreEmergencyLiquidity(emergencyReserveCoveragePct);

  const riskScore = calculateLoanRiskScore({
    startingLtvRisk, marginCushionRisk, liquidationCushionRisk, interestRisk, emergencyLiquidityRisk,
  });
  const riskBand = getLoanRiskBand(riskScore);

  return {
    collateralValue: collatValue,
    currentLtv,
    marginCallPrice: mcPrice,
    liquidationPrice: liqPrice,
    futureLiquidationPrice: futureLiqPrice,
    declineToMarginCallPct,
    declineToLiquidationPct,
    annualInterestCost: interestCost,
    originationFee,
    estimatedTotalCost: totalCost,
    effectiveCostPct: effectiveCostPct(totalCost, scenario.principal),
    breakEvenAppreciationPct: breakEvenAppreciationPct(totalCost, collatValue),
    emergencyReserveCoveragePct,
    repaymentToRestoreTarget,
    riskScore,
    riskLabel: riskBand.key,
    riskColor: riskBand.color,
  };
}
