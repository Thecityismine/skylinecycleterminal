"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, CartesianGrid,
} from 'recharts';
import type { EquityPoint, ZoneSegment, EquityZone } from '@/lib/indicators/equityScore';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

const ZONE_FILL: Record<EquityZone, string> = {
  green: 'rgba(53,208,127,0.07)',
  amber: 'rgba(230,180,80,0.06)',
  red:   'rgba(255,92,92,0.07)',
  none:  'transparent',
};

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtPrice(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 1)    return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

type Props = {
  points:    EquityPoint[];
  segments:  ZoneSegment[];
  ath:       number;
  logScale:  boolean;
  color:     string;
  startTs?:  number;
};

export function EquityChart({ points, segments, ath, logScale, color, startTs }: Props) {
  const filtered = startTs ? points.filter((p) => p.ts >= startTs) : points;
  const filteredSegs = startTs
    ? segments.filter((s) => s.x2 >= startTs).map((s) => ({ ...s, x1: Math.max(s.x1, startTs) }))
    : segments;

  if (!filtered.length) return null;

  const prices = filtered.map((p) => p.close).filter(Boolean);
  const minP   = Math.min(...prices);
  const maxP   = Math.max(...prices);
  const pad    = (maxP - minP) * 0.05;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload as EquityPoint;
    if (!d) return null;
    return (
      <div className="rounded-lg border px-3 py-2.5 text-xs space-y-1 min-w-[160px]"
        style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}>
        <p className="font-medium" style={{ color: 'var(--sct-secondary)' }}>
          {new Date(d.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="space-y-0.5">
          <div className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>Price</span>
            <span className="font-mono font-bold" style={{ color }}>{fmtPrice(d.close)}</span>
          </div>
          {d.ma50w != null && (
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--sct-muted)' }}>50W SMA</span>
              <span className="font-mono" style={{ color: '#D4A853' }}>{fmtPrice(d.ma50w)}</span>
            </div>
          )}
          {d.ma200w != null && (
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--sct-muted)' }}>200W SMA</span>
              <span className="font-mono" style={{ color: '#5B7DD8' }}>{fmtPrice(d.ma200w)}</span>
            </div>
          )}
          {d.ath > 0 && (
            <div className="flex justify-between gap-4">
              <span style={{ color: 'var(--sct-muted)' }}>From ATH</span>
              <span className="font-mono" style={{ color: d.close >= d.ath * 0.98 ? '#35D07F' : '#FF5C5C' }}>
                {d.close >= d.ath * 0.98 ? '≈ ATH' : `${((d.close / d.ath - 1) * 100).toFixed(1)}%`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const domain: [number | string, number | string] = logScale
    ? ['auto', 'auto']
    : [Math.max(0, minP - pad), maxP + pad];

  const athInRange = ath > 0 && ath <= maxP * 1.2;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={filtered} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="eq-price-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
            <stop offset="95%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />

        {/* Zone background shading */}
        {filteredSegs.map((s, i) => (
          <ReferenceArea
            key={i}
            x1={s.x1} x2={s.x2}
            fill={ZONE_FILL[s.zone]}
            stroke="none"
          />
        ))}

        {/* ATH line */}
        {athInRange && (
          <ReferenceLine
            y={ath}
            stroke="rgba(255,255,255,0.25)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: 'ATH', position: 'insideTopRight', fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
          />
        )}

        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={fmtDate}
          tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          minTickGap={60}
        />
        <YAxis
          orientation="right"
          scale={logScale ? 'log' : 'linear'}
          domain={domain}
          tickFormatter={(v) => fmtPrice(v)}
          tick={{ fill: 'var(--sct-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={60}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Price area */}
        <Area
          dataKey="close"
          stroke={color}
          strokeWidth={1.5}
          fill="url(#eq-price-fill)"
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
          isAnimationActive={false}
        />

        {/* 200W SMA */}
        <Line
          dataKey="ma200w"
          stroke="#5B7DD8"
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
          connectNulls
          isAnimationActive={false}
        />

        {/* 50W SMA */}
        <Line
          dataKey="ma50w"
          stroke="#D4A853"
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
          connectNulls
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
