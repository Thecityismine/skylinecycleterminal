"use client";

import { useState } from 'react';
import { additionalBtcNeeded, repaymentRequired } from '@/lib/loans/actions';

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

type Props = {
  loanBalance:       number;
  btcCollateral:     number;
  currentBtcPrice:   number;
  collateralValue:   number;
  defaultTargetLtvPct: number;
};

// "How much BTC must I add?" and "How much must I repay?" — the two ways to
// return a loan to a safer LTV, shown side by side per the spec.
export function CollateralActionsPanel({ loanBalance, btcCollateral, currentBtcPrice, collateralValue, defaultTargetLtvPct }: Props) {
  const [targetLtvPct, setTargetLtvPct] = useState(defaultTargetLtvPct);
  const targetLtv = targetLtvPct / 100;

  const btcNeeded = additionalBtcNeeded(loanBalance, btcCollateral, currentBtcPrice, targetLtv);
  const repayNeeded = repaymentRequired(collateralValue, loanBalance, targetLtv);

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>Collateral Actions</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>Restore to</span>
          <input
            type="number"
            value={targetLtvPct}
            onChange={(e) => setTargetLtvPct(Number(e.target.value))}
            className="w-16 rounded-md border px-2 py-1 text-xs font-mono outline-none"
            style={{ backgroundColor: 'transparent', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
          />
          <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>% LTV</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--sct-border)' }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>Add Collateral</p>
          <p className="text-2xl font-mono font-bold" style={{ color: '#35D07F' }}>{btcNeeded.toFixed(4)} BTC</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>≈ {fmtUsd(btcNeeded * currentBtcPrice)} at current price</p>
        </div>
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--sct-border)' }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>Repay Loan</p>
          <p className="text-2xl font-mono font-bold" style={{ color: '#5B84FF' }}>{fmtUsd(repayNeeded)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>Principal reduction, no added BTC</p>
        </div>
      </div>
    </div>
  );
}
