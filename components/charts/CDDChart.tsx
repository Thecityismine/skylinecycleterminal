"use client";

import { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { CycleMasterPoint } from '@/lib/indicators/cycleMaster';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtYear(ts: number): string {
  return new Date(ts).getUTCFullYear().toString();
}

function fmtCDD(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

function fmtFull(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length || label == null) return null;

  const cdd    = payload.find((p) => p.name === 'cdd')?.value ?? null;
  const cdd90  = payload.find((p) => p.name === 'cdd90')?.value ?? null;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs font-mono space-y-1"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p style={{ color: '#4B5563' }}>{fmtFull(label)}</p>
      {cdd   != null && <p style={{ color: 'rgba(247,147,26,0.4)' }}>CDD Raw:   <b>{fmtCDD(cdd)}</b></p>}
      {cdd90 != null && <p style={{ color: '#F7931A' }}>CDD 90d MA: <b>{fmtCDD(cdd90)}</b></p>}
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function CDDChart({ data }: { data: CycleMasterPoint[] }) {
  const [showRaw, setShowRaw] = useState(true);

  // Check if all CDD values are null
  const hasCDD = useMemo(
    () => data.some((d) => d.cdd != null || d.cdd90 != null),
    [data],
  );

  // Year ticks
  const yearTicks = useMemo(() => {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const d of data) {
      const yr = new Date(d.ts).getUTCFullYear();
      if (!seen.has(yr)) { seen.add(yr); out.push(d.ts); }
    }
    return out;
  }, [data]);

  if (!hasCDD) {
    return (
      <div
        className="h-64 flex flex-col items-center justify-center rounded-lg border gap-2"
        style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
      >
        <p className="text-sm font-mono">CDD data requires an on-chain subscription</p>
        <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
          Coin Days Destroyed is not available in the CoinMetrics Community API tier.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Toggle */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>Show:</span>
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="px-2.5 py-0.5 rounded text-xs font-mono border transition-all"
          style={{
            backgroundColor: showRaw ? 'var(--sct-border)' : 'transparent',
            borderColor:     'var(--sct-border)',
            color:           showRaw ? 'var(--sct-text)' : 'var(--sct-muted)',
          }}
        >
          Raw CDD
        </button>
        <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: '#F7931A' }}>
          <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: '#F7931A' }} />
          90-day MA (always on)
        </span>
      </div>

      <div style={{ position: 'relative', width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            syncId="cycle-master"
            margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
          >
            <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              ticks={yearTicks}
              tickFormatter={fmtYear}
              tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#1E293B' }}
            />

            <YAxis
              tickFormatter={fmtCDD}
              tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              width={56}
            />

            <Tooltip content={<ChartTip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />

            {/* Raw CDD — very faint area */}
            {showRaw && (
              <Area
                type="monotone"
                dataKey="cdd"
                name="cdd"
                stroke="rgba(247,147,26,0.25)"
                strokeWidth={1}
                fill="rgba(247,147,26,0.08)"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* 90-day SMA — solid line */}
            <Line
              type="monotone"
              dataKey="cdd90"
              name="cdd90"
              stroke="#F7931A"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
        <ChartWatermark />
      </div>
    </div>
  );
}
