import { StatCard } from '@/components/dashboard/StatCard';
import type { LoanCalculation } from '@/lib/loans/loanScenario';
import { getLoanRiskBand } from '@/lib/loans/riskScore';

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export function LoanSummaryCards({ calc }: { calc: LoanCalculation }) {
  const band = getLoanRiskBand(calc.riskScore);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <StatCard label="Collateral Value" value={fmtUsd(calc.collateralValue)} sub="At current BTC price" freshness="live" />
      <StatCard label="Starting LTV" value={`${(calc.currentLtv * 100).toFixed(1)}%`} sub="Loan balance / collateral" freshness="live" />
      <StatCard label="Margin-Call Price" value={fmtUsd(calc.marginCallPrice)} sub={`${calc.declineToMarginCallPct.toFixed(1)}% from current price`} accent="var(--sct-amber)" freshness="live" />
      <StatCard label="Liquidation Price" value={fmtUsd(calc.liquidationPrice)} sub={`${calc.declineToLiquidationPct.toFixed(1)}% from current price`} accent="var(--sct-red)" freshness="live" />
      <StatCard label="BTC Decline to Liquidation" value={`${calc.declineToLiquidationPct.toFixed(1)}%`} trend={calc.declineToLiquidationPct < -50 ? 'up' : 'down'} freshness="live" />
      <StatCard label="Risk Level" value={band.label.replace(' Risk', '')} accent={band.color} sub={`${calc.riskScore} / 100`} freshness="live" />
    </div>
  );
}
