"use client";

import { heatmapCellColor, CYCLE_PHASE_COLOR, MONTH_NAMES } from '@/lib/indicators/seasonality';
import type { MonthSummary } from '@/lib/indicators/seasonality';
import type { HeatmapRow } from '@/app/api/calendar/route';

type Props = {
  heatmap:        HeatmapRow[];
  monthSummaries: MonthSummary[];
  useMedian:      boolean;
  currentYear:    number;
  currentMonth:   number;
};

const GRID_COLS = '76px repeat(12, minmax(52px, 1fr)) 72px';

function Cell({ value, highlight }: { value: number | null; highlight?: boolean }) {
  if (value === null) {
    return (
      <div
        className="text-center text-xs font-mono py-2 rounded"
        style={{ color: 'var(--sct-muted)', backgroundColor: 'transparent' }}
      >
        —
      </div>
    );
  }
  return (
    <div
      className="text-center text-xs font-mono font-semibold py-2 rounded transition-all"
      style={{
        color:           Math.abs(value) >= 5 ? '#fff' : 'var(--sct-text)',
        backgroundColor: heatmapCellColor(value),
        outline:         highlight ? '2px solid #F7931A' : 'none',
        outlineOffset:   highlight ? '-2px' : undefined,
      }}
    >
      {value >= 0 ? '+' : ''}{value.toFixed(0)}%
    </div>
  );
}

export function MonthlyReturnHeatmap({ heatmap, monthSummaries, useMedian, currentYear, currentMonth }: Props) {
  const summaryRow = monthSummaries.map((s) => (useMedian ? s.medianReturn : s.averageReturn));

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 760 }}>
        {/* Header */}
        <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: GRID_COLS }}>
          <div className="text-[10px] font-medium tracking-wider uppercase self-end pb-1" style={{ color: 'var(--sct-muted)' }}>
            Year
          </div>
          {MONTH_NAMES.map((m) => (
            <div key={m} className="text-[10px] font-medium tracking-wider uppercase text-center self-end pb-1" style={{ color: 'var(--sct-muted)' }}>
              {m}
            </div>
          ))}
          <div className="text-[10px] font-medium tracking-wider uppercase text-center self-end pb-1" style={{ color: 'var(--sct-muted)' }}>
            Year
          </div>
        </div>

        {/* Median/Average summary row */}
        <div
          className="grid gap-1 mb-2 pb-2 border-b"
          style={{ gridTemplateColumns: GRID_COLS, borderColor: 'var(--sct-border)' }}
        >
          <div className="text-xs font-semibold flex items-center" style={{ color: 'var(--sct-text)' }}>
            {useMedian ? 'Median' : 'Average'}
          </div>
          {summaryRow.map((v, i) => (
            <Cell key={i} value={v} />
          ))}
          <div />
        </div>

        {/* Year rows */}
        <div className="space-y-1">
          {heatmap.map((row) => (
            <div key={row.year} className="grid gap-1 items-center" style={{ gridTemplateColumns: GRID_COLS }}>
              <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--sct-secondary)' }}>
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: CYCLE_PHASE_COLOR[row.cyclePhase] }}
                />
                {row.year}
              </div>
              {row.monthly.map((v, i) => (
                <Cell
                  key={i}
                  value={v}
                  highlight={row.year === currentYear && i + 1 === currentMonth}
                />
              ))}
              <Cell value={row.yearReturn} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
