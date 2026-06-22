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
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = { points: HistoricalScorePoint[] };

const YEAR_TICKS = Array.from({ length: 16 }, (_, i) =>
  new Date(`${2011 + i}-01-01`).getTime(),
);

const HALVINGS = [
  { ts: new Date('2012-11-28').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19').getTime(), label: 'H4' },
];

const ZONE_BANDS = [
  { y1: 0,   y2: 25,  fill: 'rgba(59,130,246,0.08)'  },
  { y1: 25,  y2: 50,  fill: 'rgba(53,208,127,0.08)'  },
  { y1: 50,  y2: 75,  fill: 'rgba(230,180,80,0.08)'  },
  { y1: 75,  y2: 100, fill: 'rgba(255,92,92,0.08)'   },
];

const ZONE_LINES = [
  { y: 25, color: 'rgba(53,208,127,0.22)' },
  { y: 50, color: 'rgba(230,180,80,0.22)' },
  { y: 75, color: 'rgba(255,92,92,0.22)'  },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

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
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[190px]"
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
        {d.btcClose > 0 && (
          <div className="flex justify-between gap-6 pt-1 mt-1 border-t" style={{ borderColor: 'var(--sct-border)' }}>
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
            <span className="text-xs font-mono font-bold" style={{ color: '#F7931A' }}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.btcClose)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScoreHistoryChart({ points }: Props) {
  if (!points.length) return null;

  const prices   = points.map((p) => p.btcClose).filter((v) => v > 0);
  const pMin     = prices.length ? Math.max(0.01, Math.min(...prices) * 0.6) : 0.01;
  const pMax     = prices.length ? Math.max(...prices) * 2.0 : 200_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 72, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Colored zone fills */}
          {ZONE_BANDS.map((b) => (
            <ReferenceArea
              key={b.y1}
              yAxisId="score"
              y1={b.y1}
              y2={b.y2}
              fill={b.fill}
              stroke="none"
            />
          ))}

          {/* Zone boundary lines */}
          {ZONE_LINES.map((b) => (
            <ReferenceLine
              key={b.y}
              yAxisId="score"
              y={b.y}
              stroke={b.color}
              strokeDasharray="4 4"
            />
          ))}

          {/* Halving markers */}
          {HALVINGS.map((h) => (
            <ReferenceLine
              key={h.label}
              yAxisId="score"
              x={h.ts}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="3 5"
              label={{
                value: h.label,
                position: 'insideTopRight',
                fill: 'rgba(255,255,255,0.28)',
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

          {/* Left: Cycle Score 0–100 */}
          <YAxis
            yAxisId="score"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={36}
          />

          {/* Right: BTC Price log scale */}
          <YAxis
            yAxisId="price"
            orientation="right"
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtPrice}
            tick={{ fill: '#F7931A', fontSize: 10, fontFamily: 'monospace', opacity: 0.55 }}
            axisLine={false}
            tickLine={false}
            width={60}
            allowDataOverflow
          />

          <Tooltip content={<CustomTooltip />} />

          {/* BTC price — neon orange, behind score line */}
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="btcClose"
            stroke="#F7931A"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
            opacity={0.55}
          />

          {/* Score area fill */}
          <Area
            yAxisId="score"
            type="monotone"
            dataKey="score"
            stroke="none"
            fill="rgba(247,249,252,0.04)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Score line — primary, drawn last so it sits on top */}
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="score"
            stroke="rgba(247,249,252,0.92)"
            strokeWidth={2.5}
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
