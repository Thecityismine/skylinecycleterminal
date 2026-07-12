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
  ReferenceLine,
  ReferenceArea,
  useXAxisScale,
  useYAxisScale,
  usePlotArea,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { CrossEvent, CrossRegime } from '@/lib/indicators/goldenDeathCross';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type ChartPoint = { time: string; ts: number; price: number; ma50: number | null; ma200: number | null };

type Props = {
  data:         ChartPoint[];
  crossEvents:  CrossEvent[];
  logScale:     boolean;
  startTs:      number;
  showHalvings: boolean;
  regime?:      CrossRegime;
  chartId?:     string;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

// BTC price = off-white hero; MAs = colored structure; crosses = neon events
const PRICE = '#F5F7FA';
const GOLD  = '#EAB84D';
const BLUE  = '#5B84FF';
const GREEN = '#35D07F';
const RED   = '#F85149';

const HALVINGS = [
  { ts: new Date('2012-11-28T00:00:00Z').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09T00:00:00Z').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11T00:00:00Z').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19T00:00:00Z').getTime(), label: 'H4' },
];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const YEAR_TICKS = Array.from({ length: 20 }, (_, i) =>
  new Date(`${2011 + i}-01-01T00:00:00Z`).getTime()
);

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  if (!d) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2.5 shadow-xl space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 180 }}
    >
      <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-sm font-mono font-bold" style={{ color: PRICE }}>{fmtPrice(d.price)}</p>
      {d.ma50  && <p className="text-xs font-mono" style={{ color: GOLD  }}>50D MA:  {fmtPrice(d.ma50)}</p>}
      {d.ma200 && <p className="text-xs font-mono" style={{ color: BLUE  }}>200D MA: {fmtPrice(d.ma200)}</p>}
    </div>
  );
}

// Dots are placed at the actual MA crossover point: (ma50 + ma200) / 2
// A vertical guide line drops from the dot to the x-axis for timeline alignment
//
// Uses Recharts v3's useXAxisScale/useYAxisScale/usePlotArea hooks. The old
// <Customized xAxisMap/yAxisMap> prop-injection API is a Recharts 2.x-only
// pattern — in v3 it's a deprecated no-op stub that injects nothing, so this
// layer must be rendered as a direct chart child (not wrapped in <Customized>).
function CrossDotsLayer({ crossEvents, startTs, chartId }: { crossEvents: CrossEvent[]; startTs: number; chartId?: string }) {
  const xScale   = useXAxisScale();
  const yScale   = useYAxisScale();
  const plotArea = usePlotArea();
  if (!xScale || !yScale || !plotArea) return null;

  const gId = `gdc-glow-g-${chartId ?? 'main'}`;
  const rId = `gdc-glow-r-${chartId ?? 'main'}`;

  // Bottom of the chart area (where x-axis sits)
  const chartBottom = plotArea.y + plotArea.height;

  const elements: React.ReactElement[] = [];

  for (const ev of crossEvents) {
    if (ev.ts < startTs) continue;
    const cx = xScale(ev.ts);
    // Place dot at the MA intersection midpoint, not at BTC price
    const crossY = (ev.ma50 + ev.ma200) / 2;
    const cy = yScale(crossY);
    if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) continue;

    const isGolden = ev.type === 'golden';
    const color    = isGolden ? GREEN : RED;
    const fId      = isGolden ? gId   : rId;

    elements.push(
      <g key={`${ev.type}-${ev.ts}`}>
        {/* Vertical guide line from crossover point to x-axis */}
        <line
          x1={cx} y1={cy}
          x2={cx} y2={chartBottom}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.3}
        />
        {/* 3-layer neon glow dot */}
        <circle cx={cx} cy={cy} r={18} fill={color} opacity={0.08} />
        <circle cx={cx} cy={cy} r={11} fill={color} opacity={0.18} />
        <circle cx={cx} cy={cy} r={5}  fill={color} opacity={1}    filter={`url(#${fId})`} />
      </g>
    );
  }

  return (
    <g>
      <defs>
        <filter id={gId} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={rId} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {elements}
    </g>
  );
}

function regimeTint(regime?: CrossRegime): string {
  if (!regime) return 'transparent';
  if (regime.startsWith('golden')) return 'rgba(53,208,127,0.025)';
  if (regime.startsWith('death'))  return 'rgba(248,81,73,0.025)';
  return 'transparent';
}

export function BTCGoldenDeathCrossChart({
  data, crossEvents, logScale, startTs, showHalvings, regime, chartId = 'main', onZoomChange,
}: Props) {
  const {
    domain, isSelecting, selectionArea, cancel, chartHandlers,
  } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  const chartData = useMemo(() => {
    const visible = data.filter((p) => p.ts >= startTs);
    if (!domain) return visible;
    return visible.filter(d => d.ts >= domain.start && d.ts <= domain.end);
  }, [data, startTs, domain]);

  if (!data.length) return null;

  const yearTicks = YEAR_TICKS.filter((t) => t >= startTs);

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100%',
        background: regimeTint(regime),
        cursor: isSelecting ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
      onMouseLeave={cancel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 16, bottom: 4, left: 8 }} {...chartHandlers}>
          {/* Softer grid — supporting element, not noticed */}
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

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

          {showHalvings && HALVINGS.filter((h) => h.ts >= startTs).map((h) => (
            <ReferenceLine
              key={h.label}
              x={h.ts}
              stroke="rgba(234,184,77,0.35)"
              strokeDasharray="6 6"
              strokeWidth={1}
              label={{ value: h.label, position: 'insideTopRight', fontSize: 9, fill: 'rgba(234,184,77,0.5)' }}
            />
          ))}

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
            scale={logScale ? 'log' : 'linear'}
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtPrice}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={64}
          />

          <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : undefined} />

          {/* 200D MA — structural blue, drawn first so MA50 and price sit above */}
          <Line
            type="monotone"
            dataKey="ma200"
            stroke={BLUE}
            strokeWidth={2}
            strokeOpacity={0.9}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 50D MA — gold trend line */}
          <Line
            type="monotone"
            dataKey="ma50"
            stroke={GOLD}
            strokeWidth={2}
            strokeOpacity={0.9}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* BTC price — off-white hero line, drawn last so it sits on top */}
          <Area
            type="monotone"
            dataKey="price"
            stroke={PRICE}
            strokeWidth={2.5}
            fill="rgba(245,247,250,0.03)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Neon cross markers at MA intersection point */}
          <CrossDotsLayer
            crossEvents={crossEvents}
            startTs={startTs}
            chartId={chartId}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
