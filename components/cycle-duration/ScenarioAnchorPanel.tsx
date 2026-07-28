"use client";

import type { AnchorMode, ConfirmedLowResult } from '@/lib/cycles/autoAnchor';

type Props = {
  anchorMode: AnchorMode;
  onAnchorModeChange: (mode: AnchorMode) => void;
  manualDate: string;
  onManualDateChange: (date: string) => void;
  confirmedLow: ConfirmedLowResult;
  modeledLowDateFmt: string;
};

const ANCHOR_MODES: { key: AnchorMode; label: string }[] = [
  { key: 'fixed', label: 'Fixed Model' },
  { key: 'confirmed', label: 'Confirmed Low' },
  { key: 'manual', label: 'Manual Anchor' },
];

const SCENARIOS = [
  {
    label: 'Base Case',
    color: '#35D07F',
    desc: 'A bottom forms near the model window. BTC enters a multi-year expansion, and peak timing lands near the historical 1,064-day duration.',
  },
  {
    label: 'Early-Bottom Case',
    color: '#5B84FF',
    desc: 'The market bottoms before the modeled date. The expansion box re-anchors from the confirmed low, pulling the whole timeline forward.',
  },
  {
    label: 'Late-Bottom Case',
    color: '#E6B450',
    desc: 'Price remains weak beyond the modeled bottom date. The model anchor shifts to whatever low eventually gets confirmed — the box does not force a date.',
  },
  {
    label: 'Structural-Break Case',
    color: '#FF5C5C',
    desc: 'The 1,064 / 364-day timing relationship no longer holds. ETF and institutional flows alter the historical pattern — treat the model as broken until it re-validates on a new cycle.',
  },
];

export function ScenarioAnchorPanel({
  anchorMode, onAnchorModeChange, manualDate, onManualDateChange, confirmedLow, modeledLowDateFmt,
}: Props) {
  return (
    <div
      className="rounded-xl border p-5 space-y-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Anchor mode */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--sct-muted)' }}>
          Next-Cycle Anchor
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {ANCHOR_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => onAnchorModeChange(m.key)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: anchorMode === m.key ? 'var(--sct-border)' : 'transparent',
                borderColor: 'var(--sct-border)',
                color: anchorMode === m.key ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {anchorMode === 'fixed' && (
          <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
            Using the predetermined model date: <span style={{ color: 'var(--sct-text)' }}>{modeledLowDateFmt}</span>.
          </p>
        )}
        {anchorMode === 'confirmed' && (
          <p className="text-[11px]" style={{ color: confirmedLow.confirmed ? '#35D07F' : 'var(--sct-muted)' }}>
            {confirmedLow.confirmed
              ? `Rule-confirmed low: ${confirmedLow.date} ($${confirmedLow.price?.toLocaleString()}). ${confirmedLow.ruleDetail}`
              : `No rule-confirmed low yet — falling back to the fixed model date. ${confirmedLow.ruleDetail}`}
          </p>
        )}
        {anchorMode === 'manual' && (
          <div className="flex items-center gap-2">
            <label className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>Anchor date</label>
            <input
              type="date"
              value={manualDate}
              onChange={(e) => onManualDateChange(e.target.value)}
              className="rounded px-2 py-1 text-xs font-mono border"
              style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)', color: 'var(--sct-text)' }}
            />
          </div>
        )}
      </div>

      {/* Scenario framework */}
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--sct-muted)' }}>
          Timing Scenarios
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SCENARIOS.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border p-4 space-y-2"
              style={{ borderColor: s.color + '40', backgroundColor: s.color + '08' }}
            >
              <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
