"use client";

import { useState, useMemo, useCallback } from 'react';
import { BtcM2Chart }       from '@/components/charts/BtcM2Chart';
import type { Range }       from '@/components/charts/BtcM2Chart';
import { BtcM2ShareModal }  from '@/components/share/BtcM2ShareModal';
import type { BtcM2Point }  from '@/lib/indicators/btcM2';
import type { BtcM2SharePayload } from '@/components/share/BtcM2ShareCard';
import type { ZoomDomain }  from '@/lib/hooks/useChartZoom';

const RANGE_DAYS: Record<Range, number> = { '4Y': 1460, '8Y': 2920, 'All': Infinity };

function fmtZoomLabel(domain: ZoomDomain<number>): string {
  const fmt = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  return `${fmt(domain.start)} – ${fmt(domain.end)}`;
}

type Props = {
  points:    BtcM2Point[];
  ratio:     number | null;
  ema200:    number | null;
  ema400:    number | null;
  sma52:     number | null;
  zoneLabel: string | null;
  zoneColor: string | null;
};

export function BtcM2PageClient({ points, ratio, ema200, ema400, sma52, zoneLabel, zoneColor }: Props) {
  const [logScale, setLogScale] = useState(false);
  const [range, setRange] = useState<Range>('All');
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);

  const handleZoomChange = useCallback((d: ZoomDomain<number> | null) => {
    setZoomDomain(d);
  }, []);

  const displayed = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === Infinity) return points;
    const cutoff = Date.now() - days * 86_400_000;
    return points.filter(d => d.ts >= cutoff);
  }, [points, range]);

  // For share: zoom-filter on top of range-filter when zoomed, so the
  // exported card only shows the chart region currently selected/zoomed.
  const shareData = useMemo(() => {
    if (!zoomDomain) return displayed;
    return displayed.filter(d => d.ts >= zoomDomain.start && d.ts <= zoomDomain.end);
  }, [displayed, zoomDomain]);

  const shareRange = zoomDomain ? fmtZoomLabel(zoomDomain) : range;

  const sharePayload: BtcM2SharePayload = {
    points: shareData,
    range: shareRange,
    logScale,
    ratio,
    ema200,
    ema400,
    sma52,
    zoneLabel,
    zoneColor,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div
      className="rounded-xl border p-5 space-y-4"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Weekly · BTC Price ÷ US M2 Money Supply
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            Ratio scaled ×1000 · removes monetary expansion from price — from 2012
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BtcM2ShareModal payload={sharePayload} />

          <button
            onClick={() => setLogScale(v => !v)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: logScale ? '#A855F720' : 'transparent',
              borderColor:     logScale ? '#A855F7'   : 'var(--sct-border)',
              color:           logScale ? '#A855F7'   : 'var(--sct-muted)',
            }}
          >
            LOG
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {[
          { color: 'rgba(247,249,252,0.85)', label: 'BTC / M2 Ratio' },
          { color: '#35D07F',               label: '200 EMA' },
          { color: '#FF5C5C',               label: '400 EMA' },
          { color: '#E6B450',               label: '52 SMA', dashed: true },
        ].map(({ color, label, dashed }) => (
          <span
            key={label}
            className="flex items-center gap-1.5 text-xs font-mono"
            style={{ color: 'var(--sct-muted)' }}
          >
            <span
              style={{
                display:         'inline-block',
                width:           24,
                height:          dashed ? 0 : 1.5,
                backgroundColor: dashed ? undefined : color,
                borderTop:       dashed ? `2px dashed ${color}` : undefined,
              }}
            />
            {label}
          </span>
        ))}
      </div>

      <BtcM2Chart
        data={points}
        logScale={logScale}
        onRangeChange={setRange}
        onZoomChange={handleZoomChange}
      />
    </div>
  );
}
