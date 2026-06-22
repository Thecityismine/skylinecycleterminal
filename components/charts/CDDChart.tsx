"use client";

import { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
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

// ─── MVRV Zone config ─────────────────────────────────────────────────────────

const MVRV_ZONES = [
  { y1: 0,   y2: 1.0, fill: '#3B82F6', label: '<1.0 Capitulation'  },
  { y1: 1.0, y2: 2.0, fill: '#35D07F', label: '1.0–2.0 Accumulation' },
  { y1: 2.0, y2: 3.5, fill: '#E6B450', label: '2.0–3.5 Expansion'  },
  { y1: 3.5, y2: 8.0, fill: '#FF5C5C', label: '>3.5 Distribution'  },
];

const MVRV_REF_LINES = [
  { y: 1.0, label: '1.0',  stroke: '#3B82F6' },
  { y: 2.0, label: '2.0',  stroke: '#94A3B8' },
  { y: 3.5, label: '3.5',  stroke: '#E6B450' },
];

// ─── MVRV Tooltip ─────────────────────────────────────────────────────────────

function MVRVTip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length || label == null) return null;
  const mvrv = payload.find((p) => p.name === 'mvrv')?.value ?? null;

  const zone =
    mvrv == null ? '—'
    : mvrv < 1.0 ? 'Capitulation'
    : mvrv < 2.0 ? 'Accumulation'
    : mvrv < 3.5 ? 'Expansion / Elevated'
    : 'Distribution';

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs font-mono space-y-1"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p style={{ color: '#4B5563' }}>{fmtFull(label)}</p>
      {mvrv != null && (
        <>
          <p style={{ color: '#A78BFA' }}>MVRV: <b>{mvrv.toFixed(3)}×</b></p>
          <p style={{ color: '#4B5563' }}>{zone}</p>
        </>
      )}
    </div>
  );
}

// ─── CDD Tooltip ──────────────────────────────────────────────────────────────

function CDDTip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length || label == null) return null;
  const cdd   = payload.find((p) => p.name === 'cdd')?.value ?? null;
  const cdd90 = payload.find((p) => p.name === 'cdd90')?.value ?? null;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs font-mono space-y-1"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p style={{ color: '#4B5563' }}>{fmtFull(label)}</p>
      {cdd   != null && <p style={{ color: 'rgba(247,147,26,0.4)' }}>CDD Raw:    <b>{fmtCDD(cdd)}</b></p>}
      {cdd90 != null && <p style={{ color: '#F7931A' }}>CDD 90d MA: <b>{fmtCDD(cdd90)}</b></p>}
    </div>
  );
}

// ─── MVRV Chart (fallback when CDD unavailable) ───────────────────────────────

function MVRVChart({ data }: { data: CycleMasterPoint[] }) {
  const mvrvData = useMemo(
    () => data
      .filter((d) => d.realized != null && d.realized > 0)
      .map((d) => ({ ts: d.ts, mvrv: d.price / d.realized! })),
    [data],
  );

  const yearTicks = useMemo(() => {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const d of mvrvData) {
      const yr = new Date(d.ts).getUTCFullYear();
      if (!seen.has(yr)) { seen.add(yr); out.push(d.ts); }
    }
    return out;
  }, [mvrvData]);

  const latest = mvrvData.at(-1);

  return (
    <div>
      {latest && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>Current MVRV:</span>
          <span
            className="px-2.5 py-0.5 rounded text-xs font-mono border"
            style={{
              color: '#A78BFA',
              borderColor: '#A78BFA40',
              backgroundColor: '#A78BFA10',
            }}
          >
            {latest.mvrv.toFixed(3)}×
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
            {latest.mvrv < 1.0 ? '— below cost basis (capitulation zone)'
             : latest.mvrv < 2.0 ? '— accumulation zone'
             : latest.mvrv < 3.5 ? '— expansion / elevated'
             : '— distribution risk'}
          </span>
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={mvrvData}
            margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
          >
            <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

            {/* Zone bands */}
            {MVRV_ZONES.map((z) => (
              <ReferenceArea
                key={z.label}
                y1={z.y1}
                y2={z.y2}
                fill={z.fill}
                fillOpacity={0.06}
                ifOverflow="extendDomain"
              />
            ))}

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
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
              tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              width={46}
              domain={[0, 'auto']}
            />

            <Tooltip content={<MVRVTip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />

            {/* Reference lines at key MVRV levels */}
            {MVRV_REF_LINES.map((r) => (
              <ReferenceLine
                key={r.y}
                y={r.y}
                stroke={r.stroke}
                strokeDasharray="3 5"
                strokeWidth={1}
                label={{
                  value: r.label,
                  position: 'insideTopRight',
                  fill: r.stroke,
                  fontSize: 9,
                  fontFamily: 'monospace',
                }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="mvrv"
              name="mvrv"
              stroke="#A78BFA"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
        <ChartWatermark />
      </div>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
        {MVRV_ZONES.map((z) => (
          <span key={z.label} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: z.fill }}>
            <span className="inline-block w-3 h-3 rounded-sm opacity-60" style={{ backgroundColor: z.fill }} />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function CDDChart({ data }: { data: CycleMasterPoint[] }) {
  const [showRaw, setShowRaw] = useState(true);

  const hasCDD = useMemo(
    () => data.some((d) => d.cdd != null || d.cdd90 != null),
    [data],
  );

  const hasRealized = useMemo(
    () => data.some((d) => d.realized != null && d.realized > 0),
    [data],
  );

  // Year ticks (for CDD chart)
  const yearTicks = useMemo(() => {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const d of data) {
      const yr = new Date(d.ts).getUTCFullYear();
      if (!seen.has(yr)) { seen.add(yr); out.push(d.ts); }
    }
    return out;
  }, [data]);

  // No CDD → show MVRV as fallback
  if (!hasCDD) {
    if (hasRealized) return <MVRVChart data={data} />;
    return (
      <div
        className="h-64 flex flex-col items-center justify-center rounded-lg border gap-2"
        style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
      >
        <p className="text-sm font-mono">On-chain data unavailable</p>
        <p className="text-xs">MVRV requires Realized Price from CoinMetrics.</p>
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

            <Tooltip content={<CDDTip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />

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
