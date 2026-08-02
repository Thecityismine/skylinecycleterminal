import type { Scenario } from '@/lib/indicators/macroNarrative';

export function MacroScenarios({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Scenario Engine</p>
        <p className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
          Scenario planning · not predictions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {scenarios.map(s => (
          <div
            key={s.name}
            className="rounded-xl border p-5 flex flex-col"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold" style={{ color: s.color }}>{s.name}</p>
              <p className="text-2xl font-mono font-bold" style={{ color: s.color }}>{s.probability}%</p>
            </div>

            <div className="h-1 rounded-full overflow-hidden mt-2" style={{ backgroundColor: 'var(--sct-border)' }}>
              <div className="h-full rounded-full" style={{ width: `${s.probability}%`, backgroundColor: s.color }} />
            </div>

            <ul className="mt-4 space-y-1.5">
              {s.drivers.map(d => (
                <li key={d} className="flex gap-2 text-[11px] leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
                  <span style={{ color: s.color }}>·</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--sct-border)' }}>
              <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>
                Bitcoin framing
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-text)' }}>{s.btcFraming}</p>
            </div>

            <p className="text-[11px] leading-relaxed mt-3" style={{ color: 'var(--sct-muted)' }}>{s.note}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed mt-3" style={{ color: 'var(--sct-muted)' }}>
        The base case always carries 50%; the remaining 50% is split between the bull and bear paths
        in proportion to the Macro Risk Score&apos;s distance from neutral. Levels referenced are Bitcoin&apos;s
        own moving averages and prior extremes — computed from price history, not price targets.
      </p>
    </div>
  );
}
