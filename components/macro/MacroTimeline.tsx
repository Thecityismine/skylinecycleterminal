import type { MacroEra } from '@/lib/indicators/macroNarrative';

export function MacroTimeline({ eras }: { eras: MacroEra[] }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Macro Timeline</p>
      <p className="text-xs mt-0.5 mb-5" style={{ color: 'var(--sct-muted)' }}>
        Every Bitcoin cycle has had a macro cause behind it. The pattern is consistent enough to be
        worth knowing, but it is a historical tendency shaped by many forces — not a rule.
      </p>

      <div className="relative pl-6">
        {/* Spine */}
        <div className="absolute left-[5px] top-2 bottom-2 w-px" style={{ backgroundColor: 'var(--sct-border)' }} />

        <div className="space-y-5">
          {eras.map(era => (
            <div key={era.period} className="relative">
              <span
                className="absolute -left-6 top-1.5 w-[11px] h-[11px] rounded-full border-2"
                style={{
                  backgroundColor: era.current ? era.color : 'var(--sct-card)',
                  borderColor:     era.color,
                  boxShadow:       era.current ? `0 0 12px ${era.color}88` : undefined,
                }}
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-xs font-mono font-semibold" style={{ color: era.color }}>
                  {era.period}
                </span>
                <span className="text-[13px] font-medium" style={{ color: 'var(--sct-text)' }}>
                  {era.event}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                <p className="text-[11px] font-mono" style={{ color: 'var(--sct-secondary)' }}>
                  ↓ {era.liquidity}
                </p>
                <p className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                  ↓ {era.outcome}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
