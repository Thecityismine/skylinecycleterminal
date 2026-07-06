"use client";

import { useState, useMemo } from 'react';
import { NUPLChart } from '@/components/charts/NUPLChart';
import { NUPLShareModal } from '@/components/share/NUPLShareModal';
import type { NUPLPoint } from '@/lib/indicators/nupl';
import type { NUPLSharePayload } from '@/components/share/NUPLShareCard';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  points:     NUPLPoint[];
  nupl:       number | null;
  price:      number | null;
  ma730:      number | null;
  zoneLabel:  string;
  zoneColor:  string;
  zone:       string;
};

export function NUPLChartSection({ points, nupl, price, ma730, zoneLabel, zoneColor, zone }: Props) {
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);

  // Zoom-filter on top of the full series so the share card matches what's on screen
  const zoomFiltered = useMemo(() => {
    if (!zoomDomain) return points;
    return points.filter((p) => p.ts >= zoomDomain.start && p.ts <= zoomDomain.end);
  }, [points, zoomDomain]);

  const downsampled = useMemo(() => {
    if (zoomFiltered.length <= 1500) return zoomFiltered;
    const step = Math.floor(zoomFiltered.length / 1500);
    return zoomFiltered.filter((_, i) => i % step === 0 || i === zoomFiltered.length - 1);
  }, [zoomFiltered]);

  const sharePayload: NUPLSharePayload = {
    points: downsampled,
    nupl,
    price,
    ma730,
    zoneLabel,
    zoneColor,
    zone,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium tracking-wide" style={{ color: 'var(--sct-muted)' }}>
          BTC PRICE + NET UNREALIZED PROFIT/LOSS
        </h2>
        <NUPLShareModal payload={sharePayload} />
      </div>
      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', height: 420 }}
      >
        <NUPLChart data={points} onZoomChange={setZoomDomain} />
      </div>
      <p className="text-[10px] mt-1.5" style={{ color: 'var(--sct-muted)' }}>
        Top panel: BTC price (log scale). Bottom panel: NUPL using 730-day MA as realized price proxy. Shaded zones indicate historical sentiment regions from Capitulation to Euphoria.
      </p>
    </div>
  );
}
