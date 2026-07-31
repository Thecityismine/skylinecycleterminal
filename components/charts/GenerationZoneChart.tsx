"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea,
} from 'recharts';
import type { WeeklyPoint, ZoneEpisode } from '@/lib/indicators/generationZone';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = { weekly: WeeklyPoint[]; episodes: ZoneEpisode[] };

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

const usd = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

// Ticks derived from the series rather than hardcoded, for the reason recorded
// in lib/indicators/historicalScore.ts: a tick outside the domain silently
// shifts every label by a year.
function yearTicks(points: WeeklyPoint[]): number[] {
  if (!points.length) return [];
  const first = new Date(points[0].ts);
  const last = new Date(points[points.length - 1].ts);
  const start = first.getUTCMonth() === 0 && first.getUTCDate() === 1
    ? first.getUTCFullYear()
    : first.getUTCFullYear() + 1;
  const out: number[] = [];
  for (let y = start; y <= last.getUTCFullYear(); y++) out.push(Date.UTC(y, 0, 1));
  return out;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WeeklyPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows: Array<[string, string, string]> = [
    ['Weekly close', usd(d.close), 'rgba(247,249,252,0.92)'],
    ['200 EMA', d.ema200 == null ? 'n/a' : usd(d.ema200), '#3B82F6'],
    ['230 SMMA', d.smma230 == null ? 'n/a' : usd(d.smma230), '#FF5C5C'],
  ];
  return (
    <div className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[210px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      {rows.map(([label, value, color]) => (
        <div key={label} className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>{label}</span>
          <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export function GenerationZoneChart({ weekly, episodes }: Props) {
  if (!weekly.length) return null;

  const closes = weekly.map((w) => w.close).filter((v) => v > 0);
  const pMin = Math.max(0.01, Math.min(...closes) * 0.7);
  const pMax = Math.max(...closes) * 1.6;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={weekly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Every touch episode, shaded. Derived from the data, so a new one
              appears on its own rather than waiting to be added by hand. */}
          {episodes.map((ep) => (
            <ReferenceArea
              key={ep.start}
              x1={new Date(ep.start + 'T00:00:00Z').getTime()}
              x2={new Date(ep.end + 'T00:00:00Z').getTime()}
              fill={ep.reachedSmma ? 'rgba(53,208,127,0.22)' : 'rgba(53,208,127,0.12)'}
              stroke="none"
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks(weekly)}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />
          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={LOG_TICKS.filter((t) => t >= pMin && t <= pMax)}
            tickFormatter={fmtPrice}
            tick={{ fill: 'var(--sct-muted)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={54}
            allowDataOverflow
          />

          <Tooltip content={<CustomTooltip />} />

          <Line type="monotone" dataKey="smma230" stroke="#FF5C5C" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="ema200" stroke="#3B82F6" strokeWidth={1.6} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="close" stroke="rgba(247,249,252,0.92)" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
