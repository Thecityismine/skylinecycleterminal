"use client";

import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { RealizedPricePoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = { label: string; days: number };

const PERIODS: Period[] = [
  { label: 'All', days: Infinity },
  { label: '3Y',  days: 1095 },
  { label: '1Y',  days: 365  },
  { label: '3M',  days: 90   },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtX(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtFull(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, realizedAvailable, secondaryLabel, secondaryColor }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  realizedAvailable: boolean;
  secondaryLabel: string;
  secondaryColor: string;
}) {
  if (!active || !payload || !payload.length || !label) return null;

  const price    = payload.find((p) => p.name === 'price')?.value;
  const realized = payload.find((p) => p.name === 'realized')?.value;
  const mvrv     = price && realized ? (price / realized).toFixed(2) : null;

  return (
    <div
      className="rounded-lg border px-4 py-3 text-xs font-mono space-y-1.5"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p style={{ color: '#64748B' }}>{fmtFull(label)}</p>
      {price != null && (
        <p style={{ color: '#F7931A' }}>
          BTC Price: <span className="font-bold">${Math.round(price).toLocaleString()}</span>
        </p>
      )}
      {realizedAvailable && realized != null && (
        <>
          <p style={{ color: secondaryColor }}>
            {secondaryLabel}: <span className="font-bold">${Math.round(realized).toLocaleString()}</span>
          </p>
          {mvrv && (
            <p style={{ color: '#64748B' }}>
              Ratio: <span style={{ color: '#94A3B8' }}>{mvrv}×</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Chart component ─────────────────────────────────────────────────────────

export function RealizedPriceChart({
  data,
  realizedAvailable,
  secondaryLabel = 'Avg Buy Price (Realized)',
  secondaryColor = '#E879F9',
}: {
  data: RealizedPricePoint[];
  realizedAvailable: boolean;
  secondaryLabel?: string;
  secondaryColor?: string;
}) {
  const [period, setPeriod] = useState<string>('3Y');

  const filtered = useMemo(() => {
    const p = PERIODS.find((x) => x.label === period);
    if (!p || p.days === Infinity) return data;
    const cutoff = Date.now() - p.days * 86_400_000;
    return data.filter((d) => new Date(d.time).getTime() >= cutoff);
  }, [data, period]);

  // Downsample for rendering performance
  const sampled = useMemo(() => {
    if (filtered.length <= 500) return filtered;
    const step = Math.floor(filtered.length / 500);
    return filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);
  }, [filtered]);

  return (
    <div
      className="rounded-xl border p-6"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 rounded" style={{ backgroundColor: '#F7931A' }} />
            <span className="text-xs font-mono" style={{ color: '#F7931A' }}>BTC Price</span>
          </div>
          {realizedAvailable && (
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 rounded" style={{ backgroundColor: secondaryColor }} />
              <span className="text-xs font-mono" style={{ color: secondaryColor }}>{secondaryLabel}</span>
            </div>
          )}
        </div>

        {/* Period selector */}
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p.label)}
              className="px-3 py-1 text-xs font-mono rounded transition-all duration-150"
              style={{
                backgroundColor: period === p.label ? 'var(--sct-border)' : 'transparent',
                color: period === p.label ? 'var(--sct-text)' : 'var(--sct-muted)',
                border: `1px solid ${period === p.label ? 'var(--sct-border)' : 'transparent'}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={sampled} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.6} />

          <XAxis
            dataKey="time"
            tickFormatter={fmtX}
            tick={{ fill: '#4B5563', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={80}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={58}
          />

          <Tooltip
            content={<ChartTooltip realizedAvailable={realizedAvailable} secondaryLabel={secondaryLabel} secondaryColor={secondaryColor} />}
            cursor={{ stroke: '#1E293B', strokeWidth: 1 }}
          />

          {/* Secondary line (200W MA or Realized Price) — drawn first so BTC sits on top */}
          {realizedAvailable && (
            <Line
              type="monotone"
              dataKey="realized"
              stroke={secondaryColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* BTC price line */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#F7931A"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />

          {/* Horizontal reference line at current secondary value */}
          {realizedAvailable && sampled.at(-1)?.realized != null && (
            <ReferenceLine
              y={sampled.at(-1)!.realized!}
              stroke={secondaryColor}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {!realizedAvailable && (
        <p className="mt-3 text-xs text-center" style={{ color: 'var(--sct-muted)' }}>
          Realized Price requires <span style={{ color: 'var(--sct-secondary)' }}>CapRealUSD</span> from
          CoinMetrics Pro. Upgrade to unlock the second line.
        </p>
      )}
    </div>
  );
}
