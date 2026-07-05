"use client";

import { CYCLE_PHASES, CYCLE_PHASE_LABEL, CYCLE_PHASE_COLOR, CYCLE_PHASE_DESCRIPTION } from '@/lib/indicators/seasonality';
import type { CyclePhase } from '@/lib/indicators/seasonality';

type Props = {
  currentPhase: CyclePhase;
  nextPhase:    CyclePhase;
};

export function FourYearCyclePanel({ currentPhase, nextPhase }: Props) {
  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          4-Year Cycle Framework
        </p>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span style={{ color: 'var(--sct-muted)' }}>
            Current: <span style={{ color: CYCLE_PHASE_COLOR[currentPhase] }}>{CYCLE_PHASE_LABEL[currentPhase]}</span>
          </span>
          <span style={{ color: 'var(--sct-muted)' }}>
            Next: <span style={{ color: CYCLE_PHASE_COLOR[nextPhase] }}>{CYCLE_PHASE_LABEL[nextPhase]}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CYCLE_PHASES.map((phase) => {
          const isActive = phase === currentPhase;
          const color = CYCLE_PHASE_COLOR[phase];
          return (
            <div
              key={phase}
              className="rounded-lg border p-3.5 space-y-1.5 transition-all"
              style={{
                borderColor:     isActive ? color : 'var(--sct-border)',
                backgroundColor: isActive ? `${color}14` : 'transparent',
              }}
            >
              <p className="text-xs font-bold tracking-wide" style={{ color }}>
                {CYCLE_PHASE_LABEL[phase].toUpperCase()}
                {isActive && <span className="ml-1.5 text-[9px] font-mono" style={{ color }}>● CURRENT</span>}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
                {CYCLE_PHASE_DESCRIPTION[phase]}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
        Seasonality is not a trade signal by itself. It is a probability layer that becomes useful when it agrees with
        trend, liquidity, on-chain data, and the Skyline Cycle Score.
      </p>
    </div>
  );
}
