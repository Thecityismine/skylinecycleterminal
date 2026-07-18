import { PHASE_LABEL, PHASE_COLOR } from '@/lib/indicators/marketRotation';
import type { CycleSegment } from '@/lib/indicators/marketRotation';

export function RotationTimeline({ segments }: { segments: CycleSegment[] }) {
  if (!segments.length) return null;
  const recent = segments.slice(-6);

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-[10px] font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
        Cycle Timeline
      </p>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {recent.map((s, i) => (
          <div key={`${s.startTime}-${i}`} className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-center gap-1" style={{ minWidth: 100 }}>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: PHASE_COLOR[s.phase] }} />
              <span className="text-xs font-semibold" style={{ color: PHASE_COLOR[s.phase] }}>{PHASE_LABEL[s.phase]}</span>
              <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>{s.days} days</span>
            </div>
            <span style={{ color: 'var(--sct-muted)' }}>→</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1 shrink-0" style={{ minWidth: 70 }}>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--sct-btc)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--sct-btc)' }}>Today</span>
        </div>
      </div>
    </div>
  );
}
