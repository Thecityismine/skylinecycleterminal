"use client";

import type { LagCorrelationResult } from '@/lib/indicators/gliLag';

type Props = {
  lagTests:      LagCorrelationResult[];
  selectedLag:   number;
  onSelectLag:   (lag: number) => void;
};

function barColor(corr: number | null): string {
  if (corr == null) return 'var(--sct-border)';
  const abs = Math.abs(corr);
  if (abs >= 0.6) return '#35D07F';
  if (abs >= 0.3) return '#E6B450';
  return '#F85149';
}

export function GLILagOptimizerPanel({ lagTests, selectedLag, onSelectLag }: Props) {
  const best = lagTests.reduce<LagCorrelationResult | null>((acc, t) => {
    if (t.correlation == null) return acc;
    if (!acc || acc.correlation == null || t.correlation > acc.correlation) return t;
    return acc;
  }, null);

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>Lag Optimizer</p>
        {best && (
          <p className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
            Best: <span style={{ color: '#35D07F' }}>{best.lagDays}D</span> ({best.correlation!.toFixed(2)})
          </p>
        )}
      </div>
      <div className="space-y-2">
        {lagTests.map(t => {
          const isSelected = t.lagDays === selectedLag;
          const isBest = best?.lagDays === t.lagDays;
          const width = t.correlation != null ? Math.min(100, Math.abs(t.correlation) * 100) : 0;
          return (
            <button
              key={t.lagDays}
              onClick={() => onSelectLag(t.lagDays)}
              className="w-full grid grid-cols-[48px_1fr_64px] items-center gap-2 text-left rounded px-1.5 py-1 transition-colors"
              style={{ backgroundColor: isSelected ? 'rgba(247,147,26,0.08)' : 'transparent' }}
            >
              <span className="font-mono text-[11px]" style={{ color: isSelected ? '#F7931A' : 'var(--sct-secondary)' }}>
                {t.lagDays}D{isBest ? ' ★' : ''}
              </span>
              <div style={{ width: '100%', height: 6, backgroundColor: 'var(--sct-border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${width}%`, height: '100%', backgroundColor: barColor(t.correlation), borderRadius: 3 }} />
              </div>
              <span className="font-mono text-[11px] text-right" style={{ color: 'var(--sct-text)' }}>
                {t.correlation != null ? t.correlation.toFixed(2) : '—'}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] mt-3" style={{ color: 'var(--sct-muted)' }}>
        Correlation of 30-day BTC returns vs. lag-shifted GLI returns. Click a row to switch the active lag.
      </p>
    </div>
  );
}
