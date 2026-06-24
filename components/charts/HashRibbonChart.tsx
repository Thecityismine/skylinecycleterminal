"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

export type HRPoint = {
  date:    string;
  price:   number | null;
  ma30:    number | null;
  ma60:    number | null;
  ratio:   number | null;   // ma30 / ma60 — below 1.0 = capitulation
  inCapit: boolean;
};

export type Range = '2Y' | '4Y' | 'All';
const RANGES: Range[] = ['2Y', '4Y', 'All'];
const DAYS: Record<Range, number> = { '2Y': 730, '4Y': 1460, 'All': Infinity };

function fmtXTick(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtP(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function ChartTip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs font-mono space-y-0.5"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p className="pb-1" style={{ color: '#4B5563' }}>{date}</p>
      {payload.map((p, i) =>
        p.value != null ? (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {p.name === 'BTC Price' ? fmtP(p.value) : p.value.toFixed(3) + '×'}
          </p>
        ) : null
      )}
    </div>
  );
}

export function HashRibbonChart({
  data,
  onRangeChange,
  onZoomChange,
}: {
  data: HRPoint[];
  onRangeChange?: (r: Range) => void;
  onZoomChange?: (d: ZoomDomain<string> | null) => void;
}) {
  const [range, setRange] = useState<Range>('All');

  const {
    domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers,
  } = useChartZoom<string>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  const displayed = useMemo(() => {
    const days = DAYS[range];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter(d => new Date(d.date + 'T00:00:00').getTime() >= cutoff);
  }, [data, range]);

  const chartData = useMemo(() => {
    if (!domain) return displayed;
    return displayed.filter(d => d.date >= domain.start && d.date <= domain.end);
  }, [displayed, domain]);

  // Capitulation zones (ratio < 1.0)
  const capitZones = useMemo(() => {
    const out: { x1: string; x2: string }[] = [];
    let start: string | null = null;
    for (const p of chartData) {
      if (p.inCapit && !start)       { start = p.date; }
      else if (!p.inCapit && start)  { out.push({ x1: start, x2: p.date }); start = null; }
    }
    if (start) out.push({ x1: start, x2: chartData[chartData.length - 1].date });
    return out;
  }, [chartData]);

  const prices = chartData.map(d => d.price).filter((v): v is number => v != null && v > 0);
  const pMin   = prices.length ? Math.max(1, Math.min(...prices) * 0.85) : 1;
  const pMax   = prices.length ? Math.max(...prices) * 1.15 : 200_000;

  if (!displayed.length) return null;

  return (
    <div>
      {/* Range selector */}
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
          <button onClick={reset} className="px-3 py-1 rounded text-xs font-mono border transition-all"
            style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}>
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
          position: 'relative', width: '100%', height: 460,
          cursor: isSelecting ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
        onMouseLeave={cancel}
      >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 68, bottom: 0, left: 4 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.45} />

          {/* Price axis (left, log scale) */}
          <YAxis
            yAxisId="price"
            scale="log"
            domain={[pMin, pMax]}
            tickFormatter={fmtP}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={68}
            allowDataOverflow
          />

          {/* Ribbon ratio axis (right, linear 0–2.5) */}
          <YAxis
            yAxisId="ribbon"
            orientation="right"
            domain={[0, 2.5]}
            tickFormatter={v => `${v.toFixed(1)}×`}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={48}
            ticks={[0, 0.5, 1.0, 1.5, 2.0, 2.5]}
          />

          <XAxis
            dataKey="date"
            tickFormatter={fmtXTick}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={80}
          />

          <Tooltip
            content={<ChartTip />}
            cursor={isSelecting ? false : { stroke: '#1E293B', strokeWidth: 1 }}
          />

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

          {/* Capitulation zone shading (ratio < 1.0) */}
          {capitZones.map((z, i) => (
            <ReferenceArea
              key={i}
              x1={z.x1} x2={z.x2}
              yAxisId="price"
              fill="rgba(255,92,92,0.07)"
              strokeOpacity={0}
            />
          ))}

          {/* Threshold line at ratio = 1.0 */}
          <ReferenceLine
            y={1.0}
            yAxisId="ribbon"
            stroke="#6B7280"
            strokeDasharray="3 4"
            strokeWidth={1}
          />

          {/* BTC Price */}
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="BTC Price"
            stroke="rgba(247,249,252,0.75)"
            strokeWidth={1.5}
            fill="rgba(247,249,252,0.03)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Ribbon ratio line (30d MA / 60d MA) */}
          <Line
            yAxisId="ribbon"
            type="monotone"
            dataKey="ratio"
            name="Ribbon Ratio"
            stroke="#A78BFA"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
      </div>
    </div>
  );
}
