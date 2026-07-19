import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { costPerMonth } from '@/lib/loans/interest';
import type { LoanCalculation } from '@/lib/loans/loanScenario';
import type { LoanInputs } from '@/lib/loans/types';

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export function BorrowingCostPanel({ inputs, calc }: { inputs: LoanInputs; calc: LoanCalculation }) {
  const totalRepayment = inputs.loanAmount + calc.estimatedTotalCost;
  const monthly = costPerMonth(calc.estimatedTotalCost, inputs.termMonths);

  return (
    <InsightPanel title="Borrowing Cost">
      <InsightRow label="Principal" value={fmtUsd(inputs.loanAmount)} />
      <InsightRow label="APR" value={`${inputs.annualInterestRatePct.toFixed(1)}%`} />
      <InsightRow label="Origination Fee" value={`${inputs.originationFeePct.toFixed(1)}%`} />
      <InsightRow label={`Interest (${inputs.termMonths}mo)`} value={fmtUsd(calc.annualInterestCost)} />
      <InsightRow label="Origination Fee ($)" value={fmtUsd(calc.originationFee)} />
      <InsightRow label={`Total ${inputs.termMonths}-Month Cost`} value={fmtUsd(calc.estimatedTotalCost)} valueColor="var(--sct-amber)" />
      <InsightRow label="Effective Cost" value={`${calc.effectiveCostPct.toFixed(1)}%`} />
      <InsightRow label="Total Repayment" value={fmtUsd(totalRepayment)} />
      <InsightRow label="Cost per Month" value={fmtUsd(monthly)} />
      <InsightRow label="BTC Appreciation to Break Even" value={`${calc.breakEvenAppreciationPct.toFixed(1)}%`} valueColor="var(--sct-blue)" />
    </InsightPanel>
  );
}
