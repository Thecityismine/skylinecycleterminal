"use client";

import { useState, useMemo } from 'react';
import { ValuationDeviationChart } from '@/components/charts/ValuationDeviationChart';
import { ValuationDeviationShareModal } from '@/components/share/ValuationDeviationShareModal';
import { halvingColor } from '@/lib/indicators/valuationCycle';
import type { ValuationPoint } from '@/lib/indicators/valuationCycle';
import type { ValuationDeviationSharePayload } from '@/components/share/ValuationDeviationShareCard';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Range = '4Y' | '8Y' | 'All';
const RANGES: Range[] = ['4Y', '8Y', 'All'];
const RANGE_MS: Record<Range, number> = { '4Y': 4 * 365.25 * 86_400_000, '8Y': 8 * 365.25 * 86_400_000, 'All': 0 };

const LEGEND_STOPS = [0, 200, 400, 600, 800, 1000, 1200, 1400];

type Props = {
  points: ValuationPoint[];
};

export function ValuationDeviationChartSection({ points }: Props) {
  const [range, setRange]           = useState<Range>('All');
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);

  const startTs = useMemo(() => {
    const ms = RANGE_MS[range];
    return ms === 0 ? 0 : Date.now() - ms;
  }, [range]);

  const sharePoints = useMemo(() => {
    const visible = points.filter((p) => p.ts >= startTs);
    if (!zoomDomain) return visible;
    return visible.filter((p) => p.ts >= zoomDomain.start && p.ts <= zoomDomain.end);
  }, [points, startTs, zoomDomain]);

  const gradient = `linear-gradient(90deg, ${LEGEND_STOPS.map((d) => halvingColor(d)).join(', ')})`;

  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-secondary)' }}>
            Bitcoin Price Deviation from 200-Day Moving Average
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Green = historical value zone · red = historical extension zone. Line color = days until next halving.
          </p>
        </div>
        <ValuationDeviationShareModal
          payload={{
            points: sharePoints,
            startTs,
            rangeLabel: zoomDomain ? 'Zoomed' : range,
            generatedAt: new Date().toISOString(),
          } satisfies ValuationDeviationSharePayload}
        />
      </div>

      {/* Range tabs */}
      <div className="flex items-center gap-1.5 mb-4">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => { setRange(r); setZoomDomain(null); }}
            className="px-3 py-1 rounded text-xs font-mono border transition-all"
            style={{
              backgroundColor: range === r ? 'var(--sct-border)' : 'transparent',
              borderColor:     'var(--sct-border)',
              color:           range === r ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            {r}
          </button>
        ))}
        <span className="hidden md:inline text-[10px] font-mono ml-1" style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
          drag to zoom
        </span>
      </div>

      <div style={{ height: 460 }}>
        {!points.length ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--sct-muted)' }}>
            <p className="text-sm">No data available</p>
          </div>
        ) : (
          <ValuationDeviationChart points={points} startTs={startTs} onZoomChange={setZoomDomain} />
        )}
      </div>

      {/* Halving color legend */}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: 'var(--sct-muted)' }}>
          Days until next halving
        </span>
        <div className="flex-1 h-2 rounded-full" style={{ background: gradient }} />
        <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>0 → 1,400+</span>
      </div>

      <p className="text-[10px] mt-3" style={{ color: 'var(--sct-muted)' }}>
        Source: CoinMetrics Community API (PriceUSD). Deviation = Price / 200D SMA − 1. Halving dates for H5+ are estimated from block-time (~10 min/block).
      </p>
    </div>
  );
}
