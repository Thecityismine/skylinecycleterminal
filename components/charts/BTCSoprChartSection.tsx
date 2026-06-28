"use client";

import { useState, useMemo } from 'react';
import { BTCSoprChart }    from '@/components/charts/BTCSoprChart';
import { SoprShareModal }  from '@/components/share/SoprShareModal';
import type { SoprPoint }  from '@/lib/indicators/sopr';
import type { SoprSharePayload } from '@/components/share/SoprShareCard';

type Range = '4Y' | '8Y' | 'All';
const RANGES: Range[] = ['4Y', '8Y', 'All'];
const RANGE_DAYS: Record<Range, number> = { '4Y': 4 * 365.25, '8Y': 8 * 365.25, 'All': Infinity };

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
  const [range, setRange]             = useState<Range>('All');

  const filteredPoints = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === Infinity) return points;
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    return points.filter((p) => p.time >= cutoff);
  }, [points, range]);

  // Downsample to ~1500 points for share card performance
  const downsampled = useMemo(() => {
    if (filteredPoints.length <= 1500) return filteredPoints;
    const step = Math.floor(filteredPoints.length / 1500);
    return filteredPoints.filter((_, i) => i % step === 0 || i === filteredPoints.length - 1);
  }, [filteredPoints]);

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
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Bitcoin SOPR (MVRV Deviation) · BTC Price — Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Green bars = above 1.0 (profit territory) · Red bars = below 1.0 (loss territory) ·
            Zero line = MVRV 1.0 (break-even) · Dashed verticals = halvings
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Range tabs */}
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
                style={{
                  backgroundColor: range === r ? 'rgba(247,147,26,0.15)' : 'transparent',
                  borderColor:     range === r ? '#F7931A'               : 'var(--sct-border)',
                  color:           range === r ? '#F7931A'               : 'var(--sct-muted)',
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <SoprShareModal payload={sharePayload} />
        </div>
      </div>
      <BTCSoprChart
        points={filteredPoints}
        onShowPriceChange={setShowPrice}
        onShowSma30Change={setShowSma30}
        onShowSma90Change={setShowSma90}
        onShowShadingChange={setShowShading}
      />
    </div>
  );
}
