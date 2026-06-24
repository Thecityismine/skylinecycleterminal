"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Customized,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { HalvingWindowData } from '@/lib/indicators/halvingWindows';

type PricePoint = { time: string; ts: number; price: number };

type Props = {
  points:   PricePoint[];
  windows:  HalvingWindowData[];
  logScale: boolean;
  startTs:  number;
};

const CYAN = '#45F3FF';
const PINK = '#FF5CA8';

const YEAR_TICKS = Array.from({ length: 22 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime()
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as PricePoint;
  if (!d) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 shadow-xl"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 170 }}
    >
      <p className="text-xs mb-1 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <p className="text-sm font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
        {fmtPrice(d.price)}
      </p>
    </div>
  );
}

// Neon glow SVG dots rendered via Recharts Customized
function NeonDotsLayer({ xAxisMap, yAxisMap, windows, startTs, chartId }: any) {
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
  const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const cyanFilterId = `glow-cyan-${chartId}`;
  const pinkFilterId = `glow-pink-${chartId}`;

  const dots: React.ReactElement[] = [];

  for (const w of windows as HalvingWindowData[]) {
    if (w.projected) continue;

    if (w.accumulationPoint && w.accumulationPoint.ts >= (startTs as number)) {
      const cx = xAxis.scale(w.accumulationPoint.ts);
      const cy = yAxis.scale(w.accumulationPoint.price);
      if (isFinite(cx) && isFinite(cy)) {
        dots.push(
          <g key={`acc-${w.year}`}>
            <circle cx={cx} cy={cy} r={22} fill={CYAN} opacity={0.05} />
            <circle cx={cx} cy={cy} r={13} fill={CYAN} opacity={0.12} />
            <circle cx={cx} cy={cy} r={7}  fill={CYAN} opacity={0.92} filter={`url(#${cyanFilterId})`} />
          </g>
        );
      }
    }

    if (w.deriskPoint && w.deriskPoint.ts >= (startTs as number)) {
      const cx = xAxis.scale(w.deriskPoint.ts);
      const cy = yAxis.scale(w.deriskPoint.price);
      if (isFinite(cx) && isFinite(cy)) {
        dots.push(
          <g key={`risk-${w.year}`}>
            <circle cx={cx} cy={cy} r={22} fill={PINK} opacity={0.05} />
            <circle cx={cx} cy={cy} r={13} fill={PINK} opacity={0.12} />
            <circle cx={cx} cy={cy} r={7}  fill={PINK} opacity={0.92} filter={`url(#${pinkFilterId})`} />
          </g>
        );
      }
    }
  }

  return (
    <g>
      <defs>
        <filter id={cyanFilterId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={pinkFilterId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {dots}
    </g>
  );
}

export function BTCHalvingWindowsChart({ points, windows, logScale, startTs }: Props) {
  if (!points.length) return null;

  const visible  = points.filter((p) => p.ts >= startTs);
  const now      = Date.now();
  const yearTicks = YEAR_TICKS.filter((t) => startTs === 0 || t >= startTs);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={visible} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* 500-day accumulation windows (cyan) */}
          {windows.map((w) => {
            const x1 = Math.max(w.accumulationStartTs, startTs);
            const x2 = w.accumulationEndTs;
            if (x2 < startTs) return null;
            return (
              <ReferenceArea
                key={`acc-${w.year}`}
                x1={x1}
                x2={x2}
                fill={`rgba(69,243,255,${w.projected ? 0.04 : 0.07})`}
                stroke={`rgba(69,243,255,${w.projected ? 0.08 : 0.18})`}
                strokeWidth={0.8}
                strokeDasharray={w.projected ? '4 4' : undefined}
              />
            );
          })}

          {/* 500-day de-risk windows (pink) */}
          {windows.map((w) => {
            const x1 = Math.max(w.deriskStartTs, startTs);
            const x2 = w.deriskEndTs;
            if (x2 < startTs) return null;
            return (
              <ReferenceArea
                key={`risk-${w.year}`}
                x1={x1}
                x2={x2}
                fill={`rgba(255,92,168,${w.projected ? 0.04 : 0.07})`}
                stroke={`rgba(255,92,168,${w.projected ? 0.08 : 0.18})`}
                strokeWidth={0.8}
                strokeDasharray={w.projected ? '4 4' : undefined}
              />
            );
          })}

          {/* Halving vertical lines */}
          {windows.map((w) =>
            w.halvingTs >= startTs ? (
              <ReferenceLine
                key={`halving-${w.year}`}
                x={w.halvingTs}
                stroke={w.projected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.55)'}
                strokeDasharray={w.projected ? '6 4' : undefined}
                strokeWidth={1.5}
                label={{
                  value:      w.shortLabel,
                  position:   'insideTopRight',
                  fontSize:   10,
                  fill:       w.projected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                }}
              />
            ) : null
          )}

          {/* Now line */}
          {now >= startTs && (
            <ReferenceLine
              x={now}
              stroke="rgba(247,249,252,0.35)"
              strokeDasharray="2 4"
              label={{ value: 'Now', position: 'insideTopRight', fontSize: 10, fill: 'rgba(247,249,252,0.45)' }}
            />
          )}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtPrice}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={64}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="price"
            stroke="rgba(247,249,252,0.82)"
            strokeWidth={1.5}
            fill="rgba(247,249,252,0.04)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Neon signal dots rendered on top */}
          <Customized
            component={(props: any) => (
              <NeonDotsLayer
                {...props}
                windows={windows}
                startTs={startTs}
                chartId="main"
              />
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}

// Helper used in the page for label formatting
export function fmtSignalDate(iso: string | undefined): string {
  if (!iso) return '—';
  return fmtDate(iso);
}
