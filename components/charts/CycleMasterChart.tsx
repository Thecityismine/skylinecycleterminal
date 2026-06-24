"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { CycleMasterPoint } from '@/lib/indicators/cycleMaster';
import { scoreCycleMaster } from '@/lib/indicators/cycleMaster';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

// ─── Types & constants ────────────────────────────────────────────────────────

type Props = {
  data: CycleMasterPoint[];
  logScale?: boolean;
  onRangeChange?: (r: Range) => void;
  onLogChange?:   (log: boolean) => void;
  onZoomChange?:  (d: ZoomDomain<number> | null) => void;
};

export type Range = '4Y' | '8Y' | 'All';
const RANGES: Range[] = ['4Y', '8Y', 'All'];
const DAYS: Record<Range, number> = { '4Y': 1460, '8Y': 2920, 'All': Infinity };

const HALVINGS = [
  { date: '2012-11-28', label: 'H1' },
  { date: '2016-07-09', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-19', label: 'H4' },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtYear(ts: number): string {
  return new Date(ts).getUTCFullYear().toString();
}

function fmtFull(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length || label == null) return null;

  const get = (name: string) => payload.find((p) => p.name === name)?.value ?? null;
  const price      = get('price');
  const realized   = get('realized');
  const transferred = get('transferred');
  const terminal   = get('terminal');
  const balance    = get('balance');

  // Build a fake point for scoring
  const fakePoint: CycleMasterPoint = {
    time: new Date(label).toISOString().slice(0, 10),
    ts: label,
    price: price ?? 0,
    realized, transferred, terminal, balance,
    cdd: null, cdd90: null,
  };
  const { zone, label: zoneLabel, color: zoneColor } = price
    ? scoreCycleMaster(fakePoint)
    : { zone: 'expansion', label: 'Expansion', color: '#94A3B8' };

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs font-mono space-y-1"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p className="pb-1" style={{ color: '#4B5563' }}>{fmtFull(label)}</p>
      {price      != null && <p style={{ color: '#F7931A' }}>Price:       <b>{fmtUSD(price)}</b></p>}
      {terminal   != null && <p style={{ color: '#FF5C68' }}>Terminal:    <b>{fmtUSD(terminal)}</b></p>}
      {transferred != null && <p style={{ color: '#EAB84D' }}>Transferred: <b>{fmtUSD(transferred)}</b></p>}
      {realized   != null && <p style={{ color: '#3B82F6' }}>Realized:    <b>{fmtUSD(realized)}</b></p>}
      {balance    != null && <p style={{ color: '#35D07F' }}>Balance:     <b>{fmtUSD(balance)}</b></p>}
      <p className="pt-0.5 border-t" style={{ borderColor: '#1E293B', color: zoneColor }}>
        Zone: {zoneLabel}
      </p>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function CycleMasterChart({ data, logScale = true, onRangeChange, onLogChange, onZoomChange }: Props) {
  const [range, setRange] = useState<Range>('All');
  const [log, setLog]     = useState(logScale);

  const {
    domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers,
  } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  const displayed = useMemo(() => {
    const days = DAYS[range];
    if (days === Infinity) return data;
    const cutoff = Date.now() - days * 86_400_000;
    return data.filter((d) => d.ts >= cutoff);
  }, [data, range]);

  const chartData = useMemo(() => {
    if (!domain) return displayed;
    return displayed.filter(d => d.ts >= domain.start && d.ts <= domain.end);
  }, [displayed, domain]);

  // Compute domain for log scale
  const prices = chartData.map((d) => d.price).filter((v): v is number => v > 0);
  const pMin   = log && prices.length ? Math.max(0.1, Math.min(...prices) * 0.5) : 'auto';
  const pMax   = prices.length ? Math.max(...prices) * 2.5 : 'auto';

  // Only show log ticks that fall within domain
  const pMaxNum = typeof pMax === 'number' ? pMax : Infinity;
  const logTicksFiltered = log && typeof pMin === 'number'
    ? LOG_TICKS.filter((t) => t >= (pMin as number) && t <= pMaxNum)
    : undefined;

  // Year tick values from data
  const yearTicks = useMemo(() => {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const d of chartData) {
      const yr = new Date(d.ts).getUTCFullYear();
      if (!seen.has(yr)) { seen.add(yr); out.push(d.ts); }
    }
    return out;
  }, [chartData]);

  return (
    <div>
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Range buttons */}
        <div className="flex items-center gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => { setRange(r); onRangeChange?.(r); reset(); }}
              className="px-3 py-1 rounded text-xs font-mono border transition-all"
              style={{
                backgroundColor: range === r && !isZoomed ? 'var(--sct-border)' : 'transparent',
                borderColor:     'var(--sct-border)',
                color:           range === r && !isZoomed ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {r}
            </button>
          ))}
          {isZoomed && (
            <button onClick={reset} className="px-3 py-1 rounded text-xs font-mono border transition-all"
              style={{ backgroundColor: 'rgba(247,147,26,0.12)', borderColor: '#F7931A', color: '#F7931A' }}>
              Reset Zoom
            </button>
          )}
          {!isZoomed && (
            <span className="hidden md:inline text-[10px] font-mono ml-1" style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
              drag to zoom
            </span>
          )}
        </div>

        {/* Legend + log toggle */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {[
            { label: 'Price',        color: '#F7931A' },
            { label: 'Terminal',     color: '#FF5C68' },
            { label: 'Transferred',  color: '#EAB84D' },
            { label: 'Realized',     color: '#3B82F6' },
            { label: 'Balance',      color: '#35D07F' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs font-mono" style={{ color: l.color }}>
              <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: l.color }} />
              {l.label}
            </span>
          ))}
          <button
            onClick={() => { setLog((v) => { const next = !v; onLogChange?.(next); return next; }); }}
            className="ml-2 px-2.5 py-0.5 rounded text-xs font-mono border transition-all"
            style={{
              backgroundColor: log ? 'var(--sct-border)' : 'transparent',
              borderColor:     'var(--sct-border)',
              color:           log ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            LOG
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div
        style={{
          position: 'relative', width: '100%', height: 480,
          cursor: isSelecting ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
        onMouseLeave={cancel}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            syncId="cycle-master"
            margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
            {...chartHandlers}
          >
            <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

            {/* Drag-to-zoom selection rectangle */}
            {selectionArea && (
              <ReferenceArea
                x1={selectionArea.x1}
                x2={selectionArea.x2}
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
              />
            )}

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
              scale={log ? 'log' : 'linear'}
              domain={log ? [pMin, pMax] : ['auto', 'auto']}
              ticks={log ? logTicksFiltered : undefined}
              tickFormatter={fmtUSD}
              tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              width={64}
              allowDataOverflow
            />

            <Tooltip
              content={<ChartTip />}
              cursor={isSelecting ? false : { stroke: '#1E293B', strokeWidth: 1 }}
            />

            {/* Shaded areas — drawn before lines so lines sit on top */}
            {/* balance → realized band (blue-green) */}
            <Area
              type="monotone"
              dataKey="realized"
              name="_realizedFill"
              stroke="none"
              fill="#3B82F620"
              fillOpacity={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
              legendType="none"
            />
            {/* realized → transferred band */}
            <Area
              type="monotone"
              dataKey="transferred"
              name="_transferredFill"
              stroke="none"
              fill="#94A3B810"
              fillOpacity={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
              legendType="none"
            />
            {/* transferred → terminal band */}
            <Area
              type="monotone"
              dataKey="terminal"
              name="_terminalFill"
              stroke="none"
              fill="#EAB84D10"
              fillOpacity={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
              legendType="none"
            />

            {/* Lines — bottom to top visually */}
            <Line
              type="monotone"
              dataKey="balance"
              name="balance"
              stroke="#35D07F"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="realized"
              name="realized"
              stroke="#3B82F6"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="transferred"
              name="transferred"
              stroke="#EAB84D"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="price"
              name="price"
              stroke="#F7931A"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="terminal"
              name="terminal"
              stroke="#FF5C68"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />

            {/* Halving reference lines */}
            {HALVINGS.map((h) => (
              <ReferenceLine
                key={h.date}
                x={new Date(h.date + 'T00:00:00Z').getTime()}
                stroke="#4B5563"
                strokeDasharray="3 5"
                strokeWidth={1}
                label={{
                  value: h.label,
                  position: 'insideTopRight',
                  fill: '#4B5563',
                  fontSize: 9,
                  fontFamily: 'monospace',
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <ChartWatermark />
      </div>
    </div>
  );
}
