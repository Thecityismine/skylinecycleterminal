"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

export type MacroDataPoint = { date: string; value: number };

type Props = {
  id: string;        // unique string for SVG gradient ID
  data: MacroDataPoint[];
  color?: string;
  unit?: string;     // suffix for tooltip values (e.g. "%" or "")
  decimals?: number;
};

function shortDate(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function longDate(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function MacroLineChart({
  id, data, color = '#35D07F', unit = '', decimals = 2,
}: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-44 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--sct-border)' }} />
    );
  }

  const gradId = `mg-${id}`;

  const fmt = (v: number) => `${v.toFixed(decimals)}${unit}`;

  return (
    <ResponsiveContainer width="100%" height={176}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
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
          width={48}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0C1117',
            border: '1px solid #1E293B',
            borderRadius: '6px',
            padding: '6px 10px',
          }}
          labelStyle={{ color: '#64748B', fontSize: '11px', marginBottom: '2px' }}
          itemStyle={{ color, fontSize: '13px', fontFamily: 'monospace' }}
          formatter={(v) => [fmt(Number(v)), '']}
          labelFormatter={(d) => longDate(String(d))}
          cursor={{ stroke: '#1E293B', strokeWidth: 1 }}
        />
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
  );
}
