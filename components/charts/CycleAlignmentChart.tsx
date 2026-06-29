"use client";

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
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { CycleAnchor } from '@/lib/indicators/cycleAnchors';
import {
  PEAK_WINDOW_START, PEAK_WINDOW_END,
  BOTTOM_WINDOW_START, BOTTOM_WINDOW_END,
  MODEL_LOW_TO_HIGH, MODEL_HIGH_TO_LOW,
} from '@/lib/indicators/cycleAnchors';

type PricePoint = { time: string; ts: number; price: number };

type AlignedPoint = {
  day:       number;
  cycle2015?: number;
  cycle2018?: number;
  cycle2022?: number;
  median?:    number;
};

type Props = {
  prices:  PricePoint[];
  anchors: CycleAnchor[];
};

function buildAlignedData(prices: PricePoint[], anchors: CycleAnchor[]): AlignedPoint[] {
  const priceMap = new Map<string, number>(prices.map((p) => [p.time, p.price]));
  const MAX_DAYS = 1600;
  const today    = new Date().toISOString().slice(0, 10);

  const paths: Record<string, Map<number, number>> = {};

  for (const anchor of anchors) {
    const path    = new Map<number, number>();
    const endDate = anchor.nextLowDate ?? today;

    for (let day = 0; day <= MAX_DAYS; day++) {
      const ms   = new Date(anchor.lowDate + 'T00:00:00Z').getTime() + day * 86_400_000;
      const date = new Date(ms).toISOString().slice(0, 10);
      if (date > endDate) break;
      const price = priceMap.get(date);
      if (price != null) {
        path.set(day, (price / anchor.lowPrice) * 100);
      }
    }
    paths[anchor.cycleId] = path;
  }

  const allDays = new Set<number>();
  for (const path of Object.values(paths)) {
    for (const day of path.keys()) allDays.add(day);
  }

  return Array.from(allDays)
    .sort((a, b) => a - b)
    .map((day) => {
      const cycle2015 = paths['cycle2015']?.get(day);
      const cycle2018 = paths['cycle2018']?.get(day);
      const cycle2022 = paths['cycle2022']?.get(day);
      const completed = [cycle2015, cycle2018].filter((v): v is number => v != null);
      const median = completed.length > 0
        ? completed.reduce((a, b) => a + b, 0) / completed.length
        : undefined;
      return { day, cycle2015, cycle2018, cycle2022, median };
    });
}

function fmtReturn(v: number): string {
  if (v >= 10_000) return `${(v / 100).toFixed(0)}x`;
  if (v >= 1_000)  return `${(v / 100).toFixed(1)}x`;
  return `${(v / 100).toFixed(2)}x`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2.5 shadow-xl space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 160 }}
    >
      <p className="text-xs font-mono mb-1" style={{ color: 'var(--sct-muted)' }}>
        Day {label} from cycle low
      </p>
      {payload.map((entry: any) => {
        const labelMap: Record<string, string> = {
          cycle2015: '2015 Cycle',
          cycle2018: '2018 Cycle',
          cycle2022: '2022 Cycle',
          median:    'Hist. Median',
        };
        if (entry.value == null) return null;
        return (
          <div key={entry.dataKey} className="flex justify-between gap-4 text-xs font-mono">
            <span style={{ color: entry.color }}>{labelMap[entry.dataKey] ?? entry.dataKey}</span>
            <span style={{ color: 'var(--sct-text)' }}>{fmtReturn(entry.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CycleAlignmentChart({ prices, anchors }: Props) {
  const aligned = buildAlignedData(prices, anchors);
  if (!aligned.length) return null;

  const dayTicks = [0, 200, 400, 600, 800, 1000, 1064, 1200, 1350, 1428, 1600];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={aligned} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Peak window band */}
          <ReferenceArea
            x1={PEAK_WINDOW_START}
            x2={PEAK_WINDOW_END}
            fill="rgba(234,184,77,0.10)"
            stroke="rgba(234,184,77,0.30)"
            strokeWidth={0.8}
          />
          {/* Bottom window band */}
          <ReferenceArea
            x1={BOTTOM_WINDOW_START}
            x2={BOTTOM_WINDOW_END}
            fill="rgba(91,132,255,0.10)"
            stroke="rgba(91,132,255,0.30)"
            strokeWidth={0.8}
          />

          {/* Model peak line */}
          <ReferenceLine
            x={MODEL_LOW_TO_HIGH}
            stroke="rgba(234,184,77,0.5)"
            strokeDasharray="5 4"
            strokeWidth={1}
            label={{ value: `${MODEL_LOW_TO_HIGH}d`, position: 'insideTopRight', fontSize: 9, fill: 'rgba(234,184,77,0.65)' }}
          />
          {/* Model bottom line */}
          <ReferenceLine
            x={MODEL_LOW_TO_HIGH + MODEL_HIGH_TO_LOW}
            stroke="rgba(91,132,255,0.5)"
            strokeDasharray="5 4"
            strokeWidth={1}
            label={{ value: `${MODEL_LOW_TO_HIGH + MODEL_HIGH_TO_LOW}d`, position: 'insideTopRight', fontSize: 9, fill: 'rgba(91,132,255,0.65)' }}
          />

          <XAxis
            dataKey="day"
            type="number"
            domain={[0, 1600]}
            ticks={dayTicks}
            tickFormatter={(d) => `${d}`}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            label={{ value: 'Days from cycle low', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: 'var(--sct-muted)' }}
          />
          <YAxis
            scale="log"
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtReturn}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={56}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--sct-border)', strokeWidth: 1 }} />

          {/* Historical cycles — muted */}
          <Line
            dataKey="cycle2015"
            stroke="rgba(139,148,158,0.50)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            dataKey="cycle2018"
            stroke="rgba(169,180,192,0.60)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Historical median */}
          <Line
            dataKey="median"
            stroke="#E6B450"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Current cycle — bright */}
          <Line
            dataKey="cycle2022"
            stroke="#F5F7FA"
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
