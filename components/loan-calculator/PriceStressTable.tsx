"use client";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { StressRow } from '@/lib/loans/stressTest';

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

type Props = {
  rows:       StressRow[];
  onAddPrice: (price: number) => void;
};

export function PriceStressTable({ rows, onAddPrice }: Props) {
  const [customPrice, setCustomPrice] = useState('');

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
        Price Stress Test
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ color: 'var(--sct-muted)' }}>
              <th className="text-left pb-2 pr-4">BTC Price</th>
              <th className="text-right pb-2 pr-4">Collateral Value</th>
              <th className="text-right pb-2 pr-4">LTV</th>
              <th className="text-right pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.btcPrice} style={{ borderTop: '1px solid var(--sct-border)' }}>
                <td className="py-1.5 pr-4" style={{ color: 'var(--sct-text)' }}>{fmtUsd(r.btcPrice)}</td>
                <td className="py-1.5 pr-4 text-right" style={{ color: 'var(--sct-secondary)' }}>{fmtUsd(r.collateralValue)}</td>
                <td className="py-1.5 pr-4 text-right font-semibold" style={{ color: r.zone.color }}>{(r.ltv * 100).toFixed(1)}%</td>
                <td className="py-1.5 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px]" style={{ backgroundColor: r.zone.color + '20', color: r.zone.color }}>
                    {r.zone.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t" style={{ borderColor: 'var(--sct-border)' }}>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Add price</span>
        <input
          type="number"
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value)}
          placeholder="e.g. 33000"
          className="w-28 rounded-md border px-2 py-1 text-xs font-mono outline-none"
          style={{ backgroundColor: 'transparent', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
        />
        <button
          onClick={() => {
            const v = Number(customPrice);
            if (v > 0) { onAddPrice(v); setCustomPrice(''); }
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border transition-all"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          <Plus size={11} /> Add
        </button>
      </div>
    </div>
  );
}
