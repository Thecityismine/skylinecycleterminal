"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from "recharts";
import { NBER_RECESSIONS } from "@/lib/indicators/recessionRisk";
import type { SPXPoint } from "@/lib/indicators/recessionRisk";
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = {
  data:          SPXPoint[];
  show50w:       boolean;
  show200w:      boolean;
  showRecessions: boolean;
  logScale:      boolean;
  ath:           number;
};

const LOG_TICKS  = [100, 500, 1_000, 2_000, 5_000, 10_000, 20_000];
const YEAR_TICKS = Array.from({ length: 26 }, (_, i) =>
  new Date(`${2000 + i}-01-01T00:00:00Z`).getTime()
);

function fmtPrice(v: number): string {
  if (v >= 10_000) return `${(v / 1_000).toFixed(0)}K`;
  if (v >= 1_000)  return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d  = payload[0]?.payload as SPXPoint;
  const rows = [
    { label: 'S&P 500',   val: d.price.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: 'rgba(247,249,252,0.9)' },
    d.ma50w  != null && { label: '50W MA',  val: d.ma50w.toLocaleString('en-US', { maximumFractionDigits: 0 }),  color: '#3B82F6' },
    d.ma200w != null && { label: '200W MA', val: d.ma200w.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: '#A855F7' },
  ].filter(Boolean) as { label: string; val: string; color: string }[];

  const rec = NBER_RECESSIONS.find(r =>
    d.time >= r.start && d.time <= r.end
  );

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs shadow-xl min-w-[180px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="font-mono mb-2" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      {rec && (
        <p className="text-[10px] mb-2 px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FF5C5C18', color: '#FF5C5C' }}>
          {rec.label}
        </p>
      )}
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between gap-4">
            <span style={{ color: 'var(--sct-muted)' }}>{r.label}</span>
            <span className="font-mono font-semibold" style={{ color: r.color }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SPXRecessionChart({ data, show50w, show200w, showRecessions, logScale, ath }: Props) {
  const recessionAreas = NBER_RECESSIONS.map(r => ({
    ...r,
    startTs: new Date(r.start + 'T00:00:00Z').getTime(),
    endTs:   new Date(r.end   + 'T00:00:00Z').getTime(),
  }));

  const athTs = data.find(d => d.price === ath)?.ts;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

        {/* Recession shading */}
        {showRecessions && recessionAreas.map(r => (
          <ReferenceArea
            key={r.label}
            x1={r.startTs}
            x2={r.endTs}
            fill="rgba(220,60,60,0.10)"
            stroke="rgba(220,60,60,0.25)"
            strokeWidth={1}
            label={{
              value:    r.label.replace(' Recession', '').replace('Global Financial Crisis', 'GFC'),
              position: 'insideTop',
              fill:     'rgba(220,60,60,0.55)',
              fontSize: 10,
              fontFamily: 'var(--font-geist-mono)',
            }}
          />
        ))}

        {/* ATH reference line */}
        {athTs && (
          <ReferenceLine
            x={athTs}
            stroke="rgba(247,249,252,0.15)"
            strokeDasharray="4 3"
            strokeWidth={1}
          />
        )}

        <XAxis
          dataKey="ts"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={YEAR_TICKS}
          tickFormatter={ts => new Date(ts).getUTCFullYear().toString()}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
        />

        <YAxis
          scale={logScale ? 'log' : 'auto'}
          domain={logScale ? [100, 'auto'] : ['auto', 'auto']}
          ticks={logScale ? LOG_TICKS : undefined}
          tickFormatter={fmtPrice}
          tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'var(--font-geist-mono)' }}
          axisLine={{ stroke: 'var(--sct-border)' }}
          tickLine={false}
          width={56}
          allowDataOverflow
        />

        <Tooltip content={<CustomTooltip />} />

        {/* 200W MA — purple */}
        {show200w && (
          <Line type="monotone" dataKey="ma200w" stroke="#A855F7" strokeWidth={1.5}
            dot={false} isAnimationActive={false} connectNulls={false} />
        )}

        {/* 50W MA — blue */}
        {show50w && (
          <Line type="monotone" dataKey="ma50w" stroke="#3B82F6" strokeWidth={1.5}
            dot={false} isAnimationActive={false} connectNulls={false} />
        )}

        {/* SPX Price — white */}
        <Line type="monotone" dataKey="price" stroke="rgba(247,249,252,0.9)" strokeWidth={1.5}
          dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
    <ChartWatermark />
    </div>
  );
}
