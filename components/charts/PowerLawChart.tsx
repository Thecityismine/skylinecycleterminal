"use client";

import { useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea,
} from "recharts";
import type { PowerLawPoint } from "@/lib/indicators/powerLaw";
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  data: PowerLawPoint[];
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

const HALVINGS = [
  { date: '2012-11-28', label: 'H1' },
  { date: '2016-07-09', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-19', label: 'H4' },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

const YEAR_TICKS = Array.from({ length: 20 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime()
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1)         return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PowerLawPoint;

  const rows = [
    d.price  != null && { label: 'BTC Price',   val: fmtPrice(d.price), color: 'rgba(247,249,252,0.9)' },
    d.fair   != null && { label: 'Fair Value',  val: fmtPrice(d.fair),  color: '#38BDF8' },
    d.floor  != null && { label: 'Floor',        val: fmtPrice(d.floor), color: '#818CF8' },
    d.ceil   != null && { label: 'Ceiling',      val: fmtPrice(d.ceil),  color: '#F472B6' },
  ].filter(Boolean) as { label: string; val: string; color: string }[];

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-xl min-w-[180px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="font-mono mb-2" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>{r.label}</span>
            <span className="font-mono font-semibold" style={{ color: r.color }}>{r.val}</span>
          </div>
        ))}
        {d.price != null && d.fair != null && (
          <div className="flex justify-between gap-4 pt-1 border-t" style={{ borderColor: 'var(--sct-border)' }}>
            <span style={{ color: 'var(--sct-muted)' }}>vs Fair</span>
            <span className="font-mono" style={{ color: d.price > d.fair ? '#F97316' : '#35D07F' }}>
              {d.price > d.fair ? '+' : ''}{(((d.price - d.fair) / d.fair) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PowerLawChart({ data, onZoomChange }: Props) {
  const halvingTs = HALVINGS.map(h => new Date(h.date + 'T00:00:00Z').getTime());

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

        {halvingTs.map((ts, i) => (
          <ReferenceLine
            key={ts}
            x={ts}
            stroke="rgba(100,100,120,0.35)"
            strokeWidth={1}
            strokeDasharray="4 3"
            label={{
              value: HALVINGS[i].label,
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
          tickFormatter={ts => new Date(ts).getUTCFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />

        <YAxis
          scale="log"
          domain={[1, 'auto']}
          ticks={LOG_TICKS}
          tickFormatter={fmtPrice}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={64}
          allowDataOverflow
        />

        <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : undefined} />

        {/* Ceiling — pink/red */}
        <Line
          type="monotone"
          dataKey="ceil"
          stroke="#F472B6"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />

        {/* Fair Value — cyan */}
        <Line
          type="monotone"
          dataKey="fair"
          stroke="#38BDF8"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />

        {/* Floor — indigo */}
        <Line
          type="monotone"
          dataKey="floor"
          stroke="#818CF8"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />

        {/* BTC Price — white, on top */}
        <Line
          type="monotone"
          dataKey="price"
          stroke="rgba(247,249,252,0.9)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
