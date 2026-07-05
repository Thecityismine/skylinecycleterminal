"use client";

import { CYCLE_PHASE_LABEL, CYCLE_PHASE_COLOR, buildMonthOutlookRead } from '@/lib/indicators/seasonality';
import type { CyclePhase, MonthSummary } from '@/lib/indicators/seasonality';

type Props = {
  assetLabel:   string;
  monthSummary: MonthSummary;
  currentPhase: CyclePhase;
};

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function MonthOutlookPanel({ assetLabel, monthSummary, currentPhase }: Props) {
  const phaseSummary = monthSummary.cyclePhaseSummaries[currentPhase];
  const returnPct = phaseSummary ? phaseSummary.medianReturn : monthSummary.medianReturn;
  const volPct    = phaseSummary ? phaseSummary.medianVolatility : monthSummary.medianVolatility;
  const read = buildMonthOutlookRead(monthSummary, currentPhase);

  return (
    <div
      className="rounded-xl border p-5 space-y-3"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
        Month Outlook
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <span style={{ color: 'var(--sct-muted)' }}>Asset</span>
        <span className="text-right font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>{assetLabel}</span>

        <span style={{ color: 'var(--sct-muted)' }}>Month</span>
        <span className="text-right font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>{monthSummary.monthName}</span>

        <span style={{ color: 'var(--sct-muted)' }}>Cycle Phase</span>
        <span className="text-right font-mono font-semibold" style={{ color: CYCLE_PHASE_COLOR[currentPhase] }}>
          {CYCLE_PHASE_LABEL[currentPhase]}
        </span>

        <span style={{ color: 'var(--sct-muted)' }}>Historical Median Return</span>
        <span className="text-right font-mono font-semibold" style={{ color: returnPct >= 0 ? 'var(--sct-green)' : 'var(--sct-red)' }}>
          {fmtPct(returnPct)}
        </span>

        <span style={{ color: 'var(--sct-muted)' }}>Historical Median Volatility</span>
        <span className="text-right font-mono font-semibold" style={{ color: 'var(--sct-amber)' }}>
          {volPct.toFixed(1)}%
        </span>

        <span style={{ color: 'var(--sct-muted)' }}>Positive / Negative Closes</span>
        <span className="text-right font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
          {monthSummary.positiveYears} / {monthSummary.negativeYears}
        </span>
      </div>

      <div className="pt-2 border-t" style={{ borderColor: 'var(--sct-border)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--sct-text)' }}>Read: </span>
          {read}
        </p>
      </div>
    </div>
  );
}
