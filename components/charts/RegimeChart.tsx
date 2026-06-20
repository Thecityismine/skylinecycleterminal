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
import type { RegimePoint, RegimeZone } from '@/lib/indicators/regimeHelpers';
import { REGIME_FILL, REGIME_COLOR, REGIME_LABEL } from '@/lib/indicators/regimeHelpers';

type Props = {
  points: RegimePoint[];
  zones:  RegimeZone[];
  showMA: boolean;
};

const LOG_TICKS  = [100, 1_000, 10_000, 100_000, 1_000_000];
const YEAR_TICKS = Array.from({ length: 14 }, (_, i) =>
  new Date(`${2012 + i}-01-01`).getTime(),
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtFull(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime();
  return Math.round(ms / 86_400_000);
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as RegimePoint;

  const daysIn = daysBetween(d.regimeStart, d.time) + 1;
  const regime = d.regime;
  const color  = REGIME_COLOR[regime];

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[190px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
            {fmtFull(d.price)}
          </span>
        </div>
        {d.ma200 != null && (
          <div className="flex justify-between gap-4">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>200 DMA</span>
            <span className="text-xs font-mono" style={{ color: '#F7931A' }}>
              {fmtFull(d.ma200)}
            </span>
          </div>
        )}
        <div
          className="flex justify-between gap-4 pt-1 border-t"
          style={{ borderColor: 'var(--sct-border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Regime</span>
          <span className="text-xs font-mono font-medium" style={{ color }}>
            {REGIME_LABEL[regime]}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Days in Regime</span>
          <span className="text-xs font-mono" style={{ color: 'var(--sct-secondary)' }}>
            {daysIn}
          </span>
        </div>
      </div>
    </div>
  );
}

export function RegimeChart({ points, zones, showMA }: Props) {
  if (!points.length) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={points} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

        {/* Bull / Bear / Neutral background shading */}
        {zones.map((z) => (
          <ReferenceArea
            key={`${z.start}-${z.regime}`}
            x1={z.startTs}
            x2={z.endTs}
            fill={REGIME_FILL[z.regime]}
            stroke="none"
            label={z.durationDays >= 90
              ? {
                  value: z.regime === 'bull' ? 'Bull' : z.regime === 'bear' ? 'Bear' : '',
                  position: 'insideTop',
                  fill: REGIME_COLOR[z.regime],
                  fontSize: 9,
                  opacity: 0.65,
                }
              : undefined
            }
          />
        ))}

        {/* 200DMA boundary line — helps readers see the flip points */}
        <ReferenceLine
          y={points[points.length - 1]?.ma200 ?? undefined}
          stroke="rgba(247,147,26,0)"
        />

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
          scale="log"
          domain={[100, 'auto']}
          ticks={LOG_TICKS}
          tickFormatter={fmtPrice}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={64}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* 200 DMA line */}
        {showMA && (
          <Line
            type="monotone"
            dataKey="ma200"
            stroke="#F7931A"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        )}

        {/* BTC price — on top */}
        <Line
          type="monotone"
          dataKey="price"
          stroke="rgba(247,249,252,0.9)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
