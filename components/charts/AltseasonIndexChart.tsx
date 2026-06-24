"use client";

import { useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Customized,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { SignalDot } from '@/lib/indicators/altseasonIndex';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type ChartPoint = { time: string; ts: number; score: number; btcPrice: number | null };

type Props = {
  data:       ChartPoint[];
  signalDots: SignalDot[];
  startTs:    number;
  onZoomChange?: (d: ZoomDomain<number> | null) => void;
};

// Zone palette
const ZONES = [
  { y1: 0,  y2: 25,  fill: 'rgba(255,59,92,0.10)'   },
  { y1: 25, y2: 50,  fill: 'rgba(120,80,50,0.08)'    },
  { y1: 50, y2: 65,  fill: 'rgba(230,180,80,0.08)'   },
  { y1: 65, y2: 80,  fill: 'rgba(53,208,127,0.08)'   },
  { y1: 80, y2: 100, fill: 'rgba(69,243,255,0.10)'   },
] as const;

const SIGNAL_COLORS: Record<string, string> = {
  early_rotation:      '#35D07F',
  altseason_confirmed: '#45F3FF',
  altseason_fading:    '#FF5CA8',
};

const MONTH_TICKS = (() => {
  const ticks: number[] = [];
  const start = new Date(Date.now() - 365 * 86400_000);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  for (let m = 0; m < 14; m++) {
    const d = new Date(start);
    d.setUTCMonth(d.getUTCMonth() + m);
    ticks.push(d.getTime());
  }
  return ticks;
})();

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtMonth(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  if (!d) return null;

  const score = d.score;
  const zone =
    score >= 80 ? { label: 'Broad Altseason',    color: '#45F3FF' }
    : score >= 65 ? { label: 'Early Altseason',  color: '#35D07F' }
    : score >= 50 ? { label: 'Rotation Watch',   color: '#E6B450' }
    : score >= 25 ? { label: 'Bitcoin Season',   color: '#E6823A' }
    : { label: 'BTC Dominant', color: '#FF3B5C' };

  return (
    <div
      className="rounded-lg border px-3 py-2.5 shadow-xl"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 180 }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-lg font-mono font-bold" style={{ color: zone.color }}>{score}</span>
        <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>/100</span>
      </div>
      <p className="text-xs font-semibold mb-1.5" style={{ color: zone.color }}>{zone.label}</p>
      {d.btcPrice && (
        <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
          BTC {fmtPrice(d.btcPrice)}
        </p>
      )}
    </div>
  );
}

function SignalDotsLayer({ xAxisMap, yAxisMap, signalDots, startTs }: any) {
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
  const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const elements: React.ReactElement[] = [];

  for (const dot of signalDots as SignalDot[]) {
    if (dot.ts < (startTs as number)) continue;
    const cx = xAxis.scale(dot.ts);
    const cy = yAxis.scale(dot.score);
    if (!isFinite(cx) || !isFinite(cy)) continue;

    const color = SIGNAL_COLORS[dot.type] ?? '#fff';

    elements.push(
      <g key={`${dot.type}-${dot.ts}`}>
        <defs>
          <filter id={`glow-signal-${dot.ts}`} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={cx} cy={cy} r={20} fill={color} opacity={0.06} />
        <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.14} />
        <circle cx={cx} cy={cy} r={6}  fill={color} opacity={0.92} filter={`url(#glow-signal-${dot.ts})`} />
      </g>
    );
  }

  return <g>{elements}</g>;
}

export function AltseasonIndexChart({ data, signalDots, startTs, onZoomChange }: Props) {
  const {
    domain, isSelecting, selectionArea, cancel, chartHandlers,
  } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  if (!data.length) return null;

  const visible = data.filter((d) => d.ts >= startTs);

  const chartData = useMemo(() => {
    if (!domain) return visible;
    return visible.filter(d => d.ts >= domain.start && d.ts <= domain.end);
  }, [visible, domain]);

  const withPrice = chartData.filter((d) => d.btcPrice != null);
  const btcMin = withPrice.length > 0 ? Math.min(...withPrice.map((d) => d.btcPrice!)) * 0.9 : 1000;
  const btcMax = withPrice.length > 0 ? Math.max(...withPrice.map((d) => d.btcPrice!)) * 1.1 : 200000;

  const monthTicks = MONTH_TICKS.filter((t) => t >= startTs);

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
        <ComposedChart data={chartData} margin={{ top: 12, right: 64, bottom: 4, left: 8 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Drag-to-zoom selection rectangle */}
          {selectionArea && (
            <ReferenceArea
              yAxisId="score"
              x1={selectionArea.x1}
              x2={selectionArea.x2}
              fill="rgba(255,255,255,0.06)"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
          )}

          {/* Zone background bands */}
          {ZONES.map((z) => (
            <ReferenceArea
              key={`zone-${z.y1}`}
              yAxisId="score"
              y1={z.y1}
              y2={z.y2}
              fill={z.fill}
              stroke="none"
            />
          ))}

          {/* Zone threshold lines */}
          {[25, 50, 65, 80].map((v) => (
            <ReferenceLine
              key={`ref-${v}`}
              yAxisId="score"
              y={v}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value:    `${v}`,
                position: 'insideTopRight',
                fontSize: 9,
                fill:     'rgba(255,255,255,0.3)',
              }}
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={monthTicks}
            tickFormatter={fmtMonth}
            tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />

          {/* Left axis: score 0–100 */}
          <YAxis
            yAxisId="score"
            domain={[0, 100]}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={32}
            ticks={[0, 25, 50, 65, 80, 100]}
          />

          {/* Right axis: BTC price log */}
          <YAxis
            yAxisId="btc"
            orientation="right"
            scale="log"
            domain={[btcMin, btcMax]}
            allowDataOverflow
            tickFormatter={fmtPrice}
            tick={{ fill: 'rgba(247,249,252,0.3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : undefined} />

          {/* BTC price — muted background */}
          <Line
            yAxisId="btc"
            type="monotone"
            dataKey="btcPrice"
            stroke="rgba(247,249,252,0.22)"
            strokeWidth={1.2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Altseason Index — main line */}
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="score"
            stroke="#45F3FF"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          {/* Neon signal dots */}
          <Customized
            component={(props: any) => (
              <SignalDotsLayer {...props} signalDots={signalDots} startTs={startTs} />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
