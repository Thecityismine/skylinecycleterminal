import type { MacroRiskResult } from '@/lib/indicators/macroRisk';
import { GREEN, RED } from '@/lib/indicators/macroRisk';

export function MacroImpactMeter({ impact, score }: {
  impact: MacroRiskResult['impact'];
  score:  number | null;
}) {
  const isHeadwind = impact.direction === 'headwind';
  const color = impact.direction === 'neutral' ? 'var(--sct-secondary)' : isHeadwind ? RED : GREEN;
  const label = impact.direction === 'neutral' ? 'Macro Neutral'
    : isHeadwind ? 'Macro Headwind' : 'Macro Tailwind';

  // Needle position across a −100 (tailwind) → +100 (headwind) axis.
  const pos = score == null ? 50 : Math.max(0, Math.min(100, score));

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>
        Macro Impact Meter
      </p>
      <p className="text-[11px] leading-relaxed mt-2" style={{ color: 'var(--sct-secondary)' }}>
        If Bitcoin is undervalued today, how hard is the rest of the financial system pushing
        in the other direction?
      </p>

      <div className="flex items-baseline gap-2 mt-4">
        <span className="text-4xl font-mono font-bold" style={{ color }}>
          {impact.direction === 'neutral' ? '—' : `${impact.strength}%`}
        </span>
        <span className="text-sm font-semibold" style={{ color }}>{label}</span>
      </div>

      {/* Axis */}
      <div className="mt-4">
        <div className="relative h-2.5 rounded-full overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${GREEN} 0%, #E6B450 50%, ${RED} 100%)` }}>
          <div className="absolute inset-y-0 w-0.5" style={{ left: '50%', backgroundColor: 'var(--sct-bg)' }} />
        </div>
        <div
          className="w-0 h-0 -mt-0.5"
          style={{
            marginLeft:  `calc(${pos}% - 5px)`,
            borderLeft:  '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop:   `7px solid ${color}`,
          }}
        />
        <div className="flex justify-between text-[10px] font-mono mt-1" style={{ color: 'var(--sct-muted)' }}>
          <span>Tailwind</span>
          <span>Neutral</span>
          <span>Headwind</span>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed mt-4 pt-3 border-t"
        style={{ color: 'var(--sct-muted)', borderColor: 'var(--sct-border)' }}>
        Derived from the Macro Risk Score&apos;s distance from neutral (50). This measures the direction
        and force of the macro backdrop — not the probability of any particular price outcome.
      </p>
    </div>
  );
}
