"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
  useXAxisScale, useYAxisScale,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';
import type { NormMode, MedianPoint } from '@/lib/indicators/halvingCycleAlign';

export type CycleMeta = {
  id: string;
  label: string;
  color: string;
  strokeWidth: number;
  isActive: boolean;
};

export type ChartRow = Record<string, number>;

const PHASES = [
  { x1: 0,    x2: 180,  label: 'Post-Halving Consolidation', fill: 'rgba(59,130,246,0.04)' },
  { x1: 180,  x2: 500,  label: 'Expansion Window',           fill: 'rgba(53,208,127,0.04)' },
  { x1: 500,  x2: 750,  label: 'Distribution Watch',         fill: 'rgba(230,180,80,0.04)' },
  { x1: 750,  x2: 1050, label: 'Drawdown / Reset',           fill: 'rgba(248,81,73,0.04)' },
  { x1: 1050, x2: 1400, label: 'Pre-Halving Accumulation',   fill: 'rgba(59,130,246,0.04)' },
];

function fmtYAxis(mode: NormMode, v: number): string {
  if (mode === 'indexed') return `${v.toFixed(0)}`;
  if (mode === 'returnPct') return `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`;
  // rewardAdj / raw
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function CustomTooltip({
  active,
  payload,
  label,
  mode,
  cycles,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
  mode: NormMode;
  cycles: CycleMeta[];
}) {
  if (!active || !payload?.length || label == null) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 shadow-xl space-y-1"
      style={{
        backgroundColor: 'var(--sct-card)',
        borderColor: 'var(--sct-border)',
        minWidth: 180,
        fontFamily: 'monospace',
        fontSize: 11,
      }}
    >
      <p style={{ color: 'var(--sct-muted)', marginBottom: 4 }}>Day {label}</p>
      {payload.map((p) => {
        if (!p.dataKey.startsWith('c')) return null;
        const cycleId = p.dataKey.slice(1); // e.g. 'c2024' -> '2024'
        const meta = cycles.find(c => c.id === cycleId);
        if (!meta) return null;
        return (
          <p key={p.dataKey} style={{ color: meta.color }}>
            {meta.label}: {fmtYAxis(mode, p.value)}
          </p>
        );
      })}
    </div>
  );
}

// Uses Recharts v3's useXAxisScale/useYAxisScale hooks — the old
// <Customized xAxisMap/yAxisMap> prop-injection API is a v2-only pattern that's
// a deprecated no-op stub in v3, so this must render as a direct chart child.
// Unlike the v2 xAxisMap/yAxisMap scales (relative to the plot area, requiring
// manual + offset.left/offset.top), these hook-based scales already return
// absolute SVG pixel coordinates.
function PercentileBand({ data }: { data: MedianPoint[] }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale || data.length < 2) return null;

  // Build path: p75 left→right, then p25 right→left
  const topPts = data.map(pt => ({ x: xScale(pt.day), y: yScale(pt.p75) }))
    .filter((p): p is { x: number; y: number } => p.x != null && p.y != null);
  const botPts = [...data].reverse().map(pt => ({ x: xScale(pt.day), y: yScale(pt.p25) }))
    .filter((p): p is { x: number; y: number } => p.x != null && p.y != null);
  if (topPts.length < 2 || botPts.length < 2) return null;

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const d = `${toPath(topPts)} ${toPath(botPts)} Z`;

  return (
    <path
      d={d}
      fill="rgba(139,148,158,0.12)"
      stroke="none"
      style={{ pointerEvents: 'none' }}
    />
  );
}

type Props = {
  chartData: ChartRow[];
  medianPath: MedianPoint[];
  cycles: CycleMeta[];
  mode: NormMode;
  logScale: boolean;
  showPhases: boolean;
  showMedian: boolean;
  currentDaysSince: number;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

export function HalvingCycleComparisonChart({
  chartData,
  medianPath,
  cycles,
  mode,
  logScale,
  showPhases,
  showMedian,
  currentDaysSince,
  onZoomChange,
}: Props) {
  const {
    domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers,
  } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  // Filter chart data by zoom domain
  const displayedData = useMemo(() => {
    if (!domain) return chartData;
    return chartData.filter(r => r.day >= domain.start && r.day <= domain.end);
  }, [chartData, domain]);

  // Filter median path by zoom domain
  const displayedMedian = useMemo(() => {
    if (!domain) return medianPath;
    return medianPath.filter(m => m.day >= domain.start && m.day <= domain.end);
  }, [medianPath, domain]);

  const [tooltipMode] = useState<NormMode>(mode);

  const yAxisScale = logScale && mode !== 'returnPct' ? 'log' : 'linear';
  const yDomainMin = mode === 'indexed' && logScale ? 50 : 'auto';

  // Historical cycles first, active cycle last (on top)
  const historicalCycles = cycles.filter(c => !c.isActive);
  const activeCycles = cycles.filter(c => c.isActive);

  return (
    <div>
      {/* Controls row */}
      <div className="flex items-center gap-2 mb-4">
        {isZoomed && (
          <button
            onClick={reset}
            className="px-3 py-1 rounded text-xs font-mono border transition-all"
            style={{
              backgroundColor: 'rgba(247,147,26,0.12)',
              borderColor:     '#F7931A',
              color:           '#F7931A',
            }}
          >
            Reset Zoom
          </button>
        )}
        {!isZoomed && (
          <span
            className="hidden md:inline text-[10px] font-mono ml-1"
            style={{ color: 'var(--sct-muted)', opacity: 0.5 }}
          >
            drag to zoom
          </span>
        )}
      </div>

      <div
        style={{
          position:   'relative',
          width:      '100%',
          height:     480,
          cursor:     isSelecting ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
        onMouseLeave={cancel}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={displayedData}
            margin={{ top: 8, right: 16, bottom: 0, left: 4 }}
            {...chartHandlers}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

            <XAxis
              dataKey="day"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v: number) => `Day ${v}`}
              tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              minTickGap={80}
            />

            <YAxis
              scale={yAxisScale}
              domain={[yDomainMin, 'auto']}
              allowDataOverflow
              tickFormatter={(v: number) => fmtYAxis(mode, v)}
              tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
              axisLine={{ stroke: 'var(--sct-border)' }}
              tickLine={false}
              width={64}
            />

            <Tooltip
              content={
                <CustomTooltip mode={tooltipMode} cycles={cycles} />
              }
              cursor={isSelecting ? false : { stroke: 'var(--sct-border)', strokeWidth: 1 }}
            />

            {/* Phase bands */}
            {showPhases && PHASES.map(ph => {
              const x1 = domain ? Math.max(ph.x1, domain.start) : ph.x1;
              const x2 = domain ? Math.min(ph.x2, domain.end)   : ph.x2;
              if (x1 >= x2) return null;
              return (
                <ReferenceArea
                  key={ph.label}
                  x1={x1}
                  x2={x2}
                  fill={ph.fill}
                  strokeOpacity={0}
                />
              );
            })}

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

            {/* Percentile band (p25–p75) */}
            {showMedian && mode === 'indexed' && (
              <PercentileBand data={displayedMedian} />
            )}

            {/* Historical cycle lines */}
            {historicalCycles.map(c => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={`c${c.id}`}
                name={c.label}
                stroke={c.color}
                strokeWidth={c.strokeWidth}
                strokeOpacity={0.75}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}

            {/* Median p50 dashed line */}
            {showMedian && mode === 'indexed' && (
              <Line
                type="monotone"
                dataKey="p50"
                name="Historical Median"
                stroke="rgba(139,148,158,0.7)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Active cycle lines (rendered last = on top) */}
            {activeCycles.map(c => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={`c${c.id}`}
                name={c.label}
                stroke={c.color}
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}

            {/* TODAY reference line */}
            <ReferenceLine
              x={currentDaysSince}
              stroke="#F7931A"
              strokeDasharray="4 4"
              label={{
                value: `TODAY · Day ${currentDaysSince}`,
                position: 'insideTopRight',
                fontSize: 9,
                fill: '#F7931A',
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <ChartWatermark />
      </div>
    </div>
  );
}
