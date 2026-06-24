"use client";

import { useMemo, useEffect } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { StablecoinDominancePoint } from '@/lib/indicators/stablecoinDominance';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtDom(v: number) {
  return `${v.toFixed(1)}%`;
}

function fmtBTC(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

type Props = {
  data:      StablecoinDominancePoint[];
  logBTC?:   boolean;
  startTs?:  number;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

export function StablecoinDominanceChart({ data, logBTC = true, startTs, onZoomChange }: Props) {
  const {
    domain, isSelecting, selectionArea, cancel, chartHandlers,
  } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  const base = startTs ? data.filter((p) => p.ts >= startTs) : data;

  const filtered = useMemo(() => {
    if (!domain) return base;
    return base.filter(d => d.ts >= domain.start && d.ts <= domain.end);
  }, [base, domain]);

  if (!filtered.length) return null;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload as StablecoinDominancePoint;
    if (!d) return null;
    return (
      <div className="rounded-lg border px-3 py-2.5 text-xs space-y-1 min-w-[180px]"
        style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}>
        <p className="font-medium" style={{ color: 'var(--sct-secondary)' }}>
          {new Date(d.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="space-y-0.5">
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>Stablecoin Dom.</span>
            <span className="font-mono font-bold" style={{ color: '#4DA3FF' }}>{d.dominance.toFixed(2)}%</span>
          </div>
          {d.ma30 != null && (
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--sct-muted)' }}>30D MA</span>
              <span className="font-mono" style={{ color: '#93C5FD' }}>{d.ma30.toFixed(2)}%</span>
            </div>
          )}
          {d.ma90 != null && (
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--sct-muted)' }}>90D MA</span>
              <span className="font-mono" style={{ color: '#60A5FA' }}>{d.ma90.toFixed(2)}%</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
            <span className="font-mono" style={{ color: '#F7931A' }}>{fmtBTC(d.btcPrice)}</span>
          </div>
        </div>
      </div>
    );
  };

  const domValues = filtered.map((p) => p.dominance);
  const domMin    = Math.max(0, Math.min(...domValues) * 0.85);
  const domMax    = Math.max(...domValues) * 1.15;

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
        <ComposedChart data={filtered} margin={{ top: 8, right: 56, bottom: 0, left: 0 }} {...chartHandlers}>
          <defs>
            <linearGradient id="stable-dom-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#4DA3FF" stopOpacity={0.20} />
              <stop offset="95%" stopColor="#4DA3FF" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />

          {/* Drag-to-zoom selection rectangle */}
          {selectionArea && (
            <ReferenceArea
              yAxisId="dom"
              x1={selectionArea.x1}
              x2={selectionArea.x2}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
          )}

          {/* Horizontal risk-zone references */}
          <ReferenceLine yAxisId="dom" y={6}  stroke="rgba(53,208,127,0.25)"  strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine yAxisId="dom" y={12} stroke="rgba(255,92,92,0.25)"   strokeDasharray="4 4" strokeWidth={1} />

          <XAxis
            dataKey="ts" type="number" scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtDate}
            tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
            tickLine={false} axisLine={false} minTickGap={60}
          />

          {/* Left: stablecoin dominance % */}
          <YAxis
            yAxisId="dom"
            domain={[domMin, domMax]}
            tickFormatter={fmtDom}
            tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
            tickLine={false} axisLine={false} width={42}
          />

          {/* Right: BTC price */}
          <YAxis
            yAxisId="btc"
            orientation="right"
            scale={logBTC ? 'log' : 'linear'}
            domain={['auto', 'auto']}
            tickFormatter={fmtBTC}
            tick={{ fill: 'rgba(247,147,26,0.45)', fontSize: 9 }}
            tickLine={false} axisLine={false} width={52}
          />

          <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : undefined} />

          {/* BTC price — thin muted background line */}
          <Line yAxisId="btc" type="monotone" dataKey="btcPrice"
            stroke="rgba(247,147,26,0.30)" strokeWidth={1}
            dot={false} isAnimationActive={false} connectNulls />

          {/* Dominance area + line */}
          <Area yAxisId="dom" type="monotone" dataKey="dominance"
            stroke="#4DA3FF" strokeWidth={2}
            fill="url(#stable-dom-fill)"
            dot={false} isAnimationActive={false} />

          {/* 30D MA */}
          <Line yAxisId="dom" type="monotone" dataKey="ma30"
            stroke="#93C5FD" strokeWidth={1.5} strokeDasharray="5 3"
            dot={false} isAnimationActive={false} connectNulls />

          {/* 90D MA */}
          <Line yAxisId="dom" type="monotone" dataKey="ma90"
            stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="3 5"
            dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
