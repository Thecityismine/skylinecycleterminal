import type { ValidationRow } from '@/lib/cycles/timingValidation';

type Props = { rows: ValidationRow[] };

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function signedDays(n: number): string {
  if (n === 0) return '0 days';
  return `${n > 0 ? '+' : ''}${fmt(n)} days`;
}

function errorColor(n: number): string {
  const abs = Math.abs(n);
  if (abs <= 10) return '#35D07F';
  if (abs <= 40) return '#E6B450';
  return '#FF5C5C';
}

export function TimingValidationTable({ rows }: Props) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
        Historical Timing Validation
      </p>
      <p className="text-[11px] mb-4" style={{ color: 'var(--sct-muted)' }}>
        Model vs. actual duration for every completed cycle — the error, not just the box, is what makes this credible.
      </p>

      <div className="space-y-5">
        {rows.map((r) => (
          <div key={r.cycleId} className="space-y-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--sct-text)' }}>{r.label}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(53,208,127,0.25)', backgroundColor: 'rgba(53,208,127,0.05)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>Bull Window</p>
                <p className="text-[11px] font-mono mb-1.5" style={{ color: 'var(--sct-muted)' }}>{r.bullWindowLabel}</p>
                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span style={{ color: 'var(--sct-muted)' }}>Model: {fmt(r.modelBullDays)}d</span>
                  <span style={{ color: 'var(--sct-text)' }}>Actual: {fmt(r.actualBullDays)}d</span>
                </div>
                <p className="text-xs font-mono font-semibold text-right mt-1" style={{ color: errorColor(r.bullError) }}>
                  {signedDays(r.bullError)} ({r.bullErrorPct >= 0 ? '+' : ''}{r.bullErrorPct.toFixed(1)}%)
                </p>
              </div>

              <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(248,81,73,0.25)', backgroundColor: 'rgba(248,81,73,0.05)' }}>
                <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>Bear Window</p>
                <p className="text-[11px] font-mono mb-1.5" style={{ color: 'var(--sct-muted)' }}>{r.bearWindowLabel}</p>
                <div className="flex items-baseline justify-between text-xs font-mono">
                  <span style={{ color: 'var(--sct-muted)' }}>Model: {fmt(r.modelBearDays)}d</span>
                  <span style={{ color: 'var(--sct-text)' }}>Actual: {fmt(r.actualBearDays)}d</span>
                </div>
                <p className="text-xs font-mono font-semibold text-right mt-1" style={{ color: errorColor(r.bearError) }}>
                  {signedDays(r.bearError)} ({r.bearErrorPct >= 0 ? '+' : ''}{r.bearErrorPct.toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>
        ))}

        {!rows.length && (
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>No completed cycles to validate yet.</p>
        )}
      </div>
    </div>
  );
}
