"use client";

import { useState, useMemo } from 'react';
import { BTCBottomConfluenceChart }    from '@/components/charts/BTCBottomConfluenceChart';
import { BottomConfluenceShareModal }  from '@/components/share/BottomConfluenceShareModal';
import type { BottomConfluencePoint, ConfluencePeriod } from '@/lib/indicators/bottomConfluence';
import type { BottomConfluenceSharePayload } from '@/components/share/BottomConfluenceShareCard';

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

  // Downsample to ~1500 points for share card performance
  const downsampled = useMemo(() => {
    if (points.length <= 1500) return points;
    const step = Math.floor(points.length / 1500);
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points]);

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
        />
      </div>
      <p className="text-[10px] mt-1.5" style={{ color: 'var(--sct-muted)' }}>
        Green shaded zones = historical periods when confluence score ≥ 2/4 persisted for 14+ days. Dashed green line = 2-year moving average (Signal 3 threshold).
      </p>
    </div>
  );
}
