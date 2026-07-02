"use client";

import { useMemo, useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import type { BtcM2Point } from "@/app/api/price/btc-m2/route";
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  data: BtcM2Point[];
  logScale: boolean;
  onRangeChange?: (r: Range) => void;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

export type Range = '4Y' | '8Y' | 'All';
const RANGES: Range[] = ['4Y', '8Y', 'All'];
const RANGE_DAYS: Record<Range, number> = { '4Y': 1460, '8Y': 2920, 'All': Infinity };

const YEAR_TICKS = Array.from({ length: 16 }, (_, i) =>
  new Date(`${2013 + i}-01-01T00:00:00Z`).getTime()
);

function fmtRatio(v: number): string {
  return v.toFixed(2);
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as BtcM2Point;
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-xl min-w-[190px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="font-mono mb-2" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--sct-muted)' }}>BTC / M2</span>
          <span className="font-mono font-semibold" style={{ color: 'rgba(247,249,252,0.9)' }}>
            {fmtRatio(d.ratio)}
          </span>
        </div>
        {d.ema200 != null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: '#35D07F' }}>200 EMA</span>
            <span className="font-mono" style={{ color: '#35D07F' }}>{fmtRatio(d.ema200)}</span>
          </div>
        )}
        {d.ema400 != null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: '#FF5C5C' }}>400 EMA</span>
            <span className="font-mono" style={{ color: '#FF5C5C' }}>{fmtRatio(d.ema400)}</span>
          </div>
        )}
        {d.sma52 != null && (
          <div className="flex justify-between gap-4">
            <span style={{ color: '#E6B450' }}>52 SMA</span>
            <span className="font-mono" style={{ color: '#E6B450' }}>{fmtRatio(d.sma52)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function BtcM2Chart({ data, logScale, onRangeChange, onZoomChange }: Props) {
  const [range, setRange] = useState<Range>('All');

  const {
    domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers,
  } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  const displayed = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => d.ts >= cutoff);
  }, [data, range]);

  const chartData = useMemo(() => {
    if (!domain) return displayed;
    return displayed.filter(d => d.ts >= domain.start && d.ts <= domain.end);
  }, [displayed, domain]);

  const yDomain: [number | string, number | string] = logScale
    ? ['auto', 'auto']
    : [0, 'auto'];

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center gap-2 mb-4">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => { setRange(r); onRangeChange?.(r); reset(); }}
            className="px-3 py-1 rounded text-xs font-mono border transition-all"
            style={{
              backgroundColor: range === r && !isZoomed ? 'var(--sct-border)' : 'transparent',
              borderColor:     'var(--sct-border)',
              color:           range === r && !isZoomed ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            {r}
          </button>
        ))}
        {isZoomed && (
          <button
            onClick={reset}
            className="px-3 py-1 rounded text-xs font-mono border transition-all"
            style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}
          >
            Reset Zoom
          </button>
        )}
        {!isZoomed && (
          <span className="hidden md:inline text-[10px] font-mono ml-1" style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
            drag to zoom
          </span>
        )}
      </div>

      <div
        style={{
          position: 'relative', width: '100%', height: 480,
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

        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={YEAR_TICKS}
          tickFormatter={ts => new Date(ts).getUTCFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />

        <YAxis
          scale={logScale ? 'log' : 'auto'}
          domain={yDomain}
          allowDataOverflow
          tickFormatter={fmtRatio}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={48}
        />

        <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : undefined} />

        {/* 400 EMA — red, thicker base */}
        <Line
          type="monotone"
          dataKey="ema400"
          stroke="#FF5C5C"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
        />

        {/* 200 EMA — green */}
        <Line
          type="monotone"
          dataKey="ema200"
          stroke="#35D07F"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
        />

        {/* 52 SMA — dashed yellow */}
        <Line
          type="monotone"
          dataKey="sma52"
          stroke="#E6B450"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
        />

        {/* BTC/M2 ratio — white on top */}
        <Line
          type="monotone"
          dataKey="ratio"
          stroke="rgba(247,249,252,0.85)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
    </div>
  );
}
