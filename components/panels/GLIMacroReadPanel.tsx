import type { GLICurrentStats } from '@/lib/indicators/gliLag';
import { SIGNAL_COLOR, SIGNAL_LABEL } from '@/lib/indicators/gliLag';

type Props = {
  current:   GLICurrentStats;
  macroRead: string;
};

export function GLIMacroReadPanel({ current, macroRead }: Props) {
  const color = SIGNAL_COLOR[current.signal];

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-[10px] font-mono tracking-widest uppercase mb-2" style={{ color: 'var(--sct-muted)' }}>GLI Macro Read</p>
      <p className="text-sm font-semibold mb-2" style={{ color }}>{SIGNAL_LABEL[current.signal]}</p>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-text)' }}>{macroRead}</p>
      <p className="text-[10px] mt-3 leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
        Confirmation, not a crystal ball — this is a macro overlay. Weigh it alongside price structure, seasonality, DXY, and on-chain signals before acting.
      </p>
    </div>
  );
}
