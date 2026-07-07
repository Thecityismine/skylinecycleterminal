"use client";

import { useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { vintageColorForYear, type VintageChartPoint } from '@/lib/indicators/capitalAgeStructure';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  data: VintageChartPoint[];
  years: string[];
  height?: number;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

type TooltipProps = { active?: boolean; payload?: { payload: VintageChartPoint }[]; years: string[] };

function CustomTooltip({ active, payload, years }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload.find((p) => p.payload)?.payload;
  if (!d) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[200px] max-h-[320px] overflow-y-auto"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs font-mono mb-2" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-0.5">
        {[...years].reverse().map((y: string) => {
          const v = Number(d[y]);
          if (!v || v < 0.05) return null;
          return (
            <div key={y} className="flex justify-between gap-6">
              <span className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--sct-muted)' }}>
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: vintageColorForYear(y, years), display: 'inline-block' }} />
                {y}
              </span>
              <span className="text-[10px] font-mono" style={{ color: vintageColorForYear(y, years) }}>{v.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VintageSupplyChart({ data, years, height = 460, onZoomChange }: Props) {
  const { domain, isSelecting, selectionArea, cancel, chartHandlers } = useChartZoom<number>();

  useEffect(() => { onZoomChange?.(domain); }, [domain, onZoomChange]);

  const chartData = useMemo(() => {
    if (!domain) return data;
    return data.filter((d) => d.ts >= domain.start && d.ts <= domain.end);
  }, [data, domain]);

  if (!data.length) return null;

  return (
    <div
      style={{ position: 'relative', width: '100%', height, cursor: isSelecting ? 'crosshair' : 'default', userSelect: 'none' }}
      onMouseLeave={cancel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

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
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            minTickGap={40}
          />

          <YAxis
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={40}
          />

          <Tooltip content={<CustomTooltip years={years} />} cursor={isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }} />

          {years.map((y) => (
            <Area
              key={y}
              type="monotone"
              dataKey={y}
              stackId="vintage"
              stroke="none"
              fill={vintageColorForYear(y, years)}
              fillOpacity={0.92}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
