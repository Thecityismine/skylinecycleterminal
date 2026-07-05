"use client";

import { StatCard } from '@/components/dashboard/StatCard';
import {
  CYCLE_PHASE_LABEL,
  CYCLE_PHASE_COLOR,
  buildHistoricalRead,
} from '@/lib/indicators/seasonality';
import type { CyclePhase, MonthSummary } from '@/lib/indicators/seasonality';

type Props = {
  assetLabel:  string;
  monthSummary: MonthSummary;
  currentPhase: CyclePhase;
  useMedian:    boolean;
};

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function CalendarSummaryPanel({ assetLabel, monthSummary, currentPhase, useMedian }: Props) {
  const phaseColor = CYCLE_PHASE_COLOR[currentPhase];
  const phaseSummary = monthSummary.cyclePhaseSummaries[currentPhase];
  const { read, confidence } = buildHistoricalRead(monthSummary, currentPhase, assetLabel);

  const confidenceColor =
    confidence === 'High' ? 'var(--sct-green)' : confidence === 'Moderate' ? 'var(--sct-amber)' : 'var(--sct-muted)';

  const primaryReturn = useMedian ? monthSummary.medianReturn : monthSummary.averageReturn;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={`${monthSummary.monthName} ${useMedian ? 'Median' : 'Average'} Return`}
          value={fmtPct(primaryReturn)}
          sub={`${monthSummary.positiveYears}/${monthSummary.sampleSize} years positive`}
          accent={primaryReturn >= 0 ? 'var(--sct-green)' : 'var(--sct-red)'}
          freshness="daily"
        />
        <StatCard
          label={`${monthSummary.monthName} Median Volatility`}
          value={`${monthSummary.medianVolatility.toFixed(1)}%`}
          sub="High-to-low monthly range"
          accent="var(--sct-amber)"
        />
        <StatCard
          label="Current Cycle Phase"
          value={CYCLE_PHASE_LABEL[currentPhase]}
          sub="4-year halving framework"
          accent={phaseColor}
        />
        <StatCard
          label={`${CYCLE_PHASE_LABEL[currentPhase]} ${monthSummary.monthName} Median`}
          value={phaseSummary ? fmtPct(phaseSummary.medianReturn) : '—'}
          sub={phaseSummary ? `n=${phaseSummary.sampleSize} comparable years` : 'Insufficient sample'}
          accent={phaseSummary ? (phaseSummary.medianReturn >= 0 ? 'var(--sct-green)' : 'var(--sct-red)') : 'var(--sct-muted)'}
        />
      </div>

      <div
        className="rounded-xl border p-5 space-y-2"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
          Historical Read
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
          {read}
        </p>
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Confidence:</span>
          <span className="text-xs font-mono font-semibold" style={{ color: confidenceColor }}>
            {confidence} — limited sample size
          </span>
        </div>
      </div>
    </div>
  );
}
