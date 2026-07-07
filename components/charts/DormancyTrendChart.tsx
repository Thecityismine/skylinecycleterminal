"use client";

import { useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import type { HodlWaveChartPoint } from '@/lib/indicators/capitalAgeStructure';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  data: HodlWaveChartPoint[];
  height?: number;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

const LOG_TICKS = [0.1, 1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1)         return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

type TooltipProps = { active?: boolean; payload?: { payload: HodlWaveChartPoint }[] };

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload.find((p) => p.payload)?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[180px]" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs font-mono mb-1.5" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="flex justify-between gap-6">
        <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Avg Coin Age</span>
        <span className="text-xs font-mono font-bold" style={{ color: '#35D07F' }}>{d.dormancyYears.toFixed(2)}y</span>
      </div>
      <div className="flex justify-between gap-6">
        <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
        <span className="text-xs font-mono" style={{ color: 'rgba(230,237,243,0.8)' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.price)}
        </span>
      </div>
    </div>
  );
}

export function DormancyTrendChart({ data, height = 340, onZoomChange }: Props) {
  const { domain, isSelecting, selectionArea, cancel, chartHandlers } = useChartZoom<number>();

  useEffect(() => { onZoomChange?.(domain); }, [domain, onZoomChange]);

  const chartData = useMemo(() => {
    if (!domain) return data;
    return data.filter((d) => d.ts >= domain.start && d.ts <= domain.end);
  }, [data, domain]);

  if (!data.length) return null;

  const prices = chartData.map((d) => d.price).filter((v) => v > 0);
  const pMin = prices.length ? Math.max(0.05, Math.min(...prices) * 0.5) : 0.05;
  const pMax = prices.length ? Math.max(...prices) * 2.5 : 200_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const ages = chartData.map((d) => d.dormancyYears);
  const aMax = ages.length ? Math.max(...ages) * 1.2 : 5;

  return (
    <div style={{ position: 'relative', width: '100%', height, cursor: isSelecting ? 'crosshair' : 'default', userSelect: 'none' }} onMouseLeave={cancel}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 56, bottom: 0, left: 4 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />
          {selectionArea && (
            <ReferenceArea yAxisId="age" x1={selectionArea.x1} x2={selectionArea.x2} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
          )}
          <XAxis
            dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} minTickGap={40}
          />
          <YAxis
            yAxisId="age" domain={[0, aMax]} tickFormatter={(v) => `${v.toFixed(1)}y`}
            tick={{ fill: '#35D07F', fontSize: 11 }} axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} width={44}
          />
          <YAxis
            yAxisId="price" orientation="right" scale="log" domain={[pMin, pMax]} ticks={logTicks} tickFormatter={fmtPrice}
            tick={{ fill: 'rgba(230,237,243,0.45)', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={54} allowDataOverflow
          />
          <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }} />
          <Line yAxisId="price" type="monotone" dataKey="price" stroke="rgba(245,247,250,0.55)" strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls />
          <Area yAxisId="age" type="monotone" dataKey="dormancyYears" stroke="#35D07F" strokeWidth={2} fill="rgba(53,208,127,0.12)" dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
