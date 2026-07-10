"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceDot,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { BTCGliRow, GLITurningPoint, GLIPhaseZone } from '@/lib/indicators/gliLag';

type Props = {
  data:               BTCGliRow[];
  turningPoints:      GLITurningPoint[];
  phaseZones:         GLIPhaseZone[];
  showRaw:            boolean;
  showTurningPoints:  boolean;
  showPhases:         boolean;
  isSelecting:        boolean;
  selectionArea:      { x1: string; x2: string } | null;
  chartHandlers: { onMouseDown: (e: any) => void; onMouseMove: (e: any) => void; onMouseUp: () => void };
  cancel:             () => void;
};

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtGli(v: number): string {
  return v.toFixed(1);
}

function fmtXTick(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const PHASE_FILL: Record<'rising' | 'falling', string> = {
  rising:  'rgba(53,208,127,0.06)',
  falling: 'rgba(248,81,73,0.06)',
};

type TipProps = {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string;
  showRaw: boolean;
};

function Tip({ active, payload, label, showRaw }: TipProps) {
  if (!active || !payload?.length || !label) return null;
  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const row = payload[0]?.payload as BTCGliRow | undefined;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs font-mono space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 190 }}>
      <p style={{ color: 'var(--sct-muted)' }}>{date}</p>
      {row?.btcClose != null && <p style={{ color: '#F7931A' }}>BTC: {fmtPrice(row.btcClose)}</p>}
      {row?.gliShifted != null && <p style={{ color: '#F5F7FA' }}>GLI (shifted): {fmtGli(row.gliShifted)}</p>}
      {showRaw && row?.gliRaw != null && <p style={{ color: '#8B949E' }}>GLI (raw): {fmtGli(row.gliRaw)}</p>}
    </div>
  );
}

export function BTCGLILagChart({
  data, turningPoints, phaseZones, showRaw, showTurningPoints, showPhases,
  isSelecting, selectionArea, chartHandlers, cancel,
}: Props) {
  const turningDots = showTurningPoints
    ? turningPoints.filter(tp => data.length && tp.shiftedTime >= data[0].time && tp.shiftedTime <= data[data.length - 1].time)
    : [];

  return (
    <div
      style={{ position: 'relative', width: '100%', height: 460, cursor: isSelecting ? 'crosshair' : 'default', userSelect: 'none' }}
      onMouseLeave={cancel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

          <XAxis
            dataKey="time"
            tickFormatter={fmtXTick}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            minTickGap={80}
          />

          <YAxis
            yAxisId="price"
            scale="log"
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtPrice}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={64}
          />
          <YAxis
            yAxisId="gli"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={40}
          />

          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content={(props: any) => <Tip {...props} showRaw={showRaw} />}
            cursor={isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }}
          />

          {selectionArea && (
            <ReferenceArea
              yAxisId="price"
              x1={selectionArea.x1}
              x2={selectionArea.x2}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
          )}

          {showPhases && phaseZones.map(z => (
            <ReferenceArea
              key={z.start}
              yAxisId="price"
              x1={z.start}
              x2={z.end}
              fill={PHASE_FILL[z.phase]}
              strokeOpacity={0}
            />
          ))}

          {/* BTC Price */}
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="btcClose"
            stroke="#F7931A"
            strokeWidth={2.5}
            fill="rgba(247,147,26,0.04)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* GLI raw (optional, dim) */}
          {showRaw && (
            <Line
              yAxisId="gli"
              type="monotone"
              dataKey="gliRaw"
              stroke="rgba(139,148,158,0.45)"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* GLI shifted forward by lag */}
          <Line
            yAxisId="gli"
            type="monotone"
            dataKey="gliShifted"
            stroke="#F5F7FA"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {showTurningPoints && turningDots.map(tp => (
            <ReferenceDot
              key={`${tp.type}-${tp.time}`}
              yAxisId="gli"
              x={tp.shiftedTime}
              y={tp.gliValue}
              r={4}
              fill="#FDE047"
              stroke="#05070B"
              strokeWidth={1}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
