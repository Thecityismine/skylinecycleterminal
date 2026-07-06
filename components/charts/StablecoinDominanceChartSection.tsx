"use client";

import { useState, useMemo } from 'react';
import { StablecoinDominanceChart } from '@/components/charts/StablecoinDominanceChart';
import { StablecoinDominanceShareModal } from '@/components/share/StablecoinDominanceShareModal';
import type { StablecoinDominancePoint } from '@/lib/indicators/stablecoinDominance';
import type { StablecoinDominanceSharePayload } from '@/components/share/StablecoinDominanceShareCard';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Range = '6M' | '1Y' | '2Y' | '3Y' | 'All';

const RANGES: { label: Range; days: number | null }[] = [
  { label: '6M',  days: 183 },
  { label: '1Y',  days: 365 },
  { label: '2Y',  days: 730 },
  { label: '3Y',  days: 1095 },
  { label: 'All', days: null },
];

function msAgo(days: number) {
  return Date.now() - days * 86_400_000;
}

type Props = {
  points:          StablecoinDominancePoint[];
  dominance:       number | null;
  ma30:            number | null;
  ma90:            number | null;
  stablecoinMC:    number | null;
  btcPrice:        number | null;
  dom30dChange:    number | null;
  supply30dChange: number | null;
  regimeLabel:     string;
  regimeColor:     string;
  liquidityScore:  number;
};

export function StablecoinDominanceChartSection({
  points,
  dominance,
  ma30,
  ma90,
  stablecoinMC,
  btcPrice,
  dom30dChange,
  supply30dChange,
  regimeLabel,
  regimeColor,
  liquidityScore,
}: Props) {
  const [range, setRange] = useState<Range>('All');
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);

  const startTs = useMemo(() => {
    const entry = RANGES.find((r) => r.label === range);
    return entry?.days != null ? msAgo(entry.days) : undefined;
  }, [range]);

  const chartPoints = useMemo(
    () => (startTs != null ? points.filter((p) => p.ts >= startTs) : points),
    [points, startTs],
  );

  // Zoom-filter on top of the range-filter so the share card matches what's on screen
  const shareChartPoints = useMemo(() => {
    if (!zoomDomain) return chartPoints;
    return chartPoints.filter((p) => p.ts >= zoomDomain.start && p.ts <= zoomDomain.end);
  }, [chartPoints, zoomDomain]);

  const sharePayload: StablecoinDominanceSharePayload = {
    points:          shareChartPoints,
    dominance,
    ma30,
    ma90,
    stablecoinMC,
    btcPrice,
    dom30dChange,
    supply30dChange,
    regimeLabel,
    regimeColor,
    liquidityScore,
    generatedAt:     new Date().toISOString(),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium tracking-wide" style={{ color: 'var(--sct-muted)' }}>
          STABLECOIN DOMINANCE + BTC PRICE OVERLAY
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border overflow-hidden" style={{ borderColor: '#21262D' }}>
            {RANGES.map(({ label }) => (
              <button
                key={label}
                onClick={() => { setRange(label); setZoomDomain(null); }}
                className="px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: range === label ? '#21262D' : 'transparent',
                  color:           range === label ? '#E6EDF3' : '#8B949E',
                  cursor:          'pointer',
                  borderRight:     label !== 'All' ? '1px solid #21262D' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <StablecoinDominanceShareModal payload={sharePayload} />
        </div>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', height: 420 }}
      >
        <StablecoinDominanceChart data={chartPoints} logBTC startTs={startTs} onZoomChange={setZoomDomain} />
      </div>

      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span style={{ width: 14, height: 2, backgroundColor: '#4DA3FF', display: 'inline-block', borderRadius: 1 }} />
          <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>Stablecoin Dom.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 14, height: 0, borderTop: '1.5px dashed #93C5FD', display: 'inline-block' }} />
          <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>30D MA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 14, height: 0, borderTop: '1.5px dashed #3B82F6', display: 'inline-block' }} />
          <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>90D MA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 14, height: 2, backgroundColor: 'rgba(247,147,26,0.4)', display: 'inline-block', borderRadius: 1 }} />
          <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>BTC Price (right axis)</span>
        </div>
        <span className="text-[10px] ml-auto" style={{ color: 'var(--sct-muted)' }}>
          Dashed lines at 6% (risk-on) and 12% (risk-off) thresholds
        </span>
      </div>
    </div>
  );
}
