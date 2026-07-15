"use client";

import { useMemo } from 'react';
import {
  ComposedChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { riskColor } from '@/lib/indicators/riskScore';

type Props = {
  scores:       (number | null)[]; // composite (or selected model) scores across history
  currentScore: number | null;
  binCount?:    number;
};

type Bin = { key: number; label: string; count: number; isCurrent: boolean };

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: Bin }[] }) {
  if (!active || !payload || !payload.length) return null;
  const b = payload[0].payload;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-xl"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs font-mono" style={{ color: 'var(--sct-text)' }}>{b.label}</p>
      <p className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>{b.count} days</p>
    </div>
  );
}

export function RiskHistogramChart({ scores, currentScore, binCount = 20 }: Props) {
  const bins = useMemo<Bin[]>(() => {
    const counts = new Array(binCount).fill(0);
    for (const s of scores) {
      if (s == null) continue;
      const idx = Math.min(binCount - 1, Math.max(0, Math.floor(s * binCount)));
      counts[idx]++;
    }
    const currentBin = currentScore != null ? Math.min(binCount - 1, Math.max(0, Math.floor(currentScore * binCount))) : null;
    return counts.map((count, i) => ({
      key: i,
      label: `${(i / binCount).toFixed(2)}–${((i + 1) / binCount).toFixed(2)}`,
      count,
      isCurrent: i === currentBin,
    }));
  }, [scores, currentScore, binCount]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={bins} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="key"
            tickFormatter={(k) => (k / binCount).toFixed(1)}
            tick={{ fill: 'var(--sct-muted)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" maxBarSize={20} isAnimationActive={false}>
            {bins.map((b) => (
              <Cell
                key={b.key}
                fill={riskColor((b.key + 0.5) / binCount)}
                fillOpacity={b.isCurrent ? 1 : 0.45}
                stroke={b.isCurrent ? '#F7931A' : 'none'}
                strokeWidth={b.isCurrent ? 2 : 0}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
