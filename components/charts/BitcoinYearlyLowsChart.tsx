"use client";

import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, Scatter,
} from 'recharts';
import type { YearlyLow } from '@/lib/indicators/yearlyLows';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

// ─── Constants ────────────────────────────────────────────────────────────────

const HALVINGS = [
  { year: 2012, label: 'H1' },
  { year: 2016, label: 'H2' },
  { year: 2020, label: 'H3' },
  { year: 2024, label: 'H4' },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function dotColor(d: YearlyLow): string {
  if (d.prevYearLow == null) return '#94A3B8';
  if (d.isPartialYear) return '#A78BFA';
  if (d.lowPrice >= d.prevYearLow) return '#35D07F';
  return '#FF5C5C';
}

// ─── Custom Dot ───────────────────────────────────────────────────────────────

function CustomDot(props: {
  cx?: number; cy?: number;
  payload?: YearlyLow;
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload == null) return null;
  const fill = dotColor(payload);
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={fill} fillOpacity={0.2} stroke={fill} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={3.5} fill={fill} />
    </g>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTip({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: YearlyLow }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sign = (d.yoyChange ?? 0) >= 0 ? '+' : '';
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs font-mono space-y-1"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p className="font-semibold" style={{ color: '#F8FAFC' }}>
        {d.year}{d.isPartialYear ? ' (YTD)' : ''}
        {d.halvingYear ? ' ⬛ Halving' : ''}
      </p>
      <p style={{ color: dotColor(d) }}>Low: <b>{fmtUSD(d.lowPrice)}</b></p>
      <p style={{ color: '#4B5563' }}>Date: {d.lowDate}</p>
      {d.yoyChange != null && (
        <p style={{ color: d.yoyChange >= 0 ? '#35D07F' : '#FF5C5C' }}>
          YoY: <b>{sign}{d.yoyChange.toFixed(0)}%</b>
        </p>
      )}
      <p style={{ color: '#4B5563' }}>{d.cycleContext}</p>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function BitcoinYearlyLowsChart({ data }: { data: YearlyLow[] }) {
  // Use year as numeric x-axis
  const chartData = useMemo(
    () => data.map((d) => ({ ...d, x: d.year })),
    [data],
  );

  const prices = data.map((d) => d.lowPrice).filter((v) => v > 0);
  const pMin = prices.length ? Math.max(0.1, Math.min(...prices) * 0.5) : 0.1;
  const pMax = prices.length ? Math.max(...prices) * 3 : 1_000_000;

  const logTicksFiltered = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);
  const xMin = data.at(0)?.year ?? 2012;
  const xMax = (data.at(-1)?.year ?? 2026) + 0.5;

  return (
    <div style={{ position: 'relative', width: '100%', height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

          {/* Halving reference lines */}
          {HALVINGS.map((h) => (
            <ReferenceLine
              key={h.year}
              x={h.year}
              stroke="#4B5563"
              strokeDasharray="3 5"
              strokeWidth={1}
              label={{
                value: h.label,
                position: 'insideTopRight',
                fill: '#4B5563',
                fontSize: 9,
                fontFamily: 'monospace',
              }}
            />
          ))}

          <XAxis
            dataKey="x"
            type="number"
            domain={[xMin - 0.5, xMax]}
            tickCount={data.length}
            tickFormatter={(v: number) => String(v)}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
          />

          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicksFiltered}
            tickFormatter={fmtUSD}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={64}
            allowDataOverflow
          />

          <Tooltip content={<ChartTip />} cursor={false} />

          {/* Connecting line */}
          <Line
            dataKey="lowPrice"
            stroke="#334155"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={<CustomDot />}
            activeDot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Invisible scatter for tooltip hit area */}
          <Scatter dataKey="lowPrice" fill="transparent" />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs font-mono">
        {[
          { color: '#35D07F', label: 'Above prior year low' },
          { color: '#FF5C5C', label: 'Below prior year low' },
          { color: '#A78BFA', label: 'Current year (YTD)' },
          { color: '#94A3B8', label: 'First year (no comparison)' },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5" style={{ color: l.color }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
