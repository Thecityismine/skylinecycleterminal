"use client";

import { useState, useMemo, useCallback } from 'react';
import { PiCycleBottomChart } from '@/components/charts/PiCycleBottomChart';
import type { PiBottomPoint, Range } from '@/components/charts/PiCycleBottomChart';
import { PiCycleShareModal } from '@/components/share/PiCycleShareModal';
import type { PiCycleSharePayload } from '@/components/share/PiCycleShareCard';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

const DAYS: Record<Range, number> = { '2Y': 730, '4Y': 1460, 'All': Infinity };

function fmtZoomLabel(domain: ZoomDomain): string {
  const fmt = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return `${fmt(domain.start)} – ${fmt(domain.end)}`;
}

type Props = {
  data:             PiBottomPoint[];
  fetchError:       boolean;
  statusLabel:      string;
  statusColor:      string;
  currentPrice:     number | null;
  currentMA150:     number | null;
  currentThreshold: number | null;
  ratio:            number | null;
};

export function PiCycleChartSection({
  data, fetchError, statusLabel, statusColor,
  currentPrice, currentMA150, currentThreshold, ratio,
}: Props) {
  const [range,      setRange]      = useState<Range>('All');
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain | null>(null);

  const handleZoomChange = useCallback((d: ZoomDomain | null) => {
    setZoomDomain(d);
  }, []);

  const displayed = useMemo(() => {
    const days = DAYS[range];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => new Date(d.date + 'T00:00:00').getTime() >= cutoff);
  }, [data, range]);

  // For share: zoom-filter on top of range-filter when zoomed
  const shareData = useMemo(() => {
    if (!zoomDomain) return displayed;
    return displayed.filter(d => d.date >= zoomDomain.start && d.date <= zoomDomain.end);
  }, [displayed, zoomDomain]);

  const shareRange = zoomDomain ? fmtZoomLabel(zoomDomain) : range;

  const sharePayload: PiCycleSharePayload = {
    data:             shareData,
    range:            shareRange,
    statusLabel,
    statusColor,
    currentPrice,
    currentMA150,
    currentThreshold,
    ratio,
    generatedAt:      new Date().toISOString(),
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Pi Cycle Bottom — BTC Price vs Moving Averages · Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Blue shading = bottom zone active (150d MA below 471d×0.745) · Signal fires on the cross-under
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-mono shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5" style={{ backgroundColor: 'rgba(247,249,252,0.75)' }} />
            <span style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5" style={{ backgroundColor: '#E6B450' }} />
            <span style={{ color: '#E6B450' }}>150d MA</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-6 h-0.5" style={{ backgroundColor: '#3B82F6' }} />
            <span style={{ color: '#3B82F6' }}>471d × 0.745</span>
          </span>
          <PiCycleShareModal payload={sharePayload} />
        </div>
      </div>

      {fetchError ? (
        <div
          className="h-[460px] flex items-center justify-center rounded-lg border text-sm"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          Unable to load price data — CoinMetrics API unreachable
        </div>
      ) : (
        <PiCycleBottomChart
          data={data}
          onRangeChange={(r) => { setRange(r); setZoomDomain(null); }}
          onZoomChange={handleZoomChange}
        />
      )}
    </div>
  );
}
