"use client";

import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { LiquidityChartRow } from '@/lib/indicators/liquidityRegime';
import { REGIME_LABEL, REGIME_COLOR } from '@/lib/indicators/liquidityRegime';

type Props = {
  data: LiquidityChartRow[];
};

function fmtXTick(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function Tip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number | null; dataKey: string; payload: LiquidityChartRow }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const row = payload[0]?.payload;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs font-mono space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 160 }}>
      <p style={{ color: 'var(--sct-muted)' }}>{date}</p>
      {row && (
        <>
          <p style={{ color: 'rgba(245,247,250,0.9)' }}>Score: {row.score.toFixed(1)}</p>
          <p style={{ color: REGIME_COLOR[row.regime] }}>{REGIME_LABEL[row.regime]}</p>
        </>
      )}
    </div>
  );
}

export function LiquidityRegimeScoreChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} vertical={false} />

        <XAxis
          dataKey="date"
          tickFormatter={fmtXTick}
          tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={{ stroke: '#1E293B' }}
          minTickGap={100}
        />

        {/* Primary Y axis: score 0–100 */}
        <YAxis
          yAxisId="score"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          orientation="right"
          tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={false}
          width={32}
        />

        {/* Secondary Y axis: BTC price log scale (hidden) */}
        <YAxis
          yAxisId="btc"
          scale="log"
          domain={['auto', 'auto']}
          hide
          orientation="right"
        />

        <Tooltip content={<Tip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />

        {/* Horizontal regime band backgrounds */}
        <ReferenceArea yAxisId="score" y1={0}  y2={25}  fill="rgba(248,81,73,0.10)"  strokeOpacity={0} />
        <ReferenceArea yAxisId="score" y1={25} y2={50}  fill="rgba(249,115,22,0.07)" strokeOpacity={0} />
        <ReferenceArea yAxisId="score" y1={50} y2={75}  fill="rgba(234,184,77,0.07)" strokeOpacity={0} />
        <ReferenceArea yAxisId="score" y1={75} y2={100} fill="rgba(53,208,127,0.10)" strokeOpacity={0} />

        {/* Regime threshold lines with labels */}
        <ReferenceLine yAxisId="score" y={75} stroke="rgba(139,148,158,0.3)" strokeDasharray="2 4"
          label={{ value: 'Strong', position: 'insideTopLeft', fontSize: 9, fill: '#35D07F' }} />
        <ReferenceLine yAxisId="score" y={50} stroke="rgba(139,148,158,0.3)" strokeDasharray="2 4"
          label={{ value: 'Improving', position: 'insideTopLeft', fontSize: 9, fill: '#EAB84D' }} />
        <ReferenceLine yAxisId="score" y={25} stroke="rgba(139,148,158,0.3)" strokeDasharray="2 4"
          label={{ value: 'Restrictive', position: 'insideTopLeft', fontSize: 9, fill: '#F97316' }} />

        {/* Dim BTC background line */}
        <Line
          yAxisId="btc"
          type="monotone"
          dataKey="price"
          stroke="rgba(245,247,250,0.08)"
          strokeWidth={1}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />

        {/* Composite score line */}
        <Line
          yAxisId="score"
          type="monotone"
          dataKey="score"
          stroke="rgba(245,247,250,0.9)"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
