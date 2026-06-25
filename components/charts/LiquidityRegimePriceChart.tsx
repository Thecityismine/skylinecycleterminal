"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { LiquidityChartRow, LiquidityRegimeZone } from '@/lib/indicators/liquidityRegime';
import { REGIME_FILL, REGIME_LABEL, REGIME_COLOR } from '@/lib/indicators/liquidityRegime';

type Props = {
  data:          LiquidityChartRow[];
  zones:         LiquidityRegimeZone[];
  showMA100w:    boolean;
  showMA200w:    boolean;
  isSelecting:   boolean;
  selectionArea: { x1: string; x2: string } | null;
  chartHandlers: { onMouseDown: (e: any) => void; onMouseMove: (e: any) => void; onMouseUp: () => void };
  cancel:        () => void;
};

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1)         return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

function fmtXTick(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

type TipProps = {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string;
  showMA100w: boolean;
  showMA200w: boolean;
};

function Tip({ active, payload, label, showMA100w, showMA200w }: TipProps) {
  if (!active || !payload?.length || !label) return null;
  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const row = payload[0]?.payload as LiquidityChartRow | undefined;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs font-mono space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 180 }}>
      <p style={{ color: 'var(--sct-muted)' }}>{date}</p>
      {payload.filter((p: any) => p.dataKey === 'price' && p.value != null).map((p: any, i: number) => (
        <p key={i} style={{ color: 'rgba(245,247,250,0.85)' }}>Price: {fmtY(p.value as number)}</p>
      ))}
      {showMA100w && payload.filter((p: any) => p.dataKey === 'ma100w' && p.value != null).map((p: any, i: number) => (
        <p key={i} style={{ color: '#E6B450' }}>100W MA: {fmtY(p.value as number)}</p>
      ))}
      {showMA200w && payload.filter((p: any) => p.dataKey === 'ma200w' && p.value != null).map((p: any, i: number) => (
        <p key={i} style={{ color: '#5B84FF' }}>200W MA: {fmtY(p.value as number)}</p>
      ))}
      {row && (
        <p style={{ color: REGIME_COLOR[row.regime] }}>{REGIME_LABEL[row.regime]}</p>
      )}
    </div>
  );
}

export function LiquidityRegimePriceChart({
  data, zones, showMA100w, showMA200w,
  isSelecting, selectionArea, chartHandlers, cancel,
}: Props) {
  return (
    <div
      style={{
        position:   'relative',
        width:      '100%',
        height:     440,
        cursor:     isSelecting ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
      onMouseLeave={cancel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={fmtXTick}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={100}
          />

          <YAxis
            scale="log"
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={68}
          />

          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={(props: any) => <Tip {...props} showMA100w={showMA100w} showMA200w={showMA200w} />}
            cursor={isSelecting ? false : { stroke: '#1E293B', strokeWidth: 1 }}
          />

          {/* Selection rectangle */}
          {selectionArea && (
            <ReferenceArea
              x1={selectionArea.x1}
              x2={selectionArea.x2}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
          )}

          {/* Regime background shading */}
          {zones.map(z => (
            <ReferenceArea
              key={z.start}
              x1={z.start}
              x2={z.end}
              fill={REGIME_FILL[z.regime]}
              strokeOpacity={0}
            />
          ))}

          {/* BTC Price */}
          <Area
            type="monotone"
            dataKey="price"
            stroke="rgba(245,247,250,0.85)"
            strokeWidth={1.5}
            fill="rgba(245,247,250,0.02)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 100W MA */}
          {showMA100w && (
            <Line
              type="monotone"
              dataKey="ma100w"
              stroke="#E6B450"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* 200W MA */}
          {showMA200w && (
            <Line
              type="monotone"
              dataKey="ma200w"
              stroke="#5B84FF"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
