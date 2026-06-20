"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { HistoricalScorePoint } from '@/lib/indicators/historicalScore';
import { ZONE_CONFIG } from '@/lib/indicators/skylineScore';

type Props = { points: HistoricalScorePoint[] };

const YEAR_TICKS = Array.from({ length: 15 }, (_, i) =>
  new Date(`${2012 + i}-01-01`).getTime(),
);

// Bitcoin halving dates
const HALVINGS = [
  { ts: new Date('2012-11-28').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19').getTime(), label: 'H4' },
];

// Zone band configuration — subtle fill behind the score line
const ZONE_BANDS = [
  { y1: 0,   y2: 25,  fill: 'rgba(59,130,246,0.10)',  stroke: 'rgba(59,130,246,0.15)'  },
  { y1: 25,  y2: 50,  fill: 'rgba(53,208,127,0.10)',  stroke: 'rgba(53,208,127,0.15)'  },
  { y1: 50,  y2: 75,  fill: 'rgba(230,180,80,0.10)',  stroke: 'rgba(230,180,80,0.15)'  },
  { y1: 75,  y2: 100, fill: 'rgba(255,92,92,0.10)',   stroke: 'rgba(255,92,92,0.15)'   },
];

const ZONE_BOUNDARY_COLOR = [
  { y: 25, color: 'rgba(53,208,127,0.25)' },
  { y: 50, color: 'rgba(230,180,80,0.25)' },
  { y: 75, color: 'rgba(255,92,92,0.25)' },
];

function scoreColor(score: number): string {
  if (score < 25) return '#3B82F6';
  if (score < 50) return '#35D07F';
  if (score < 75) return '#E6B450';
  return '#FF5C5C';
}

function zoneLabel(score: number): string {
  if (score < 25) return 'Accumulate';
  if (score < 50) return 'Hold / Build';
  if (score < 75) return 'Caution';
  return 'Distribution';
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as HistoricalScorePoint;
  if (!d) return null;
  const color = scoreColor(d.score);
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[180px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Cycle Score</span>
          <span className="text-base font-mono font-bold" style={{ color }}>{d.score}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Signal</span>
          <span className="text-xs font-medium" style={{ color }}>{zoneLabel(d.score)}</span>
        </div>
      </div>
    </div>
  );
}

export function ScoreHistoryChart({ points }: Props) {
  if (!points.length) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

        {/* Colored zone fills */}
        {ZONE_BANDS.map((b) => (
          <ReferenceArea
            key={b.y1}
            y1={b.y1}
            y2={b.y2}
            fill={b.fill}
            stroke="none"
          />
        ))}

        {/* Zone boundary lines */}
        {ZONE_BOUNDARY_COLOR.map((b) => (
          <ReferenceLine
            key={b.y}
            y={b.y}
            stroke={b.color}
            strokeDasharray="4 4"
          />
        ))}

        {/* Halving event markers */}
        {HALVINGS.map((h) => (
          <ReferenceLine
            key={h.label}
            x={h.ts}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="3 5"
            label={{
              value: h.label,
              position: 'insideTopRight',
              fill: 'rgba(255,255,255,0.30)',
              fontSize: 9,
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
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={36}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Score area fill (subtle gradient from score color) */}
        <Area
          type="monotone"
          dataKey="score"
          stroke="none"
          fill="rgba(247,249,252,0.04)"
          dot={false}
          isAnimationActive={false}
          connectNulls
        />

        {/* Score line — primary */}
        <Line
          type="monotone"
          dataKey="score"
          stroke="rgba(247,249,252,0.90)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
