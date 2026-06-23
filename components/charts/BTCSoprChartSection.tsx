"use client";

import { useState, useMemo } from 'react';
import { BTCSoprChart }    from '@/components/charts/BTCSoprChart';
import { SoprShareModal }  from '@/components/share/SoprShareModal';
import type { SoprPoint }  from '@/lib/indicators/sopr';
import type { SoprSharePayload } from '@/components/share/SoprShareCard';

type Props = {
  points:      SoprPoint[];
  regimeLabel: string;
  regimeColor: string;
  rawSopr:     number | null;
  soprDev:     number | null;
  sma30:       number | null;
  sma90:       number | null;
  btcClose:    number | null;
};

export function BTCSoprChartSection({
  points, regimeLabel, regimeColor,
  rawSopr, soprDev, sma30, sma90, btcClose,
}: Props) {
  // Mirror toggle defaults from BTCSoprChart
  const [showPrice,   setShowPrice]   = useState(true);
  const [showSma30,   setShowSma30]   = useState(false);
  const [showSma90,   setShowSma90]   = useState(true);
  const [showShading, setShowShading] = useState(true);

  // Downsample to ~1500 points for share card performance
  const downsampled = useMemo(() => {
    if (points.length <= 1500) return points;
    const step = Math.floor(points.length / 1500);
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points]);

  const sharePayload: SoprSharePayload = {
    points: downsampled,
    showPrice,
    showSma30,
    showSma90,
    showShading,
    regimeLabel,
    regimeColor,
    rawSopr,
    soprDev,
    sma30,
    sma90,
    btcClose,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Bitcoin SOPR (MVRV Deviation) · BTC Price — Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Green bars = above 1.0 (profit territory) · Red bars = below 1.0 (loss territory) ·
            Zero line = MVRV 1.0 (break-even) · Dashed verticals = halvings
          </p>
        </div>
        <SoprShareModal payload={sharePayload} />
      </div>
      <BTCSoprChart
        points={points}
        onShowPriceChange={setShowPrice}
        onShowSma30Change={setShowSma30}
        onShowSma90Change={setShowSma90}
        onShowShadingChange={setShowShading}
      />
    </div>
  );
}
