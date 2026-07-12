"use client";

import { useMemo, useEffect } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  useXAxisScale,
  useYAxisScale,
} from 'recharts';
import { HALVINGS } from '@/lib/indicators/halvingCycles';
import { ZONE_META } from '@/lib/indicators/valuationCycle';
import type { ValuationPoint } from '@/lib/indicators/valuationCycle';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  points:        ValuationPoint[];
  startTs:       number;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

const MAX_SEGMENTS = 2000;

const YEAR_TICKS = Array.from({ length: 20 }, (_, i) =>
  new Date(`${2011 + i}-01-01T00:00:00Z`).getTime()
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`;
}

export function downsampleValuationPoints(points: ValuationPoint[], max: number = MAX_SEGMENTS): ValuationPoint[] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const out = points.filter((_, i) => i % step === 0);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

// Draws the deviation line as individually colored segments (one per point pair)
// so the stroke color can vary continuously with days-until-halving. Recharts v3
// has no built-in per-point stroke, so this renders directly into pixel space via
// useXAxisScale/useYAxisScale — the <Customized xAxisMap/yAxisMap> prop-injection
// API from Recharts v2 no longer exists (it's a documented no-op stub in v3).
export function DeviationColorLine({ points }: { points: ValuationPoint[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;

  const segments: React.ReactElement[] = [];
  for (let i = 1; i < points.length; i++) {
    const a: ValuationPoint = points[i - 1];
    const b: ValuationPoint = points[i];
    if (a.deviation == null || b.deviation == null) continue;

    const x1 = xScale(a.ts);
    const y1 = yScale(a.deviation);
    const x2 = xScale(b.ts);
    const y2 = yScale(b.deviation);
    if (![x1, y1, x2, y2].every((v): v is number => typeof v === 'number' && Number.isFinite(v))) continue;

    segments.push(
      <line
        key={b.ts}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={b.color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    );
  }
  return <g>{segments}</g>;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ValuationPoint = payload[0]?.payload;
  if (!d) return null;

  const zone = d.zone ? ZONE_META[d.zone] : null;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[210px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
          <span className="text-xs font-mono font-semibold" style={{ color: '#E6EDF3' }}>{fmtPrice(d.close)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>200D MA</span>
          <span className="text-xs font-mono font-semibold" style={{ color: '#5B84FF' }}>
            {d.ma200 != null ? fmtPrice(d.ma200) : '—'}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Deviation</span>
          <span className="text-xs font-mono font-semibold" style={{ color: zone?.color ?? '#E6EDF3' }}>
            {d.deviation != null ? fmtPct(d.deviation) : '—'}
          </span>
        </div>
        <div className="flex justify-between gap-6 pt-1 mt-1 border-t" style={{ borderColor: 'var(--sct-border)' }}>
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Days to Halving</span>
          <span className="text-xs font-mono font-semibold" style={{ color: d.color }}>
            {d.daysUntilNextHalving ?? '—'}
          </span>
        </div>
        {zone && (
          <p className="text-[10px] font-medium pt-0.5" style={{ color: zone.color }}>{zone.label}</p>
        )}
      </div>
    </div>
  );
}

export function ValuationDeviationChart({ points, startTs, onZoomChange }: Props) {
  const { domain, isSelecting, selectionArea, cancel, chartHandlers } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  const chartData = useMemo(() => {
    const visible = points.filter((p) => p.ts >= startTs);
    const zoomed  = domain ? visible.filter((p) => p.ts >= domain.start && p.ts <= domain.end) : visible;
    return downsampleValuationPoints(zoomed, MAX_SEGMENTS);
  }, [points, startTs, domain]);

  if (!points.length) return null;

  const deviations = chartData.map((p) => p.deviation).filter((v): v is number => v != null);
  const yMin = Math.min(-0.5, ...deviations, 0);
  const yMax = Math.max(1.5, ...deviations);

  const now = Date.now();
  const yearTicks = YEAR_TICKS.filter((t) => t >= startTs);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', cursor: isSelecting ? 'crosshair' : 'default', userSelect: 'none' }}
      onMouseLeave={cancel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 16, bottom: 4, left: 8 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

          {/* Value zone (accumulation) */}
          <ReferenceArea y1={yMin} y2={0.05} fill="rgba(53,208,127,0.08)" stroke="none" />
          {/* Sell-risk / extreme extension zone */}
          <ReferenceArea y1={1.00} y2={yMax} fill="rgba(248,81,73,0.08)" stroke="none" />

          {selectionArea && (
            <ReferenceArea
              x1={selectionArea.x1}
              x2={selectionArea.x2}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
          )}

          {/* 200D MA / buy-zone line */}
          <ReferenceLine y={0} stroke="rgba(91,132,255,0.5)" strokeDasharray="4 3"
            label={{ value: '200D MA', position: 'insideBottomLeft', fontSize: 10, fill: 'rgba(91,132,255,0.7)' }} />
          {/* Sell-zone threshold */}
          <ReferenceLine y={1.0} stroke="rgba(248,81,73,0.45)" strokeDasharray="4 3"
            label={{ value: 'Sell Zone', position: 'insideTopLeft', fontSize: 10, fill: 'rgba(248,81,73,0.7)' }} />

          {HALVINGS.filter((h) => h.ts >= startTs).map((h) => (
            <ReferenceLine
              key={h.label}
              x={h.ts}
              stroke={h.estimated ? 'rgba(255,255,255,0.25)' : 'rgba(255,200,50,0.5)'}
              strokeDasharray={h.estimated ? '6 4' : '4 3'}
              strokeWidth={1}
              label={{ value: h.label, position: 'insideTopRight', fontSize: 9, fill: h.estimated ? 'rgba(255,255,255,0.4)' : 'rgba(255,200,50,0.7)' }}
            />
          ))}

          {now >= startTs && (
            <ReferenceLine x={now} stroke="rgba(247,249,252,0.35)" strokeDasharray="2 4"
              label={{ value: 'Now', position: 'insideTopRight', fontSize: 10, fill: 'rgba(247,249,252,0.5)' }} />
          )}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            allowDataOverflow
            tickFormatter={(v) => fmtPct(v)}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={56}
          />

          <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }} />

          <DeviationColorLine points={chartData} />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
