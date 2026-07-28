import { Check, X, HelpCircle } from 'lucide-react';
import type { ConfirmationSummary } from '@/lib/cycles/confirmationSignals';

type Props = { confirmation: ConfirmationSummary };

const STATUS_CONFIG = {
  confirming: { icon: Check, color: '#35D07F', label: 'Confirming' },
  'not-confirming': { icon: X, color: '#FF5C5C', label: 'Not Confirming' },
  unavailable: { icon: HelpCircle, color: 'var(--sct-muted)', label: 'Unavailable' },
} as const;

export function BottomConfirmationPanel({ confirmation }: Props) {
  const { signals, confirmingCount, total } = confirmation;
  const ratio = total > 0 ? confirmingCount / total : 0;
  const scoreColor = ratio >= 0.6 ? '#35D07F' : ratio >= 0.35 ? '#E6B450' : 'var(--sct-muted)';

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          Bottom Confirmation Panel
        </p>
        <p className="text-sm font-mono font-bold" style={{ color: scoreColor }}>
          {confirmingCount} of {total}
        </p>
      </div>
      <p className="text-[11px] mb-4" style={{ color: 'var(--sct-muted)' }}>
        The timer alone is not a signal — these checks confirm (or don&apos;t) whether conditions actually support the modeled phase.
      </p>

      <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
        {signals.map((s) => {
          const cfg = STATUS_CONFIG[s.status];
          const Icon = cfg.icon;
          return (
            <div key={s.key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="flex items-center justify-center rounded-full shrink-0"
                  style={{ width: 18, height: 18, backgroundColor: cfg.color + '1A', color: cfg.color }}
                >
                  <Icon size={11} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--sct-text)' }}>{s.label}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--sct-muted)' }}>{s.detail}</p>
                </div>
              </div>
              <span className="text-[11px] font-mono shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
