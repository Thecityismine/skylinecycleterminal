"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  HALVINGS,
  CYCLE_FILL,
  CYCLE_STROKE,
} from "@/lib/indicators/cycleHelpers";
import type { CyclePoint } from "@/lib/indicators/cycleHelpers";
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = { data: CyclePoint[] };

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function formatPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function formatTooltipPrice(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

const YEAR_TICKS = Array.from({ length: 17 }, (_, i) =>
  new Date(`${2012 + i}-01-01`).getTime()
);

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CyclePoint;
  const cycleColors: Record<number, string> = {
    1: '#3B82F6', 2: '#7C8CFF', 3: '#35D07F', 4: '#F7931A', 5: '#FF5C5C',
  };
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-1.5 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-base font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
        {formatTooltipPrice(d.price)}
      </p>
      <p className="text-xs mt-1 font-mono" style={{ color: cycleColors[d.cycle] ?? 'var(--sct-muted)' }}>
        Cycle {d.cycle}
      </p>
    </div>
  );
}

export function FourYearCycleChart({ data }: Props) {
  const halvingTs = HALVINGS.map((h) => ({
    ...h,
    ts: new Date(h.date).getTime(),
  }));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

        {/* Pre-cycle zone (before first halving) */}
        <ReferenceArea
          x1={data[0]?.ts}
          x2={halvingTs[0].ts}
          fill={CYCLE_FILL[0]}
          strokeOpacity={0}
        />

        {/* Cycle zones between halvings */}
        {halvingTs.slice(0, -1).map((h, i) => (
          <ReferenceArea
            key={h.date}
            x1={h.ts}
            x2={halvingTs[i + 1].ts}
            fill={CYCLE_FILL[h.cycle]}
            strokeOpacity={0}
          />
        ))}

        {/* Current cycle zone (last halving to now) */}
        <ReferenceArea
          x1={halvingTs[halvingTs.length - 1].ts}
          fill={CYCLE_FILL[halvingTs[halvingTs.length - 1].cycle]}
          strokeOpacity={0}
        />

        {/* Halving vertical lines (skip estimated future) */}
        {halvingTs.slice(0, -1).map((h) => (
          <ReferenceLine
            key={h.date}
            x={h.ts}
            stroke={CYCLE_STROKE[h.cycle]}
            strokeWidth={1}
            strokeDasharray="4 3"
            label={{
              value: h.label,
              position: 'top',
              fill: CYCLE_STROKE[h.cycle],
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
          tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />

        <YAxis
          scale="log"
          domain={[1, 'auto']}
          ticks={LOG_TICKS}
          tickFormatter={formatPrice}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={64}
        />

        <Tooltip content={<CustomTooltip />} />

        <Line
          type="monotone"
          dataKey="price"
          stroke="rgba(247,249,252,0.9)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
