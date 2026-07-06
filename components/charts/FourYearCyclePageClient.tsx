"use client";

import { useMemo, useState } from 'react';
import { FourYearCycleChart } from '@/components/charts/FourYearCycleChart';
import { FourYearCycleShareModal } from '@/components/share/FourYearCycleShareModal';
import { CYCLE_STROKE, CYCLE_LABEL } from '@/lib/indicators/cycleHelpers';
import type { CyclePoint } from '@/lib/indicators/cycleHelpers';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  chartData:       CyclePoint[];
  currentCycleNum: number;
  daysSince:       number;
  cycleProgress:   number;
  daysToNext:      number;
  nextHalvingDate: string;
};

export function FourYearCyclePageClient({
  chartData, currentCycleNum, daysSince, cycleProgress, daysToNext, nextHalvingDate,
}: Props) {
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);

  // Zoom-filter on top of the full series so the share card matches what's on screen
  const shareData = useMemo(() => {
    if (!zoomDomain) return chartData;
    return chartData.filter(d => d.ts >= zoomDomain.start && d.ts <= zoomDomain.end);
  }, [chartData, zoomDomain]);

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Chart header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTC / USD — Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Dashed verticals mark halvings · Shaded zones represent each 4-year cycle
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Cycle legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--sct-muted)' }}>
            {[1, 2, 3, 4].map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: CYCLE_STROKE[c], opacity: 0.6 }}
                />
                <span style={{ color: CYCLE_STROKE[c] }}>{CYCLE_LABEL[c]}</span>
              </span>
            ))}
          </div>
          <FourYearCycleShareModal payload={{
            data:            shareData,
            cycleNum:        currentCycleNum,
            daysSince,
            cycleProgress,
            daysToNext,
            nextHalvingDate,
            generatedAt:     new Date().toISOString(),
          }} />
        </div>
      </div>

      <div className="h-[480px]">
        <FourYearCycleChart data={chartData} onZoomChange={setZoomDomain} />
      </div>
    </div>
  );
}
