"use client";

import { CYCLE_PHASES, CYCLE_PHASE_LABEL, CYCLE_PHASE_COLOR } from '@/lib/indicators/seasonality';
import type { CyclePhase } from '@/lib/indicators/seasonality';

type Props = {
  selected:           CyclePhase | null;
  onSelect:           (phase: CyclePhase | null) => void;
  showVolatility:     boolean;
  onToggleVolatility: () => void;
};

export function CyclePhaseFilters({ selected, onSelect, showVolatility, onToggleVolatility }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CYCLE_PHASES.map((phase) => {
        const isActive = selected === phase;
        const color = CYCLE_PHASE_COLOR[phase];
        return (
          <button
            key={phase}
            onClick={() => onSelect(isActive ? null : phase)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: isActive ? `${color}22` : 'transparent',
              borderColor:     isActive ? color : 'var(--sct-border)',
              color:           isActive ? color : 'var(--sct-muted)',
            }}
          >
            {CYCLE_PHASE_LABEL[phase]}s
          </button>
        );
      })}

      <button
        onClick={() => onSelect(null)}
        className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
        style={{ backgroundColor: 'transparent', borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
      >
        Clear
      </button>

      <div className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--sct-border)' }} />

      <button
        onClick={onToggleVolatility}
        className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
        style={{
          backgroundColor: showVolatility ? 'var(--sct-border)' : 'transparent',
          borderColor:     'var(--sct-border)',
          color:           showVolatility ? 'var(--sct-text)' : 'var(--sct-muted)',
        }}
      >
        Show Volatility
      </button>
    </div>
  );
}
