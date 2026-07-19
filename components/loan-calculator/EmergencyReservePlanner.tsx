"use client";

import { useState } from 'react';
import { collateralValue } from '@/lib/loans/ltv';
import { repaymentRequired, emergencyReserveCoverage } from '@/lib/loans/actions';

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

type Props = {
  loanBalance:          number;
  btcCollateral:        number;
  targetLtvPct:         number;
  emergencyCashReserve: number;
  onChangeReserve:      (v: number) => void;
  suggestedStressPrice: number;
};

export function EmergencyReservePlanner({
  loanBalance, btcCollateral, targetLtvPct, emergencyCashReserve, onChangeReserve, suggestedStressPrice,
}: Props) {
  const [stressPrice, setStressPrice] = useState(Math.round(suggestedStressPrice));

  // Re-sync during render (not in an effect) when the suggested margin-call price
  // itself changes — the standard React pattern for adjusting state in response
  // to a prop change without an extra render pass.
  const [prevSuggested, setPrevSuggested] = useState(suggestedStressPrice);
  if (suggestedStressPrice !== prevSuggested) {
    setPrevSuggested(suggestedStressPrice);
    setStressPrice(Math.round(suggestedStressPrice));
  }

  const stressCollateralValue = collateralValue(btcCollateral, stressPrice);
  const repayNeeded = repaymentRequired(stressCollateralValue, loanBalance, targetLtvPct / 100);
  const { coveragePct, covered } = emergencyReserveCoverage(emergencyCashReserve, repayNeeded);

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>Emergency Reserve Planner</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Cash available for margin call</span>
          <div className="flex items-center rounded-md border px-3" style={{ borderColor: 'var(--sct-border)' }}>
            <span className="text-sm font-mono mr-1" style={{ color: 'var(--sct-muted)' }}>$</span>
            <input
              type="number"
              value={emergencyCashReserve}
              onChange={(e) => onChangeReserve(Number(e.target.value))}
              className="w-full bg-transparent py-2 text-sm font-mono outline-none"
              style={{ color: 'var(--sct-text)' }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Stress-test BTC price</span>
          <div className="flex items-center rounded-md border px-3" style={{ borderColor: 'var(--sct-border)' }}>
            <span className="text-sm font-mono mr-1" style={{ color: 'var(--sct-muted)' }}>$</span>
            <input
              type="number"
              value={stressPrice}
              onChange={(e) => setStressPrice(Number(e.target.value))}
              className="w-full bg-transparent py-2 text-sm font-mono outline-none"
              style={{ color: 'var(--sct-text)' }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--sct-border)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Repayment required to restore {targetLtvPct}% LTV</p>
          <p className="text-lg font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{fmtUsd(repayNeeded)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Reserve Coverage</p>
          <p className="text-lg font-mono font-bold" style={{ color: covered ? 'var(--sct-green)' : 'var(--sct-red)' }}>
            {coveragePct.toFixed(0)}%
          </p>
        </div>
      </div>
      <p className="text-xs font-semibold" style={{ color: covered ? 'var(--sct-green)' : 'var(--sct-red)' }}>
        {covered ? 'Covered' : 'Not covered — reserve falls short at this price'}
      </p>
    </div>
  );
}
