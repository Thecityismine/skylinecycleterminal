"use client";

import { useState, useMemo } from 'react';
import { BTCBottomConfluenceChart }    from '@/components/charts/BTCBottomConfluenceChart';
import { BottomConfluenceShareModal }  from '@/components/share/BottomConfluenceShareModal';
import type { BottomConfluencePoint, ConfluencePeriod } from '@/lib/indicators/bottomConfluence';
import type { BottomConfluenceSharePayload } from '@/components/share/BottomConfluenceShareCard';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  points:          BottomConfluencePoint[];
  periods:         ConfluencePeriod[];
  confluenceScore: number;
  regimeLabel:     string;
  regimeColor:     string;
  btcClose:        number | null;
  mvrv:            number | null;
  hrRatio:         number | null;
  priceTo2y:       number | null;
};

const VISIBLE_DEFAULTS: Record<string, boolean> = {
  btcPrice: true,
  ma2y:     true,
  zones:    true,
  halvings: true,
  bottoms:  true,
};

export function BTCBottomConfluenceChartSection({
  points, periods,
  confluenceScore, regimeLabel, regimeColor,
  btcClose, mvrv, hrRatio, priceTo2y,
}: Props) {
  const [visible, setVisible] = useState<Record<string, boolean>>(VISIBLE_DEFAULTS);
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);

  // Zoom-filter on top of the full series so the share card matches what's on screen
  const zoomFiltered = useMemo(() => {
    if (!zoomDomain) return points;
    return points.filter((p) => p.ts >= zoomDomain.start && p.ts <= zoomDomain.end);
  }, [points, zoomDomain]);

  // Downsample to ~1500 points for share card performance
  const downsampled = useMemo(() => {
    if (zoomFiltered.length <= 1500) return zoomFiltered;
    const step = Math.floor(zoomFiltered.length / 1500);
    return zoomFiltered.filter((_, i) => i % step === 0 || i === zoomFiltered.length - 1);
  }, [zoomFiltered]);

  const sharePayload: BottomConfluenceSharePayload = {
    points: downsampled,
    periods,
    visible,
    confluenceScore,
    regimeLabel,
    regimeColor,
    btcClose,
    mvrv,
    hrRatio,
    priceTo2y,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium tracking-wide" style={{ color: 'var(--sct-muted)' }}>
          BTC PRICE + HISTORICAL CONFLUENCE ZONES
        </h2>
        <BottomConfluenceShareModal payload={sharePayload} />
      </div>
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', height: 460 }}
      >
        <BTCBottomConfluenceChart
          points={points}
          periods={periods}
          onVisibleChange={setVisible}
          onZoomChange={setZoomDomain}
        />
      </div>
      <p className="text-[10px] mt-1.5" style={{ color: 'var(--sct-muted)' }}>
        Green shaded zones = historical periods when confluence score ≥ 2/4 persisted for 14+ days. Dashed green line = 2-year moving average (Signal 3 threshold).
      </p>
    </div>
  );
}
