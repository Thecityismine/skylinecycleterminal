import type { MacroReport } from '@/lib/indicators/macroNarrative';
import { GREEN, AMBER } from '@/lib/indicators/macroRisk';

export function MacroReportPanel({
  report, score, band, color, date,
}: {
  report: MacroReport;
  score:  number | null;
  band:   string;
  color:  string;
  date:   string;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3"
        style={{ borderColor: 'var(--sct-border)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Skyline Macro Report</p>
          <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Generated from live data · {date}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-mono font-bold" style={{ color }}>
            {score ?? '—'}<span className="text-xs font-normal" style={{ color: 'var(--sct-muted)' }}>/100</span>
          </p>
          <p className="text-[11px] font-mono" style={{ color }}>{band}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x"
        style={{ borderColor: 'var(--sct-border)' }}>
        {/* Helping */}
        <div className="p-5">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: GREEN }}>
            What&apos;s helping Bitcoin
          </p>
          {report.helping.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              No macro input is currently in the supportive band.
            </p>
          ) : (
            <ul className="space-y-2">
              {report.helping.map(h => (
                <li key={h.label} className="flex gap-2">
                  <span className="shrink-0" style={{ color: GREEN }}>✓</span>
                  <span className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
                    <span style={{ color: 'var(--sct-text)' }}>{h.label}</span>: {h.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hurting */}
        <div className="p-5" style={{ borderColor: 'var(--sct-border)' }}>
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: AMBER }}>
            What&apos;s hurting Bitcoin
          </p>
          {report.hurting.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              No macro input is currently in the high-risk band.
            </p>
          ) : (
            <ul className="space-y-2">
              {report.hurting.map(h => (
                <li key={h.label} className="flex gap-2">
                  <span className="shrink-0" style={{ color: AMBER }}>⚠</span>
                  <span className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
                    <span style={{ color: 'var(--sct-text)' }}>{h.label}</span>: {h.detail}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--sct-border)' }}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: 'var(--sct-muted)' }}>
          Biggest risk
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>{report.biggestRisk}</p>
      </div>

      <div className="px-5 py-4 border-t" style={{ borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-panel)' }}>
        <p className="text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: 'var(--sct-muted)' }}>
          Bottom line
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--sct-text)' }}>{report.bottomLine}</p>
      </div>
    </div>
  );
}
