"use client";

import { useEffect, useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceArea, ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartWatermark } from './ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';
import { riskColor, riskZone, ZONE_META } from '@/lib/indicators/riskScore';
import { HALVINGS } from '@/lib/indicators/halvingCycles';

export type ChartPoint = { ts: number; time: string; price: number; score: number | null };

type Props = {
  points: ChartPoint[];
  showBands: boolean;
  onZoomChange?: (domain: ZoomDomain<number> | null) => void;
};

const BAND_COUNT = 5;

const ZONE_BANDS = [
  { y1: 0.0, y2: 0.2, key: 'accumulation' as const },
  { y1: 0.2, y2: 0.4, key: 'value' as const },
  { y1: 0.4, y2: 0.6, key: 'neutral' as const },
  { y1: 0.6, y2: 0.8, key: 'caution' as const },
  { y1: 0.8, y2: 1.0, key: 'distribution' as const },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

const YEAR_TICKS = Array.from({ length: 16 }, (_, i) =>
  new Date(`${2011 + i}-01-01T00:00:00Z`).getTime(),
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function bandIndex(score: number): number {
  return Math.min(BAND_COUNT - 1, Math.floor(score * BAND_COUNT));
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const color = d.score != null ? riskColor(d.score) : 'var(--sct-muted)';
  const zone  = d.score != null ? ZONE_META[riskZone(d.score)] : null;
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[180px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="flex justify-between gap-6">
        <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
        <span className="text-xs font-mono font-bold" style={{ color: '#F7931A' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.price)}
        </span>
      </div>
      {d.score != null && (
        <>
          <div className="flex justify-between gap-6">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Risk Score</span>
            <span className="text-xs font-mono font-bold" style={{ color }}>{d.score.toFixed(3)}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Zone</span>
            <span className="text-xs font-medium" style={{ color }}>{zone?.label}</span>
          </div>
        </>
      )}
    </div>
  );
}

export function RiskColoredPriceChart({ points, showBands, onZoomChange }: Props) {
  const zoom = useChartZoom<number>();

  useEffect(() => { onZoomChange?.(zoom.domain); }, [zoom.domain, onZoomChange]);

  const chartData = useMemo(() => {
    return points.map((p, i) => {
      const row: Record<string, number | string | null> = { ts: p.ts, time: p.time, price: p.price, score: p.score };
      for (let b = 0; b < BAND_COUNT; b++) row[`price_b${b}`] = null;

      if (p.score != null) {
        const band = bandIndex(p.score);
        row[`price_b${band}`] = p.price;

        const prev = points[i - 1];
        if (prev?.score != null && bandIndex(prev.score) !== band) {
          row[`price_b${bandIndex(prev.score)}`] = p.price;
        }
      }
      return row;
    });
  }, [points]);

  const prices = points.map((p) => p.price).filter((v) => v > 0);
  const pMin = prices.length ? Math.max(0.01, Math.min(...prices) * 0.6) : 0.01;
  const pMax = prices.length ? Math.max(...prices) * 1.5 : 200_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const bandColors = Array.from({ length: BAND_COUNT }, (_, b) => riskColor((b + 0.5) / BAND_COUNT));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="flex items-center justify-end gap-3 mb-1 flex-wrap">
        {zoom.isZoomed && (
          <button
            onClick={zoom.reset}
            className="px-3 py-1 rounded text-xs font-mono border transition-all"
            style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}
          >
            Reset Zoom
          </button>
        )}
        {!zoom.isZoomed && (
          <span className="hidden md:inline text-[10px] font-mono" style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
            drag to zoom
          </span>
        )}
      </div>

      <div
        style={{ position: 'relative', width: '100%', height: 440, cursor: zoom.isSelecting ? 'crosshair' : 'default', userSelect: 'none' }}
        onMouseLeave={zoom.cancel}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 60, bottom: 0, left: 0 }} {...zoom.chartHandlers}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

            {showBands && ZONE_BANDS.map((b) => (
              <ReferenceArea
                key={b.key}
                yAxisId="risk"
                y1={b.y1}
                y2={b.y2}
                fill={ZONE_META[b.key].color}
                fillOpacity={0.06}
                stroke="none"
              />
            ))}

            {HALVINGS.filter((h) => !h.estimated).map((h) => (
              <ReferenceLine
                key={h.label}
                yAxisId="risk"
                x={h.ts}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="3 5"
                label={{ value: h.label, position: 'insideTopRight', fill: 'rgba(255,255,255,0.28)', fontSize: 9 }}
              />
            ))}

            {zoom.selectionArea && (
              <ReferenceArea
                yAxisId="risk"
                x1={zoom.selectionArea.x1}
                x2={zoom.selectionArea.x2}
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
              />
            )}

            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={zoom.domain ? [zoom.domain.start, zoom.domain.end] : ['dataMin', 'dataMax']}
              ticks={YEAR_TICKS}
              tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
              tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
            />

            <YAxis
              yAxisId="risk"
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
              tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              width={36}
            />

            <YAxis
              yAxisId="price"
              orientation="right"
              scale="log"
              domain={[pMin, pMax]}
              ticks={logTicks}
              tickFormatter={fmtPrice}
              tick={{ fill: '#F7931A', fontSize: 10, fontFamily: 'monospace', opacity: 0.7 }}
              axisLine={false}
              tickLine={false}
              width={56}
              allowDataOverflow
            />

            <Tooltip content={<CustomTooltip />} cursor={zoom.isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }} />

            {Array.from({ length: BAND_COUNT }, (_, b) => (
              <Line
                key={b}
                yAxisId="price"
                type="monotone"
                dataKey={`price_b${b}`}
                stroke={bandColors[b]}
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <ChartWatermark />
      </div>
    </div>
  );
}
