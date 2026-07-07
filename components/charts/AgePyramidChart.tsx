"use client";

import type { AgePyramidRow } from '@/lib/indicators/capitalAgeStructure';

type Props = {
  rows: AgePyramidRow[];
};

export function AgePyramidChart({ rows }: Props) {
  if (!rows.length) return null;

  const maxSupply = Math.max(...rows.map((r) => r.supplyPct), 1);
  const maxRealized = Math.max(...rows.map((r) => r.realizedCapPct), 1);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Supply %</span>
        <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Realized Cap %</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const leftWidth = (r.supplyPct / maxSupply) * 100;
          const rightWidth = (r.realizedCapPct / maxRealized) * 100;
          const overweight = r.realizedCapPct > r.supplyPct; // paid a premium relative to supply share
          return (
            <div key={r.key} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 72px 1fr' }}>
              {/* left: supply % */}
              <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-mono" style={{ color: 'var(--sct-secondary)' }}>{r.supplyPct.toFixed(1)}%</span>
                <div className="h-3.5 rounded-sm overflow-hidden" style={{ width: 100, backgroundColor: 'var(--sct-border)' }}>
                  <div
                    className="h-full rounded-sm ml-auto"
                    style={{ width: `${leftWidth}%`, backgroundColor: r.color, opacity: 0.55 }}
                  />
                </div>
              </div>

              {/* center: label */}
              <div className="text-center">
                <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>{r.label}</span>
              </div>

              {/* right: realized cap % */}
              <div className="flex items-center gap-2">
                <div className="h-3.5 rounded-sm overflow-hidden" style={{ width: 100, backgroundColor: 'var(--sct-border)' }}>
                  <div
                    className="h-full rounded-sm"
                    style={{ width: `${rightWidth}%`, backgroundColor: r.color }}
                  />
                </div>
                <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: overweight ? '#35D07F' : 'var(--sct-secondary)' }}>
                  {r.realizedCapPct.toFixed(1)}%
                  {overweight && <span title="Realized cap share exceeds supply share — this cohort paid a premium relative to its supply.">▲</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] mt-4" style={{ color: 'var(--sct-muted)' }}>
        Right bar larger than left: that cohort&apos;s realized-cap share exceeds its supply share — it paid a premium relative to how much of the supply it holds.
        Left bar larger than right: that cohort holds more supply than the capital it contributed — typically very old, low-cost-basis coins.
      </p>
    </div>
  );
}
