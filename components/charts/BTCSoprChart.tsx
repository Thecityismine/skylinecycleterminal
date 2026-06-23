"use client";

import { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { SoprPoint } from '@/lib/indicators/sopr';
import { SOPR_REGIME_BANDS } from '@/lib/indicators/sopr';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

// ─── Constants ────────────────────────────────────────────────────────────────

const HALVINGS = [
  { date: '2012-11-28', label: 'H1' },
  { date: '2016-07-09', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-19', label: 'H4' },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtUSD(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function xTick(time: string): string {
  const month = time.slice(5, 7);
  const day   = parseInt(time.slice(8, 10));
  if (month === '01' && day <= 7) return time.slice(0, 4);
  return '';
}

// Find the date in the dataset closest to a target string
function closestDate(target: string, dates: string[]): string {
  const t = new Date(target).getTime();
  return dates.reduce((best, d) =>
    Math.abs(new Date(d).getTime() - t) < Math.abs(new Date(best).getTime() - t) ? d : best
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function SoprTip({ d, showSma30, showSma90, showPrice }: {
  d: SoprPoint;
  showSma30: boolean;
  showSma90: boolean;
  showPrice: boolean;
}) {
  const dev   = d.soprDeviation;
  const color = dev >= 0 ? '#35D07F' : '#F85149';
  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-xs font-mono space-y-1"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}
    >
      <p className="font-semibold" style={{ color: '#F8FAFC' }}>{d.time}</p>
      {showPrice && (
        <p style={{ color: '#E6EDF3' }}>Price: <b>{fmtUSD(d.btcClose)}</b></p>
      )}
      <p style={{ color }}>MVRV: <b>{d.rawSopr.toFixed(3)}</b></p>
      <p style={{ color }}>Deviation: <b>{dev >= 0 ? '+' : ''}{dev.toFixed(3)}</b></p>
      {showSma30 && d.sma30 != null && (
        <p style={{ color: '#F2B84B' }}>30D Avg: <b>{d.sma30.toFixed(3)}</b></p>
      )}
      {showSma90 && d.sma90 != null && (
        <p style={{ color: '#3B82F6' }}>90D Avg: <b>{d.sma90.toFixed(3)}</b></p>
      )}
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

type Props = {
  points:               SoprPoint[];
  onShowPriceChange?:   (v: boolean) => void;
  onShowSma30Change?:   (v: boolean) => void;
  onShowSma90Change?:   (v: boolean) => void;
  onShowShadingChange?: (v: boolean) => void;
};

export function BTCSoprChart({ points, onShowPriceChange, onShowSma30Change, onShowSma90Change, onShowShadingChange }: Props) {
  const [showPrice,   setShowPrice]   = useState(true);
  const [showSma30,   setShowSma30]   = useState(false);
  const [showSma90,   setShowSma90]   = useState(true);
  const [showShading, setShowShading] = useState(true);

  const dates    = useMemo(() => points.map((p) => p.time), [points]);
  const xTicks   = useMemo(() => dates.filter((d) => xTick(d) !== ''), [dates]);

  const prices   = useMemo(() => points.map((p) => p.btcClose).filter((v) => v > 0), [points]);
  const pMin     = prices.length ? Math.max(0.01, Math.min(...prices) * 0.5) : 0.01;
  const pMax     = prices.length ? Math.max(...prices) * 2.0 : 1_000_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const halvingDates = useMemo(
    () => HALVINGS.map((h) => ({ ...h, closest: closestDate(h.date, dates) })),
    [dates]
  );

  const toggles = [
    { key: 'price',   color: '#E6EDF3', label: 'BTC Price',      active: showPrice,   onToggle: () => { const n = !showPrice;   setShowPrice(n);   onShowPriceChange?.(n);   } },
    { key: 'sma30',   color: '#F2B84B', label: '30D Average',    active: showSma30,   onToggle: () => { const n = !showSma30;   setShowSma30(n);   onShowSma30Change?.(n);   } },
    { key: 'sma90',   color: '#3B82F6', label: '90D Average',    active: showSma90,   onToggle: () => { const n = !showSma90;   setShowSma90(n);   onShowSma90Change?.(n);   } },
    { key: 'shading', color: '#35D07F', label: 'Regime shading', active: showShading, onToggle: () => { const n = !showShading; setShowShading(n); onShowShadingChange?.(n); } },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Toggle row */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mb-3">
        {/* Static legend: bars */}
        <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono" style={{ color: '#94A3B8' }}>
          <span className="flex gap-0.5">
            <span className="rounded-sm" style={{ width: 6, height: 14, backgroundColor: '#35D07F', opacity: 0.8, display: 'inline-block' }} />
            <span className="rounded-sm" style={{ width: 6, height: 14, backgroundColor: '#F85149', opacity: 0.8, display: 'inline-block' }} />
          </span>
          MVRV Deviation
        </span>

        {toggles.map((t) => (
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
              <span className="rounded-full" style={{ width: 16, height: 2, backgroundColor: t.color, display: 'inline-block' }} />
            )}
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ position: 'relative', width: '100%', height: 500 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 72, bottom: 0, left: 4 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

            {/* Regime background bands */}
            {showShading && SOPR_REGIME_BANDS.map((b, i) => (
              <ReferenceArea
                key={i}
                yAxisId="sopr"
                y1={b.y1}
                y2={b.y2}
                fill={b.fill}
                fillOpacity={b.opacity}
                stroke="none"
                ifOverflow="hidden"
              />
            ))}

            {/* Halving markers */}
            {halvingDates.map((h) => (
              <ReferenceLine
                key={h.label}
                yAxisId="sopr"
                x={h.closest}
                stroke="#374151"
                strokeDasharray="3 5"
                strokeWidth={1}
                label={{ value: h.label, position: 'insideTopRight', fill: '#4B5563', fontSize: 9, fontFamily: 'monospace' }}
              />
            ))}

            {/* Break-even reference line */}
            <ReferenceLine
              yAxisId="sopr"
              y={0}
              stroke="#6F7A86"
              strokeWidth={1.5}
              strokeDasharray="0"
              label={{ value: '1.0', position: 'left', fill: '#6F7A86', fontSize: 10, fontFamily: 'monospace' }}
            />

            <XAxis
              dataKey="time"
              ticks={xTicks}
              tickFormatter={(v: string) => v.slice(0, 4)}
              tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#1E293B' }}
              interval="preserveStartEnd"
            />

            {/* Left: MVRV deviation */}
            <YAxis
              yAxisId="sopr"
              orientation="left"
              tickFormatter={(v: number) => v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
              tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
              width={52}
            />

            {/* Right: BTC price (log) */}
            <YAxis
              yAxisId="price"
              orientation="right"
              scale="log"
              domain={[pMin, pMax]}
              ticks={logTicks}
              tickFormatter={fmtPrice}
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
                const d = (payload[0] as any).payload as SoprPoint;
                return <SoprTip d={d} showSma30={showSma30} showSma90={showSma90} showPrice={showPrice} />;
              }}
              cursor={{ stroke: '#334155', strokeWidth: 1 }}
            />

            {/* MVRV deviation bars */}
            <Bar yAxisId="sopr" dataKey="soprDeviation" isAnimationActive={false} maxBarSize={2}>
              {points.map((p, i) => (
                <Cell
                  key={i}
                  fill={p.soprDeviation >= 0 ? '#35D07F' : '#F85149'}
                  fillOpacity={0.80}
                />
              ))}
            </Bar>

            {/* SMAs on left axis */}
            {showSma30 && (
              <Line
                yAxisId="sopr"
                dataKey="sma30"
                stroke="#F2B84B"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {showSma90 && (
              <Line
                yAxisId="sopr"
                dataKey="sma90"
                stroke="#3B82F6"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {/* BTC price on right axis */}
            {showPrice && (
              <Line
                yAxisId="price"
                dataKey="btcClose"
                stroke="#E6EDF3"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
                opacity={0.7}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        <ChartWatermark />
      </div>
    </div>
  );
}
