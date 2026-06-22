"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { WeeklyPoint, RegimeSegment } from '@/lib/indicators/weeklyMA';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

// ─── Constants ────────────────────────────────────────────────────────────────

const HALVINGS = [
  { date: '2012-11-26', label: 'H1' },
  { date: '2016-07-04', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-15', label: 'H4' },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtUSD(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

// Return just the year for the first Monday of each year
function xTickFormatter(time: string): string {
  if (time.slice(5, 7) === '01' && parseInt(time.slice(8, 10)) <= 7) {
    return time.slice(0, 4);
  }
  return '';
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTip({ active, payload }: { active?: boolean; payload?: Array<{ payload: WeeklyPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const dist = d.distanceFrom100W;
  const distColor = dist == null ? '#94A3B8' : dist >= 0 ? '#35D07F' : '#FF5C5C';
  const regimeLabel = d.trendRegime === 'bullish' ? 'Above Trend'
    : d.trendRegime === 'bearish' ? 'Below Trend'
    : d.trendRegime === 'testing' ? 'Testing Trend'
    : '—';
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs font-mono space-y-1"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p className="font-semibold" style={{ color: '#F8FAFC' }}>{d.time}</p>
      <p style={{ color: '#F7931A' }}>BTC:   <b>{fmtUSD(d.close)}</b></p>
      {d.ma50  && <p style={{ color: '#3B82F6' }}>50W:   <b>{fmtUSD(d.ma50)}</b></p>}
      {d.ma100 && <p style={{ color: '#EAB84D' }}>100W:  <b>{fmtUSD(d.ma100)}</b></p>}
      {d.ma200 && <p style={{ color: '#A855F7' }}>200W:  <b>{fmtUSD(d.ma200)}</b></p>}
      {dist != null && (
        <p style={{ color: distColor }}>Dist 100W: <b>{dist >= 0 ? '+' : ''}{dist.toFixed(1)}%</b></p>
      )}
      <p style={{ color: '#4B5563' }}>{regimeLabel}</p>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

type Props = {
  points: WeeklyPoint[];
  regimes: RegimeSegment[];
};

export function BTC100WChart({ points, regimes }: Props) {
  const prices   = points.map((p) => p.close).filter((v) => v > 0);
  const pMin     = prices.length ? Math.max(0.01, Math.min(...prices) * 0.4) : 0.01;
  const pMax     = prices.length ? Math.max(...prices) * 2.5  : 1_000_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  // Only show the last data point as the tick so XAxis doesn't crowd
  const allTimes   = points.map((p) => p.time);
  const xTickTimes = allTimes.filter((t) => xTickFormatter(t) !== '');

  const regimeColor = (r: RegimeSegment['regime']) =>
    r === 'bullish' ? '#35D07F' : r === 'bearish' ? '#FF5C5C' : '#E6B450';

  return (
    <div style={{ position: 'relative', width: '100%', height: 480 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

          {/* ── Regime shading ──────────────────────────────────────────── */}
          {regimes.map((seg, i) => (
            <ReferenceArea
              key={i}
              x1={seg.start}
              x2={seg.end}
              fill={regimeColor(seg.regime)}
              fillOpacity={0.055}
              stroke="none"
              ifOverflow="hidden"
            />
          ))}

          {/* ── Halving markers ─────────────────────────────────────────── */}
          {HALVINGS.map((h) => (
            <ReferenceLine
              key={h.date}
              x={mondayOn(h.date, allTimes)}
              stroke="#374151"
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
            dataKey="time"
            ticks={xTickTimes}
            tickFormatter={(v: string) => v.slice(0, 4)}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            interval="preserveStartEnd"
          />

          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={64}
            allowDataOverflow
          />

          <Tooltip content={<ChartTip />} cursor={{ stroke: '#334155', strokeWidth: 1 }} />

          {/* ── MAs — drawn bottom to top so price is on top ────────────── */}
          <Line
            dataKey="ma200"
            stroke="#A855F7"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
            name="200W MA"
          />
          <Line
            dataKey="ma50"
            stroke="#3B82F6"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
            name="50W MA"
          />
          <Line
            dataKey="ma100"
            stroke="#EAB84D"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
            name="100W MA"
          />
          <Line
            dataKey="close"
            stroke="#F7931A"
            strokeWidth={2}
            dot={false}
            connectNulls
            isAnimationActive={false}
            name="BTC Price"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <ChartWatermark />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-xs font-mono">
        {[
          { color: '#F7931A', label: 'BTC Price',           width: 2 },
          { color: '#EAB84D', label: '100W MA',             width: 2.5 },
          { color: '#3B82F6', label: '50W MA',              width: 1.5 },
          { color: '#A855F7', label: '200W MA',             width: 1.5 },
          { color: '#35D07F', label: 'Above trend',         opacity: 0.25 },
          { color: '#E6B450', label: 'Testing (±5%)',       opacity: 0.25 },
          { color: '#FF5C5C', label: 'Below trend',         opacity: 0.25 },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-1.5" style={{ color: l.color }}>
            {'opacity' in l ? (
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color, opacity: l.opacity }} />
            ) : (
              <span
                className="rounded-full"
                style={{ width: 16, height: l.width ?? 2, backgroundColor: l.color, display: 'inline-block' }}
              />
            )}
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Find the closest monday in `allTimes` to a given date string.
function mondayOn(date: string, allTimes: string[]): string {
  const target = new Date(date + 'T00:00:00Z').getTime();
  return allTimes.reduce((best, t) =>
    Math.abs(new Date(t).getTime() - target) < Math.abs(new Date(best).getTime() - target) ? t : best
  );
}
