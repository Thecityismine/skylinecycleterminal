"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import type { CurvePoint } from '@/lib/loans/stressTest';

function fmtUsd(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

type MarkerLine = { price: number; label: string; color: string };

type Props = {
  points:         CurvePoint[];
  targetLtv:      number; // decimal
  marginCallLtv:  number; // decimal
  liquidationLtv: number; // decimal
  markers:        MarkerLine[];
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: CurvePoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border px-3 py-2 shadow-xl space-y-0.5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>{fmtUsd(d.btcPrice)}</p>
      <p className="text-sm font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{(d.ltv * 100).toFixed(1)}% LTV</p>
    </div>
  );
}

export function LtvPriceCurve({ points, targetLtv, marginCallLtv, liquidationLtv, markers }: Props) {
  if (!points.length) return null;
  const maxLtv = Math.max(liquidationLtv * 1.15, ...points.map((p) => p.ltv));

  return (
    <div style={{ position: 'relative', width: '100%', height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

          <XAxis
            dataKey="btcPrice" type="number" domain={['dataMin', 'dataMax']}
            tickFormatter={fmtUsd}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false}
          />
          <YAxis
            domain={[0, maxLtv]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }} tickLine={false} width={48}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine y={targetLtv} stroke="#5B84FF" strokeDasharray="4 4" label={{ value: 'Target', position: 'insideTopLeft', fontSize: 9, fill: '#5B84FF' }} />
          <ReferenceLine y={marginCallLtv} stroke="#F7931A" strokeDasharray="4 4" label={{ value: 'Margin Call', position: 'insideTopLeft', fontSize: 9, fill: '#F7931A' }} />
          <ReferenceLine y={liquidationLtv} stroke="#F85149" strokeDasharray="4 4" label={{ value: 'Liquidation', position: 'insideTopLeft', fontSize: 9, fill: '#F85149' }} />

          {markers.map((m) => (
            <ReferenceLine
              key={m.label} x={m.price} stroke={m.color} strokeOpacity={0.5}
              label={{ value: m.label, position: 'top', fontSize: 9, fill: m.color }}
            />
          ))}

          <Line type="monotone" dataKey="ltv" stroke="#F7931A" strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
