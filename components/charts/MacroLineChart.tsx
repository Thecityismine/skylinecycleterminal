"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

export type MacroDataPoint = { date: string; value: number };

export type RefLine = {
  value:     number;
  color:     string;
  label?:    string;
  dashed?:   boolean;
};

type Props = {
  id:             string;
  data:           MacroDataPoint[];
  color?:         string;
  unit?:          string;
  decimals?:      number;
  height?:        number;
  referenceLines?: RefLine[];
};

function shortDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function longDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function MacroLineChart({
  id,
  data,
  color = '#35D07F',
  unit = '',
  decimals = 2,
  height = 200,
  referenceLines = [],
}: Props) {
  if (!data || data.length === 0) {
    return (
      <div
        className="rounded-lg animate-pulse"
        style={{ height, backgroundColor: 'var(--sct-border)' }}
      />
    );
  }

  const gradId = `mg-${id}`;
  const fmt = (v: number) => `${v.toFixed(decimals)}${unit}`;

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ fill: '#4B5563', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          minTickGap={60}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#4B5563', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmt}
          width={50}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: '#0C1117',
            border: '1px solid #1E293B',
            borderRadius: '6px',
            padding: '6px 10px',
          }}
          labelStyle={{ color: '#64748B', fontSize: '11px', marginBottom: '2px' }}
          itemStyle={{ color, fontSize: '13px' }}
          formatter={(v) => [fmt(Number(v)), '']}
          labelFormatter={(d) => longDate(String(d))}
          cursor={{ stroke: '#1E293B', strokeWidth: 1 }}
        />

        {referenceLines.map((rl) => (
          <ReferenceLine
            key={`${id}-rl-${rl.value}`}
            y={rl.value}
            stroke={rl.color}
            strokeDasharray={rl.dashed !== false ? '4 3' : undefined}
            strokeOpacity={0.7}
            label={rl.label ? {
              value: rl.label, position: 'insideTopRight',
              fill: rl.color, fontSize: 9, opacity: 0.8,
            } : undefined}
          />
        ))}

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
