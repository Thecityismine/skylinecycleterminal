"use client";

import { useMemo, useState } from 'react';
import { TwoYearMAChart } from '@/components/charts/TwoYearMAChart';
import { TwoYearMAShareModal } from '@/components/share/TwoYearMAShareModal';
import type { MAPoint } from '@/lib/indicators/cycleHelpers';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  chartData:   MAPoint[];
  latestPrice: number;
  latestMA:    number | null;
  latestMA5:   number | null;
  multiplier:  number | null;
  zoneLabel:   string;
  zoneColor:   string;
  children?:   React.ReactNode;
};

export function TwoYearMAPageClient({
  chartData, latestPrice, latestMA, latestMA5, multiplier, zoneLabel, zoneColor, children,
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
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTC / USD vs 2-Year Moving Average — Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Price below orange = historically best buy zone · Price above red = historically cycle top
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--sct-muted)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5" style={{ backgroundColor: 'rgba(247,249,252,0.9)' }} />
              BTC Price
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5" style={{ backgroundColor: '#F7931A' }} />
              2Y MA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-px border-t-2 border-dashed" style={{ borderColor: '#FF5C5C' }} />
              2Y MA ×5
            </span>
          </div>
          <TwoYearMAShareModal payload={{
            data:        shareData,
            latestPrice,
            latestMA,
            latestMA5,
            multiplier,
            zoneLabel,
            zoneColor,
            generatedAt: new Date().toISOString(),
          }} />
        </div>
      </div>

      <div className="h-[480px]">
        <TwoYearMAChart data={chartData} onZoomChange={setZoomDomain} />
      </div>

      {children}
    </div>
  );
}
