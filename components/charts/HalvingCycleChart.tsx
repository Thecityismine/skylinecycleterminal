"use client";

import {
  ComposedChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import { HALVINGS, PHASES } from '@/lib/indicators/halvingCycles';
import type { ZoneSegment } from '@/lib/indicators/halvingCycles';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type PricePoint = { time: string; ts: number; price: number };

type Props = {
  points:   PricePoint[];
  segments: ZoneSegment[];
  logScale: boolean;
  startTs:  number;
};

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const YEAR_TICKS = Array.from({ length: 18 }, (_, i) =>
  new Date(`${2012 + i}-01-01T00:00:00Z`).getTime(),
);

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PricePoint;
  if (!d) return null;

  // Find which halving zones apply to this date
  const zones = PHASES.filter((phase) => {
    return HALVINGS.some((h) => {
      const start = h.ts + phase.weeksFrom * 7 * 24 * 3600_000;
      const end   = h.ts + phase.weeksTo   * 7 * 24 * 3600_000;
      return d.ts >= start && d.ts < end;
    });
  });

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[190px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-1.5 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-sm font-mono font-semibold mb-2" style={{ color: 'var(--sct-text)' }}>
        {fmtPrice(d.price)}
      </p>
      {zones.length > 0 && (
        <div className="space-y-0.5 border-t pt-1.5" style={{ borderColor: 'var(--sct-border)' }}>
          {zones.map((z) => (
            <p key={z.key} className="text-[10px] font-medium" style={{ color: z.color }}>{z.shortLabel}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function HalvingCycleChart({ points, segments, logScale, startTs }: Props) {
  if (!points.length) return null;

  const visible = points.filter((p) => p.ts >= startTs);
  const visSegs = segments
    .filter((s) => s.x2 >= startTs)
    .map((s) => ({ ...s, x1: Math.max(s.x1, startTs) }));

  const yDomain: [number | string, number | string] = ['auto', 'auto'];

  const now = Date.now();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={visible} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

        {/* Phase zone fills */}
        {visSegs.map((seg, i) => (
          <ReferenceArea
            key={i}
            x1={seg.x1}
            x2={seg.x2}
            fill={seg.phase.fill}
            stroke="none"
          />
        ))}

        {/* Halving vertical lines */}
        {HALVINGS.map((h) => (
          h.ts >= startTs && (
            <ReferenceLine
              key={h.label}
              x={h.ts}
              stroke={h.estimated ? 'rgba(255,255,255,0.25)' : 'rgba(255,200,50,0.60)'}
              strokeDasharray={h.estimated ? '6 4' : '4 3'}
              strokeWidth={1.5}
              label={{
                value: h.label,
                position: 'insideTopRight',
                fontSize: 10,
                fill: h.estimated ? 'rgba(255,255,255,0.4)' : 'rgba(255,200,50,0.8)',
                fontWeight: 600,
              }}
            />
          )
        ))}

        {/* "Now" line */}
        {now >= startTs && (
          <ReferenceLine
            x={now}
            stroke="rgba(247,249,252,0.45)"
            strokeDasharray="2 4"
            label={{ value: 'Now', position: 'insideTopRight', fontSize: 10, fill: 'rgba(247,249,252,0.5)' }}
          />
        )}

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
          width={64}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area
          type="monotone"
          dataKey="price"
          stroke="rgba(247,249,252,0.85)"
          strokeWidth={1.5}
          fill="rgba(247,249,252,0.04)"
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
