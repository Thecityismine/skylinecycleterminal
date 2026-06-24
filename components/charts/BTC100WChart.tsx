"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { WeeklyPoint, RegimeSegment } from '@/lib/indicators/weeklyMA';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

// ─── Constants ────────────────────────────────────────────────────────────────

const HALVINGS = [
  { date: '2012-11-26', label: 'H1' },
  { date: '2016-07-04', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-15', label: 'H4' },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtUSD(v: number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

// Return just the year for the first Monday of each year
function xTickFormatter(time: string): string {
  if (time.slice(5, 7) === '01' && parseInt(time.slice(8, 10)) <= 7) {
    return time.slice(0, 4);
  }
  return '';
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

type Visible = { ma50: boolean; ma100: boolean; ma200: boolean };

function ChartTip({ d, visible }: { d: WeeklyPoint; visible: Visible }) {
  const dist = d.distanceFrom100W;
  const distColor = dist == null ? '#94A3B8' : dist >= 0 ? '#35D07F' : '#FF5C5C';
  const regimeLabel = d.trendRegime === 'bullish' ? 'Above Trend'
    : d.trendRegime === 'bearish' ? 'Below Trend'
    : d.trendRegime === 'testing' ? 'Testing Trend'
    : '—';
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs font-mono space-y-1"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p className="font-semibold" style={{ color: '#F8FAFC' }}>{d.time}</p>
      <p style={{ color: '#F7931A' }}>BTC:   <b>{fmtUSD(d.close)}</b></p>
      {visible.ma50  && d.ma50  && <p style={{ color: '#3B82F6' }}>50W:   <b>{fmtUSD(d.ma50)}</b></p>}
      {visible.ma100 && d.ma100 && <p style={{ color: '#EAB84D' }}>100W:  <b>{fmtUSD(d.ma100)}</b></p>}
      {visible.ma200 && d.ma200 && <p style={{ color: '#A855F7' }}>200W:  <b>{fmtUSD(d.ma200)}</b></p>}
      {visible.ma100 && dist != null && (
        <p style={{ color: distColor }}>Dist 100W: <b>{dist >= 0 ? '+' : ''}{dist.toFixed(1)}%</b></p>
      )}
      <p style={{ color: '#4B5563' }}>{regimeLabel}</p>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export type VisibilityState = { show50: boolean; show100: boolean; show200: boolean; showShading: boolean };

type Props = {
  points:  WeeklyPoint[];
  regimes: RegimeSegment[];
  onVisibilityChange?: (v: VisibilityState) => void;
  onZoomChange?: (d: ZoomDomain<string> | null) => void;
};

export function BTC100WChart({ points, regimes, onVisibilityChange, onZoomChange }: Props) {
  const [show50,      setShow50]      = useState(true);
  const [show100,     setShow100]     = useState(true);
  const [show200,     setShow200]     = useState(true);
  const [showShading, setShowShading] = useState(true);

  const visible: Visible = { ma50: show50, ma100: show100, ma200: show200 };

  const {
    domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers,
  } = useChartZoom<string>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  // Apply zoom filter
  const chartData = useMemo(() => {
    if (!domain) return points;
    return points.filter(d => d.time >= domain.start && d.time <= domain.end);
  }, [points, domain]);

  const prices   = chartData.map((p) => p.close).filter((v) => v > 0);
  const pMin     = prices.length ? Math.max(0.01, Math.min(...prices) * 0.4) : 0.01;
  const pMax     = prices.length ? Math.max(...prices) * 2.5  : 1_000_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const allTimes   = points.map((p) => p.time);
  const xTickTimes = allTimes.filter((t) => xTickFormatter(t) !== '');

  const regimeColor = (r: RegimeSegment['regime']) =>
    r === 'bullish' ? '#35D07F' : r === 'bearish' ? '#FF5C5C' : '#E6B450';

  // Toggle button rows: lines (clickable) + shading + static shading legend
  const lineToggles: Array<{
    key: keyof Visible | 'shading';
    color: string;
    label: string;
    lineW?: number;
    active: boolean;
    onToggle: () => void;
  }> = [
    { key: 'ma200',   color: '#A855F7', label: '200W MA',      lineW: 1.5, active: show200,     onToggle: () => { const n = !show200;      setShow200(n);      onVisibilityChange?.({ show50, show100, show200: n,     showShading }); } },
    { key: 'ma50',    color: '#3B82F6', label: '50W MA',       lineW: 1.5, active: show50,      onToggle: () => { const n = !show50;       setShow50(n);       onVisibilityChange?.({ show50: n,   show100, show200,      showShading }); } },
    { key: 'ma100',   color: '#EAB84D', label: '100W MA',      lineW: 2.5, active: show100,     onToggle: () => { const n = !show100;      setShow100(n);      onVisibilityChange?.({ show50, show100: n,   show200,      showShading }); } },
    { key: 'shading', color: '#35D07F', label: 'Trend shading',            active: showShading, onToggle: () => { const n = !showShading;   setShowShading(n);  onVisibilityChange?.({ show50, show100,      show200,      showShading: n }); } },
  ];

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* ── Legend + toggles (above chart) ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mb-3">
        {/* BTC Price — always on, not a button */}
        <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono" style={{ color: '#F7931A' }}>
          <span className="rounded-full" style={{ width: 16, height: 2, backgroundColor: '#F7931A', display: 'inline-block' }} />
          BTC Price
        </span>

        {/* Toggleable items */}
        {lineToggles.map((t) => (
          <button
            key={t.key}
            onClick={t.onToggle}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono border transition-all"
            style={{
              borderColor:     t.active ? `${t.color}50` : 'var(--sct-border)',
              backgroundColor: t.active ? `${t.color}10` : 'transparent',
              color:           t.active ? t.color : 'var(--sct-muted)',
              opacity:         t.active ? 1 : 0.5,
            }}
            title={t.active ? `Hide ${t.label}` : `Show ${t.label}`}
          >
            {t.key === 'shading' ? (
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color, opacity: t.active ? 0.3 : 0.15 }} />
            ) : (
              <span
                className="rounded-full"
                style={{ width: 16, height: t.lineW ?? 2, backgroundColor: t.color, display: 'inline-block' }}
              />
            )}
            {t.label}
          </button>
        ))}

        {/* Static shading legend */}
        {showShading && (
          <span className="flex items-center gap-3 ml-2 pl-2 text-xs font-mono" style={{ borderLeft: '1px solid var(--sct-border)' }}>
            {[
              { color: '#35D07F', label: 'Above' },
              { color: '#E6B450', label: '±5%' },
              { color: '#FF5C5C', label: 'Below' },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-1" style={{ color: s.color }}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color, opacity: 0.25 }} />
                {s.label}
              </span>
            ))}
          </span>
        )}

        {/* Zoom controls */}
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

      <div
        style={{
          position: 'relative', width: '100%', height: 480,
          cursor: isSelecting ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
        onMouseLeave={cancel}
      >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 4 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

          {/* ── Regime shading ──────────────────────────────────────────── */}
          {showShading && regimes.map((seg, i) => (
            <ReferenceArea
              key={i}
              x1={seg.start}
              x2={seg.end}
              fill={regimeColor(seg.regime)}
              fillOpacity={0.055}
              stroke="none"
              ifOverflow="hidden"
            />
          ))}

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

          {/* ── Halving markers ─────────────────────────────────────────── */}
          {HALVINGS.map((h) => (
            <ReferenceLine
              key={h.date}
              x={mondayOn(h.date, allTimes)}
              stroke="#374151"
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

          <XAxis
            dataKey="time"
            ticks={xTickTimes}
            tickFormatter={(v: string) => v.slice(0, 4)}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            interval="preserveStartEnd"
          />

          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={64}
            allowDataOverflow
          />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const d = (payload[0] as any).payload as WeeklyPoint;
              return <ChartTip d={d} visible={visible} />;
            }}
            cursor={isSelecting ? false : { stroke: '#334155', strokeWidth: 1 }}
          />

          {/* ── MAs — drawn bottom to top so price is always on top ─────── */}
          {show200 && (
            <Line dataKey="ma200" stroke="#A855F7" strokeWidth={1.5}
              dot={false} connectNulls isAnimationActive={false} name="200W MA" />
          )}
          {show50 && (
            <Line dataKey="ma50" stroke="#3B82F6" strokeWidth={1.5}
              dot={false} connectNulls isAnimationActive={false} name="50W MA" />
          )}
          {show100 && (
            <Line dataKey="ma100" stroke="#EAB84D" strokeWidth={2.5}
              dot={false} connectNulls isAnimationActive={false} name="100W MA" />
          )}
          <Line dataKey="close" stroke="#F7931A" strokeWidth={2}
            dot={false} connectNulls isAnimationActive={false} name="BTC Price" />
        </ComposedChart>
      </ResponsiveContainer>

      <ChartWatermark />
      </div>
    </div>
  );
}

// Find the closest monday in `allTimes` to a given date string.
function mondayOn(date: string, allTimes: string[]): string {
  const target = new Date(date + 'T00:00:00Z').getTime();
  return allTimes.reduce((best, t) =>
    Math.abs(new Date(t).getTime() - target) < Math.abs(new Date(best).getTime() - target) ? t : best
  );
}
