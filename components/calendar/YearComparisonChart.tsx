"use client";

import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { median, MONTH_NAMES } from '@/lib/indicators/seasonality';
import type { HeatmapRow } from '@/app/api/calendar/route';

type Props = {
  rows:           HeatmapRow[]; // pre-filtered to the selected cycle-phase group
  currentYear:    number;
  showVolatility: boolean;
};

const YEAR_COLORS = ['#3B82F6', '#7C8CFF', '#E6B450', '#FF5CA8', '#45F3FF', '#8B5CF6', '#35D07F'];

function CustomTooltip({
  active,
  payload,
  label,
  showVolatility,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: string;
  showVolatility: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2.5 shadow-xl space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 160, fontFamily: 'monospace', fontSize: 11 }}
    >
      <p style={{ color: 'var(--sct-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value >= 0 ? '+' : ''}{p.value.toFixed(1)}{showVolatility ? '%' : '%'}
        </p>
      ))}
    </div>
  );
}

export function YearComparisonChart({ rows, currentYear, showVolatility }: Props) {
  const { chartData, yearMeta } = useMemo(() => {
    const yearMeta = rows.map((r, i) => ({
      year:      r.year,
      key:       `y${r.year}`,
      color:     r.year === currentYear ? '#F7931A' : YEAR_COLORS[i % YEAR_COLORS.length],
      isCurrent: r.year === currentYear,
    }));

    const chartData = MONTH_NAMES.map((monthName, i) => {
      const row: Record<string, number | string | null> = { monthName };
      const valuesThisMonth: number[] = [];
      rows.forEach((r) => {
        const v = showVolatility ? r.monthlyVolatility[i] : r.monthly[i];
        row[`y${r.year}`] = v;
        if (v !== null) valuesThisMonth.push(v);
      });
      row.median = valuesThisMonth.length > 0 ? median(valuesThisMonth) : null;
      return row;
    });

    return { chartData, yearMeta };
  }, [rows, currentYear, showVolatility]);

  if (rows.length === 0) {
    return (
      <div className="h-[360px] flex items-center justify-center rounded-lg border text-sm" style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}>
        Select a cycle-phase group above to compare years.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="monthName"
            tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v}%`}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip showVolatility={showVolatility} />} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />

          {yearMeta.map((y) => (
            <Line
              key={y.key}
              type="monotone"
              dataKey={y.key}
              name={String(y.year)}
              stroke={y.color}
              strokeWidth={y.isCurrent ? 3 : 1.75}
              strokeOpacity={y.isCurrent ? 1 : 0.8}
              dot={{ r: 2.5 }}
              isAnimationActive={false}
              connectNulls
            />
          ))}

          <Line
            type="monotone"
            dataKey="median"
            name="Group Median"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
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
