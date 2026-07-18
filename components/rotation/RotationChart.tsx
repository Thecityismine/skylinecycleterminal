"use client";

import { useMemo, useEffect } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceArea, ReferenceLine, ReferenceDot,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';
import type { RotationRange, MAPeriod } from './RotationToolbar';
import type { OverlayKey } from '@/lib/rotation/tabConfig';

export type RotationChartPoint = {
  time:       string;
  ts:         number;
  value:      number;
  ma50:       number | null;
  ma100:      number | null;
  ma200:      number | null;
  cloudUpper: number | null;
  cloudLower: number | null;
};

type SwingPoint = { ts: number; value: number; type: 'high' | 'low' };
type ChochEvent = { ts: number; direction: 'bullish' | 'bearish'; brokenLevel: number };

type Props = {
  points:        RotationChartPoint[];
  ma:            MAPeriod;
  logScale:      boolean;
  range:         RotationRange;
  color:         string;
  isRatio:       boolean;
  overlays:      OverlayKey[];
  choch:         ChochEvent[];
  swings:        SwingPoint[];
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

const RANGE_YEARS: Record<RotationRange, number | null> = { '2Y': 2, '4Y': 4, '8Y': 8, All: null };

export function fmtRotationValue(v: number, isRatio: boolean): string {
  if (isRatio) return v.toFixed(3);
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toFixed(0)}`;
}

function fmtMonth(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

type TooltipProps = {
  active?:  boolean;
  payload?: { payload: RotationChartPoint }[];
  isRatio:  boolean;
  ma:       MAPeriod;
};

function CustomTooltip({ active, payload, isRatio, ma }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const maValue = ma === 50 ? d.ma50 : ma === 100 ? d.ma100 : d.ma200;
  return (
    <div className="rounded-lg border px-3 py-2.5 shadow-xl space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 180 }}>
      <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-sm font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{fmtRotationValue(d.value, isRatio)}</p>
      {maValue != null && (
        <p className="text-xs font-mono" style={{ color: 'var(--sct-blue)' }}>{ma}W MA: {fmtRotationValue(maValue, isRatio)}</p>
      )}
    </div>
  );
}

export function RotationChart({
  points, ma, logScale, range, color, isRatio, overlays, choch, swings, onZoomChange,
}: Props) {
  const { domain, isSelecting, selectionArea, cancel, chartHandlers } = useChartZoom<number>();

  useEffect(() => { onZoomChange?.(domain); }, [domain, onZoomChange]);

  const startTs = useMemo(() => {
    const years = RANGE_YEARS[range];
    if (!points.length) return 0;
    if (years == null) return points[0].ts;
    const lastTs = points[points.length - 1].ts;
    return lastTs - years * 365 * 86_400_000;
  }, [range, points]);

  const chartData = useMemo(() => {
    const visible = points
      .filter((p) => p.ts >= startTs)
      .map((p) => ({
        ...p,
        cloudRange: p.cloudUpper != null && p.cloudLower != null ? [p.cloudLower, p.cloudUpper] as [number, number] : null,
      }));
    if (!domain) return visible;
    return visible.filter((p) => p.ts >= domain.start && p.ts <= domain.end);
  }, [points, startTs, domain]);

  const maKey = ma === 50 ? 'ma50' : ma === 100 ? 'ma100' : 'ma200';

  const visibleChoch = useMemo(() => choch.filter((c) => c.ts >= startTs), [choch, startTs]);
  const recentSwingHigh = useMemo(() => {
    const highs = swings.filter((s) => s.type === 'high' && s.ts >= startTs);
    return highs.length ? highs[highs.length - 1] : null;
  }, [swings, startTs]);
  const recentSwingLow = useMemo(() => {
    const lows = swings.filter((s) => s.type === 'low' && s.ts >= startTs);
    return lows.length ? lows[lows.length - 1] : null;
  }, [swings, startTs]);

  if (!chartData.length) return null;

  const values = chartData.map((d) => d.value).filter((v) => v > 0);
  const minV = values.length ? Math.min(...values) * (logScale ? 0.85 : 0.95) : 0;
  const maxV = values.length ? Math.max(...values) * 1.08 : 1;

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', cursor: isSelecting ? 'crosshair' : 'default', userSelect: 'none' }}
      onMouseLeave={cancel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

          {selectionArea && (
            <ReferenceArea x1={selectionArea.x1} x2={selectionArea.x2} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
          )}

          <XAxis
            dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
            tickFormatter={fmtMonth}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} minTickGap={80}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'} domain={[minV, maxV]} allowDataOverflow
            tickFormatter={(v) => fmtRotationValue(v, isRatio)}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} width={64}
          />

          <Tooltip content={<CustomTooltip isRatio={isRatio} ma={ma} />} cursor={isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }} />

          {overlays.includes('cloud') && (
            <Area type="monotone" dataKey="cloudRange" stroke="none" fill={color} fillOpacity={0.08} isAnimationActive={false} connectNulls />
          )}

          {overlays.includes('swing') && recentSwingHigh && (
            <ReferenceLine
              y={recentSwingHigh.value} stroke="rgba(255,92,92,0.4)" strokeDasharray="4 4"
              label={{ value: 'Swing High', position: 'insideTopRight', fontSize: 9, fill: 'rgba(255,92,92,0.7)' }}
            />
          )}
          {overlays.includes('swing') && recentSwingLow && (
            <ReferenceLine
              y={recentSwingLow.value} stroke="rgba(53,208,127,0.4)" strokeDasharray="4 4"
              label={{ value: 'Swing Low', position: 'insideBottomRight', fontSize: 9, fill: 'rgba(53,208,127,0.7)' }}
            />
          )}

          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />

          {overlays.includes('trend') && (
            <Line type="monotone" dataKey={maKey} stroke="#5B84FF" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          )}

          {overlays.includes('choch') && visibleChoch.map((c) => (
            <ReferenceDot
              key={`choch-${c.ts}`} x={c.ts} y={c.brokenLevel} r={4}
              fill={c.direction === 'bullish' ? '#35D07F' : '#FF5C5C'} stroke="none"
              label={{
                value:    'CHOCH',
                position: c.direction === 'bullish' ? 'bottom' : 'top',
                fontSize: 9,
                fill:     c.direction === 'bullish' ? '#35D07F' : '#FF5C5C',
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
