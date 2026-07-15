"use client";

import {
  ComposedChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ChartWatermark } from './ChartWatermark';
import { metricValue } from '@/lib/indicators/dcaOptimizer';
import type { BucketStat, Metric, ForwardWindow } from '@/lib/indicators/dcaOptimizer';

type Props = {
  buckets:   BucketStat[];
  metric:    Metric;
  winWindow: ForwardWindow;
  bestKey:   number | null;
};

const GREEN = '#35D07F';
const RED   = '#F85149';
const MUTED = '#4B5563';

function isDiscountMetric(metric: Metric): boolean {
  return metric === 'avgDiscount' || metric === 'medianDiscount';
}

function fmtMetric(v: number | null, metric: Metric): string {
  if (v == null) return '—';
  if (metric === 'winRate') return `${v.toFixed(0)}%`;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

type TooltipPayloadItem = { payload: BucketStat & { value: number | null } };

function CustomTooltip({ active, payload, winWindow }: { active?: boolean; payload?: TooltipPayloadItem[]; winWindow: ForwardWindow }) {
  if (!active || !payload || !payload.length) return null;
  const b = payload[0].payload;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 shadow-xl space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', minWidth: 190 }}
    >
      <p className="text-xs font-semibold" style={{ color: 'var(--sct-text)' }}>{b.label}</p>
      <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
        Avg Discount <span className="font-mono" style={{ color: 'var(--sct-text)' }}>{fmtPct(b.avgDiscount)}</span>
      </p>
      <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
        Median Discount <span className="font-mono" style={{ color: 'var(--sct-text)' }}>{fmtPct(b.medianDiscount)}</span>
      </p>
      <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
        Win Rate ({winWindow}D) <span className="font-mono" style={{ color: 'var(--sct-text)' }}>{b.winRate != null ? `${b.winRate.toFixed(0)}%` : '—'}</span>
      </p>
      <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
        30D Return <span className="font-mono" style={{ color: 'var(--sct-text)' }}>{fmtPct(b.avgFwd30)}</span>
      </p>
      <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>
        90D Return <span className="font-mono" style={{ color: 'var(--sct-text)' }}>{fmtPct(b.avgFwd90)}</span>
      </p>
      <p className="text-[10px] pt-0.5" style={{ color: 'var(--sct-muted)', opacity: 0.7 }}>
        {b.occurrences} occurrences
      </p>
    </div>
  );
}

export function DCAOptimizerChart({ buckets, metric, winWindow, bestKey }: Props) {
  const data = buckets.map((b) => ({ ...b, value: metricValue(b, metric, winWindow) }));
  const values = data.map((d) => d.value).filter((v): v is number => v != null);
  const avg = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

  // For discount metrics, "favorable" is below the cross-bucket average (cheaper);
  // for win rate / return metrics, favorable is above average.
  const favorable = (v: number) => isDiscountMetric(metric) ? v <= avg : v >= avg;

  if (data.every((d) => d.value == null)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p style={{ color: 'var(--sct-muted)', fontSize: 13 }}>Not enough data yet</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--sct-muted)', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmtMetric(v, metric)}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={64}
          />
          <ReferenceLine y={0} stroke="var(--sct-border)" strokeWidth={1} />
          <Tooltip
            content={<CustomTooltip winWindow={winWindow} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="value" maxBarSize={56} isAnimationActive={false}>
            {data.map((d) => (
              <Cell
                key={d.key}
                fill={d.value == null ? MUTED : favorable(d.value) ? GREEN : RED}
                fillOpacity={d.key === bestKey ? 1 : 0.65}
                stroke={d.key === bestKey ? '#F7931A' : 'none'}
                strokeWidth={d.key === bestKey ? 2 : 0}
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
