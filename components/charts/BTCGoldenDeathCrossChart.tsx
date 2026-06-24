"use client";

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
  Customized,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { CrossEvent } from '@/lib/indicators/goldenDeathCross';

type ChartPoint = { time: string; ts: number; price: number; ma50: number | null; ma200: number | null };

type Props = {
  data:         ChartPoint[];
  crossEvents:  CrossEvent[];
  logScale:     boolean;
  startTs:      number;
  showHalvings: boolean;
  chartId?:     string;
};

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
      <p className="text-sm font-mono font-bold" style={{ color: '#F7931A' }}>{fmtPrice(d.price)}</p>
      {d.ma50  && <p className="text-xs font-mono" style={{ color: GOLD  }}>50D MA:  {fmtPrice(d.ma50)}</p>}
      {d.ma200 && <p className="text-xs font-mono" style={{ color: BLUE  }}>200D MA: {fmtPrice(d.ma200)}</p>}
    </div>
  );
}

function CrossDotsLayer({ xAxisMap, yAxisMap, crossEvents, startTs, chartId }: any) {
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
  const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const gId = `glow-cross-${chartId ?? 'main'}`;
  const rId = `glow-death-${chartId ?? 'main'}`;

  const dots: React.ReactElement[] = [];

  for (const ev of crossEvents as CrossEvent[]) {
    if (ev.ts < (startTs as number)) continue;
    const cx = xAxis.scale(ev.ts);
    const cy = yAxis.scale(ev.price);
    if (!isFinite(cx) || !isFinite(cy)) continue;

    const color = ev.type === 'golden' ? GREEN : RED;
    const fId   = ev.type === 'golden' ? gId   : rId;

    dots.push(
      <g key={`${ev.type}-${ev.ts}`}>
        <circle cx={cx} cy={cy} r={22} fill={color} opacity={0.05} />
        <circle cx={cx} cy={cy} r={13} fill={color} opacity={0.14} />
        <circle cx={cx} cy={cy} r={6}  fill={color} opacity={0.95} filter={`url(#${fId})`} />
      </g>
    );
  }

  return (
    <g>
      <defs>
        <filter id={gId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={rId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {dots}
    </g>
  );
}

export function BTCGoldenDeathCrossChart({
  data, crossEvents, logScale, startTs, showHalvings, chartId = 'main',
}: Props) {
  if (!data.length) return null;

  const visible   = data.filter((p) => p.ts >= startTs);
  const yearTicks = YEAR_TICKS.filter((t) => t >= startTs);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={visible} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {showHalvings && HALVINGS.filter((h) => h.ts >= startTs).map((h) => (
            <ReferenceLine
              key={h.label}
              x={h.ts}
              stroke="rgba(255,200,50,0.40)"
              strokeDasharray="4 3"
              strokeWidth={1}
              label={{ value: h.label, position: 'insideTopRight', fontSize: 9, fill: 'rgba(255,200,50,0.6)' }}
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

          <Tooltip content={<CustomTooltip />} />

          {/* BTC price */}
          <Area
            type="monotone"
            dataKey="price"
            stroke="#F7931A"
            strokeWidth={1.5}
            fill="rgba(247,147,26,0.05)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 200D MA — blue, draw behind 50D */}
          <Line
            type="monotone"
            dataKey="ma200"
            stroke={BLUE}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 50D MA — gold */}
          <Line
            type="monotone"
            dataKey="ma50"
            stroke={GOLD}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Neon cross markers */}
          <Customized
            component={(props: any) => (
              <CrossDotsLayer {...props} crossEvents={crossEvents} startTs={startTs} chartId={chartId} />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
