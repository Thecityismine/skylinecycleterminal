"use client";

import { useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { MAPoint } from "@/lib/indicators/cycleHelpers";
import { HALVINGS } from "@/lib/indicators/cycleHelpers";
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  data: MAPoint[];
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

const LOG_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];

function formatPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function formatTooltipPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

const YEAR_TICKS = Array.from({ length: 17 }, (_, i) =>
  new Date(`${2012 + i}-01-01`).getTime()
);

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as MAPoint;
  const zone =
    d.ma5 != null && d.price > d.ma5
      ? { label: 'Distribution Zone', color: '#FF5C5C' }
      : d.ma != null && d.price < d.ma
      ? { label: 'Accumulation Zone', color: '#3B82F6' }
      : { label: 'Neutral Zone', color: 'var(--sct-muted)' };

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[180px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Price</span>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
            {formatTooltipPrice(d.price)}
          </span>
        </div>
        {d.ma != null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>2Y MA</span>
            <span className="text-xs font-mono" style={{ color: '#F7931A' }}>
              {formatTooltipPrice(d.ma)}
            </span>
          </div>
        )}
        {d.ma5 != null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>2Y MA ×5</span>
            <span className="text-xs font-mono" style={{ color: '#FF5C5C' }}>
              {formatTooltipPrice(d.ma5)}
            </span>
          </div>
        )}
        {d.ma != null && (
          <div className="flex justify-between gap-4 pt-1 border-t" style={{ borderColor: 'var(--sct-border)' }}>
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Multiplier</span>
            <span className="text-xs font-mono font-medium" style={{ color: zone.color }}>
              {(d.price / d.ma).toFixed(2)}×
            </span>
          </div>
        )}
      </div>
      <p className="text-[10px] mt-2 font-mono" style={{ color: zone.color }}>{zone.label}</p>
    </div>
  );
}

export function TwoYearMAChart({ data, onZoomChange }: Props) {
  const halvingTs = HALVINGS.slice(0, -1).map((h) => ({
    ...h,
    ts: new Date(h.date).getTime(),
  }));

  const {
    domain, isSelecting, selectionArea, cancel, chartHandlers,
  } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  const chartData = useMemo(() => {
    if (!domain) return data;
    return data.filter(d => d.ts >= domain.start && d.ts <= domain.end);
  }, [data, domain]);

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100%',
        cursor: isSelecting ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
      onMouseLeave={cancel}
    >
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 12, right: 16, bottom: 0, left: 8 }} {...chartHandlers}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

        {/* Drag-to-zoom selection rectangle */}
        {selectionArea && (
          <ReferenceArea
            x1={selectionArea.x1}
            x2={selectionArea.x2}
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1}
          />
        )}

        {/* Halving lines */}
        {halvingTs.map((h) => (
          <ReferenceLine
            key={h.date}
            x={h.ts}
            stroke="rgba(100,100,120,0.4)"
            strokeWidth={1}
            strokeDasharray="4 3"
            label={{
              value: h.label,
              position: 'top',
              fill: 'rgba(100,100,120,0.7)',
              fontSize: 10,
              fontFamily: 'var(--font-geist-mono)',
            }}
          />
        ))}

        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={YEAR_TICKS}
          tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />

        <YAxis
          scale="log"
          domain={[100, 'auto']}
          ticks={LOG_TICKS}
          tickFormatter={formatPrice}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={64}
        />

        <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : undefined} />

        {/* 2Y MA × 5 — distribution ceiling (red dashed) */}
        <Line
          type="monotone"
          dataKey="ma5"
          stroke="#FF5C5C"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
        />

        {/* 2Y MA — accumulation floor (orange) */}
        <Line
          type="monotone"
          dataKey="ma"
          stroke="#F7931A"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
        />

        {/* BTC Price (white, on top) */}
        <Line
          type="monotone"
          dataKey="price"
          stroke="rgba(247,249,252,0.9)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
