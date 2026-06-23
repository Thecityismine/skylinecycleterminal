"use client";

import { useState, useMemo } from 'react';
import { BTCValueFloorChart }     from '@/components/charts/BTCValueFloorChart';
import { ValueFloorShareModal }   from '@/components/share/ValueFloorShareModal';
import type { ValueFloorPoint }   from '@/lib/indicators/valueFloors';
import type { ValueFloorSharePayload } from '@/components/share/ValueFloorShareCard';

type Props = {
  points:        ValueFloorPoint[];
  scoreScore:    number;
  scoreLabel:    string;
  scoreColor:    string;
  btcClose:      number | null;
  realizedPrice: number | null;
  vsRealizedPct: number | null;
  drawdownPct:   number | null;
};

const VISIBLE_DEFAULTS: Record<string, boolean> = {
  btcPrice:      true,
  realizedPrice: true,
  ma2y:          true,
  ma200w:        true,
  powerLaw:      false,
  halvings:      true,
  floorEvents:   true,
  valueZone:     true,
};

export function BTCValueFloorChartSection({
  points,
  scoreScore, scoreLabel, scoreColor,
  btcClose, realizedPrice, vsRealizedPct, drawdownPct,
}: Props) {
  const [visible, setVisible] = useState<Record<string, boolean>>(VISIBLE_DEFAULTS);

  // Downsample to ~1500 points for share card performance
  const downsampled = useMemo(() => {
    if (points.length <= 1500) return points;
    const step = Math.floor(points.length / 1500);
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points]);

  const sharePayload: ValueFloorSharePayload = {
    points: downsampled,
    visible,
    scoreScore,
    scoreLabel,
    scoreColor,
    btcClose,
    realizedPrice,
    vsRealizedPct,
    drawdownPct,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-secondary)' }}>
            Bitcoin Price vs Value Floors — Full History (Log Scale)
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            All series in USD. Blue zone = price near realized price (cost basis). Green markers = historical bear market lows.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] font-mono flex-wrap" style={{ color: 'var(--sct-muted)' }}>
            {[
              { color: '#E6EDF3', label: 'BTC Price' },
              { color: '#3B82F6', label: 'Realized Price' },
              { color: '#35D07F', label: '2Y MA' },
              { color: '#A855F7', label: '200W MA' },
              { color: '#E6B450', label: 'Power Law' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="rounded-full" style={{ width: 16, height: 2, backgroundColor: color, display: 'inline-block' }} />
                {label}
              </span>
            ))}
          </div>
          <ValueFloorShareModal payload={sharePayload} />
        </div>
      </div>

      <div style={{ height: 460 }}>
        {!points.length
          ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">No data available</p>
            </div>
          )
          : (
            <BTCValueFloorChart
              points={points}
              range="all"
              onVisibleChange={setVisible}
            />
          )
        }
      </div>

      <p className="text-[10px] mt-2" style={{ color: 'var(--sct-muted)' }}>
        Source: CoinMetrics Community API (PriceUSD, CapMVRVCur). Realized Price = Price / MVRV. 200W MA = 1400-day SMA. 2Y MA = 730-day SMA. Power Law = log regression central value (Bitcoin Magazine Pro methodology).
      </p>
    </div>
  );
}
