import type { CorrelationRow } from '@/lib/indicators/macroRisk';

/** Blue for negative, orange-red for positive, muted through zero. */
function corrColor(v: number | null): string {
  if (v == null) return 'var(--sct-muted)';
  const a = Math.min(1, Math.abs(v));
  return v >= 0
    ? `rgba(247, 147, 26, ${0.15 + a * 0.75})`
    : `rgba(59, 130, 246, ${0.15 + a * 0.75})`;
}

function Cell({ v }: { v: number | null }) {
  return (
    <td className="px-4 py-3">
      <span
        className="inline-block min-w-[62px] text-center rounded px-2 py-1 text-xs font-mono font-semibold"
        style={{
          backgroundColor: corrColor(v),
          color: v == null ? 'var(--sct-muted)' : '#0D1117',
        }}
      >
        {v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2)}
      </span>
    </td>
  );
}

export function MacroCorrelationMatrix({ rows }: { rows: CorrelationRow[] }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--sct-border)' }}>
      <div className="px-5 py-4 border-b" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Correlation Matrix</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
          Pearson correlation of weekly log returns. High positive correlation to equities means
          Bitcoin is being traded as risk, not as a hedge.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ backgroundColor: 'var(--sct-panel)', color: 'var(--sct-muted)' }}>
              {['Pair', '13-Week', '52-Week', 'What it means'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium tracking-wider uppercase text-[10px] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} style={{
                backgroundColor: i % 2 === 0 ? 'var(--sct-card)' : 'var(--sct-panel)',
                borderTop: '1px solid var(--sct-border)',
              }}>
                <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: 'var(--sct-text)' }}>
                  {r.label}
                </td>
                <Cell v={r.short} />
                <Cell v={r.long} />
                <td className="px-4 py-3 leading-relaxed min-w-[280px]" style={{ color: 'var(--sct-muted)' }}>
                  {r.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
