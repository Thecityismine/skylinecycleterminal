"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea,
} from 'recharts';
import type { WeeklyPoint, ZoneSegment, Zone } from '@/lib/api/weeklySMA';
import { ZONE_FILL, ZONE_COLOR, ZONE_LABEL } from '@/lib/api/weeklySMA';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = {
  points:   WeeklyPoint[];
  segments: ZoneSegment[];
  logScale: boolean;
  asset:    'btc' | 'eth';
};

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as WeeklyPoint;
  if (!d) return null;
  const zone = d.zone as Zone;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[200px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(247,249,252,0.85)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(247,249,252,0.85)' }} />
            Price
          </span>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
            {fmtPrice(d.price)}
          </span>
        </div>
        {d.ma50w != null && (
          <div className="flex justify-between gap-6">
            <span className="text-xs flex items-center gap-1.5" style={{ color: '#D4A853' }}>
              <span className="w-2 h-2 rounded-full bg-[#D4A853]" />
              50W SMA
            </span>
            <span className="text-xs font-mono" style={{ color: '#D4A853' }}>
              {fmtPrice(d.ma50w)}
            </span>
          </div>
        )}
        {d.ma200w != null && (
          <div className="flex justify-between gap-6">
            <span className="text-xs flex items-center gap-1.5" style={{ color: '#5B7DD8' }}>
              <span className="w-2 h-2 rounded-full bg-[#5B7DD8]" />
              200W SMA
            </span>
            <span className="text-xs font-mono" style={{ color: '#5B7DD8' }}>
              {fmtPrice(d.ma200w)}
            </span>
          </div>
        )}
        {zone !== 'none' && (
          <div
            className="flex justify-between gap-6 pt-1.5 border-t"
            style={{ borderColor: 'var(--sct-border)' }}
          >
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Zone</span>
            <span className="text-xs font-semibold" style={{ color: ZONE_COLOR[zone] }}>
              {ZONE_LABEL[zone]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const YEAR_TICKS = Array.from({ length: 16 }, (_, i) =>
  new Date(`${2011 + i}-01-01T00:00:00Z`).getTime(),
);

export function WeeklySMAChart({ points, segments, logScale }: Props) {
  if (!points.length) return null;

  const yDomain: [number | string, number | string] = logScale
    ? ['auto', 'auto']
    : ['auto', 'auto'];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={points} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

        {/* Zone background fills */}
        {segments.map((seg, i) => (
          <ReferenceArea
            key={i}
            x1={seg.x1}
            x2={seg.x2}
            fill={ZONE_FILL[seg.zone]}
            stroke="none"
          />
        ))}

        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={YEAR_TICKS}
          tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />
        <YAxis
          scale={logScale ? 'log' : 'linear'}
          domain={yDomain}
          allowDataOverflow
          tickFormatter={fmtPrice}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={60}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Price area — subtle fill */}
        <Area
          type="monotone"
          dataKey="price"
          stroke="rgba(247,249,252,0.85)"
          strokeWidth={1.5}
          fill="rgba(247,249,252,0.03)"
          dot={false}
          isAnimationActive={false}
          connectNulls
        />

        {/* 200W SMA — blue "cheap line" */}
        <Line
          type="monotone"
          dataKey="ma200w"
          stroke="#5B7DD8"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />

        {/* 50W SMA — gold "bull/bear line" */}
        <Line
          type="monotone"
          dataKey="ma50w"
          stroke="#D4A853"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
