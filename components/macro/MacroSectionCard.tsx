import type { Section, Metric } from '@/lib/indicators/macroRisk';

function MetricRow({ m }: { m: Metric }) {
  const unavailable = m.risk == null;
  return (
    <div className="py-3 border-b last:border-0" style={{ borderColor: 'var(--sct-border)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium" style={{ color: 'var(--sct-text)' }}>
          {m.label}
        </span>
        <span className="text-[13px] font-mono shrink-0" style={{ color: unavailable ? 'var(--sct-muted)' : 'var(--sct-text)' }}>
          {m.display}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
          {!unavailable && (
            <div className="h-full rounded-full" style={{ width: `${m.risk}%`, backgroundColor: m.color }} />
          )}
        </div>
        <span className="text-[11px] font-mono shrink-0" style={{ color: m.color }}>
          {m.status}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed mt-1.5" style={{ color: 'var(--sct-muted)' }}>
        {m.note}
      </p>
      <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--sct-muted)', opacity: 0.6 }}>
        {m.source} · {m.cadence}{m.asOf ? ` · as of ${m.asOf}` : ''}
      </p>
    </div>
  );
}

export function MacroSectionCard({ section }: { section: Section }) {
  const total = section.metrics.length;
  const live  = section.metrics.filter(m => m.risk != null).length;

  return (
    <div
      className="rounded-xl border overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--sct-border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold" style={{ color: 'var(--sct-text)' }}>
              {section.title}
            </p>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              {(section.weight * 100).toFixed(0)}% of Macro Risk Score
              {live < total && (
                <span style={{ color: '#E6B450' }}> · {live}/{total} inputs live</span>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-mono font-bold leading-none" style={{ color: section.color }}>
              {section.risk == null ? '—' : Math.round(section.risk)}
              <span className="text-sm font-normal" style={{ color: 'var(--sct-muted)' }}>/100</span>
            </p>
            <p className="text-[11px] font-mono mt-1" style={{ color: section.color }}>
              {section.status}
            </p>
          </div>
        </div>

        <div className="h-1.5 rounded-full overflow-hidden mt-3" style={{ backgroundColor: 'var(--sct-border)' }}>
          {section.risk != null && (
            <div className="h-full rounded-full" style={{ width: `${section.risk}%`, backgroundColor: section.color }} />
          )}
        </div>

        <p className="text-xs leading-relaxed mt-3" style={{ color: 'var(--sct-secondary)' }}>
          {section.blurb}
        </p>
      </div>

      {/* Metrics */}
      <div className="px-5 flex-1">
        {section.metrics.map(m => <MetricRow key={m.key} m={m} />)}
      </div>

      {section.coverage && (
        <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-panel)' }}>
          <p className="text-[10px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            <span className="font-mono uppercase tracking-wider">Coverage · </span>
            {section.coverage}
          </p>
        </div>
      )}
    </div>
  );
}
