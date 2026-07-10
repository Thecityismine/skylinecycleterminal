"use client";

import {
  ComposedChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { BTCGliRow } from '@/lib/indicators/gliLag';

type Props = { data: BTCGliRow[] };

function fmtXTick(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

type TipProps = {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string;
};

function Tip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length || !label) return null;
  const v = payload[0]?.value as number | undefined;
  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div className="rounded-lg border px-3 py-2 text-xs font-mono space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 170 }}>
      <p style={{ color: 'var(--sct-muted)' }}>{date}</p>
      {v != null && (
        <p style={{ color: v >= 0 ? '#35D07F' : '#F85149' }}>
          GLI 20D ROC: {v >= 0 ? '+' : ''}{v.toFixed(1)}%
        </p>
      )}
    </div>
  );
}

export function GLIMomentumChart({ data }: Props) {
  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={fmtXTick}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            minTickGap={80}
          />
          <YAxis
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={48}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={(props: any) => <Tip {...props} />} />
          <ReferenceLine y={0} stroke="var(--sct-border)" />
          <Bar dataKey="gliMomentum20d" isAnimationActive={false}>
            {data.map((row, i) => (
              <Cell key={i} fill={(row.gliMomentum20d ?? 0) >= 0 ? '#35D07F' : '#F85149'} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
