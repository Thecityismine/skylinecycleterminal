"use client";

import { useState } from 'react';
import { maxLoanAtLiquidationPrice } from '@/lib/loans/actions';

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

type Props = {
  btcCollateral:  number;
  liquidationLtvPct: number;
  defaultDesiredPrice: number;
};

// "I believe BTC could realistically fall to $X — what's the largest loan
// that keeps liquidation at or below that price?"
export function ReverseCalculator({ btcCollateral, liquidationLtvPct, defaultDesiredPrice }: Props) {
  const [desiredPrice, setDesiredPrice] = useState(Math.round(defaultDesiredPrice));

  const maxLoan = maxLoanAtLiquidationPrice(btcCollateral, desiredPrice, liquidationLtvPct / 100);

  return (
    <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>Reverse Calculator</p>
      <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
        Design the loan around a price you believe Bitcoin could realistically reach.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
        <div className="space-y-1">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Desired liquidation price</span>
          <div className="flex items-center rounded-md border px-3" style={{ borderColor: 'var(--sct-border)' }}>
            <span className="text-sm font-mono mr-1" style={{ color: 'var(--sct-muted)' }}>$</span>
            <input
              type="number"
              value={desiredPrice}
              onChange={(e) => setDesiredPrice(Number(e.target.value))}
              className="w-full bg-transparent py-2 text-sm font-mono outline-none"
              style={{ color: 'var(--sct-text)' }}
            />
          </div>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Maximum safe loan</p>
          <p className="text-2xl font-mono font-bold" style={{ color: '#35D07F' }}>{fmtUsd(maxLoan)}</p>
        </div>
      </div>
      <p className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
        Using {btcCollateral.toFixed(4)} BTC collateral at a {liquidationLtvPct}% liquidation LTV.
      </p>
    </div>
  );
}
