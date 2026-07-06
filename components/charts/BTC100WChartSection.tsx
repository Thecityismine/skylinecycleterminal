"use client";

import { useState, useCallback, useMemo } from 'react';
import { BTC100WChart } from '@/components/charts/BTC100WChart';
import type { VisibilityState } from '@/components/charts/BTC100WChart';
import { BTC100WMAShareModal } from '@/components/share/BTC100WMAShareModal';
import type { BTC100WMASharePayload } from '@/components/share/BTC100WMAShareCard';
import type { WeeklyPoint, RegimeSegment, MATrendScore } from '@/lib/indicators/weeklyMA';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  points:        WeeklyPoint[];
  regimes:       RegimeSegment[];
  latestClose:   number;
  latestMA100:   number | null;
  latestMA50:    number | null;
  latestMA200:   number | null;
  distancePct:   number | null;
  distanceColor: string;
  trendScore:    MATrendScore;
  slope:         number | null;
  slopeText:     string;
  slopeColor:    string;
  generatedAt:   string;
};

export function BTC100WChartSection({
  points, regimes,
  latestClose, latestMA100, latestMA50, latestMA200,
  distancePct, distanceColor,
  trendScore, slope, slopeText, slopeColor,
  generatedAt,
}: Props) {
  const [visibility, setVisibility] = useState<VisibilityState>({
    show50: true, show100: true, show200: true, showShading: true,
  });
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<string> | null>(null);

  const handleVisibilityChange = useCallback((v: VisibilityState) => {
    setVisibility(v);
  }, []);

  const sharePoints = useMemo(() => {
    if (!zoomDomain) return points;
    return points.filter((p) => p.time >= zoomDomain.start && p.time <= zoomDomain.end);
  }, [points, zoomDomain]);

  const shareRegimes = useMemo(() => {
    if (!zoomDomain) return regimes;
    return regimes.filter((r) => r.end >= zoomDomain.start && r.start <= zoomDomain.end);
  }, [regimes, zoomDomain]);

  const sharePayload: BTC100WMASharePayload = {
    data:          sharePoints,
    regimes:       shareRegimes,
    latestClose,
    latestMA100,
    latestMA50,
    latestMA200,
    distancePct,
    distanceColor,
    trendScoreNum: trendScore.score,
    trendLabel:    trendScore.label,
    trendColor:    trendScore.color,
    slope,
    slopeText,
    slopeColor,
    show50:        visibility.show50,
    show100:       visibility.show100,
    show200:       visibility.show200,
    showShading:   visibility.showShading,
    generatedAt,
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            BTC Weekly Price · 50W · 100W · 200W Moving Averages — Log Scale
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Green shading = above 100W MA · Amber = testing (±5%) · Red = below 100W MA · Dashed verticals = halvings
          </p>
        </div>
        <BTC100WMAShareModal payload={sharePayload} />
      </div>
      <BTC100WChart
        points={points}
        regimes={regimes}
        onVisibilityChange={handleVisibilityChange}
        onZoomChange={setZoomDomain}
      />
    </>
  );
}
