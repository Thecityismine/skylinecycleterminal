"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { RealizedPricePoint } from '@/lib/api/coinmetrics';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';
import { formatDateTick, spanDays } from '@/lib/charts/axisFormat';

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
  // Full-history log ticks reach down to cents (BTC's series starts at $0.05),
  // where the raw value would print as "$0.050540618351841".
  if (v >= 1)         return `$${Math.round(v)}`;
  return `$${v.toFixed(2)}`;
}

// fmtX moved to lib/charts/axisFormat so this chart and its share card cannot
// drift apart. It now takes the visible span, giving day precision on short
// windows rather than repeating one month label across every tick.

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
  onPeriodChange,
  onZoomChange,
  onLogScaleChange,
  shareButton,
}: {
  data: RealizedPricePoint[];
  realizedAvailable: boolean;
  secondaryLabel?: string;
  secondaryColor?: string;
  onPeriodChange?: (period: string) => void;
  onZoomChange?: (d: ZoomDomain<string> | null) => void;
  /** Lifted alongside period and zoom so the share card can mirror the axis the
   *  reader is actually looking at, rather than defaulting to a different one. */
  onLogScaleChange?: (logScale: boolean) => void;
  shareButton?: React.ReactNode;
}) {
  // Defaults to the full history on a log axis: across BTC's whole range a
  // linear axis flattens every pre-2020 cycle into the baseline, which is
  // exactly where the price-vs-200W-MA relationship is most readable.
  const [period, setPeriod] = useState<string>('All');
  const [logScale, setLogScale] = useState(true);

  const {
    domain, isZoomed, isSelecting, selectionArea, reset, cancel, chartHandlers,
  } = useChartZoom<string>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  function handlePeriodChange(p: string) {
    setPeriod(p);
    onPeriodChange?.(p);
    reset();
  }

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

  const chartData = useMemo(() => {
    if (!domain) return sampled;
    return sampled.filter(d => d.time >= domain.start && d.time <= domain.end);
  }, [sampled, domain]);

  // Measured from what is actually plotted, so zooming into an arbitrary region
  // gets the right tick precision rather than the precision of the preset period.
  const xSpan = useMemo(() => spanDays(chartData.map((d) => d.time)), [chartData]);

  return (
    <div
      className="rounded-xl border p-6"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Header row.
        *
        * Every flex row here wraps. Unwrapped, the legend, share button and period
        * selector sit on one line that measures wider than a 375px viewport, and
        * because nothing clips it the overflow widens the whole document — which is
        * what makes the page title appear cut off on the left and the period buttons
        * run off the right on a phone. The visible symptom is at the top of the page;
        * the cause is this row. */}
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 rounded shrink-0" style={{ backgroundColor: '#F7931A' }} />
            <span className="text-xs font-mono" style={{ color: '#F7931A' }}>BTC Price</span>
          </div>
          {realizedAvailable && (
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 rounded shrink-0" style={{ backgroundColor: secondaryColor }} />
              <span className="text-xs font-mono" style={{ color: secondaryColor }}>{secondaryLabel}</span>
            </div>
          )}
        </div>

        {/* Share button + period selector */}
        <div className="flex flex-wrap items-center gap-2">
          {shareButton}
          <div className="flex flex-wrap items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePeriodChange(p.label)}
              className="px-3 py-1 text-xs font-mono rounded transition-all duration-150"
              style={{
                backgroundColor: period === p.label && !isZoomed ? 'var(--sct-border)' : 'transparent',
                color: period === p.label && !isZoomed ? 'var(--sct-text)' : 'var(--sct-muted)',
                border: `1px solid ${period === p.label && !isZoomed ? 'var(--sct-border)' : 'transparent'}`,
              }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setLogScale((v) => { onLogScaleChange?.(!v); return !v; })}
            title={logScale ? 'Switch to linear scale' : 'Switch to log scale'}
            className="px-3 py-1 text-xs font-mono rounded transition-all duration-150"
            style={{
              backgroundColor: logScale ? 'var(--sct-border)' : 'transparent',
              color: logScale ? 'var(--sct-text)' : 'var(--sct-muted)',
              border: `1px solid ${logScale ? 'var(--sct-border)' : 'transparent'}`,
            }}
          >
            Log
          </button>
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
        </div>
      </div>

      {/* Chart */}
      <div
        style={{
          position: 'relative', width: '100%', height: 420,
          cursor: isSelecting ? 'crosshair' : 'default',
          userSelect: 'none',
        }}
        onMouseLeave={cancel}
      >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.6} />

          <XAxis
            dataKey="time"
            tickFormatter={(d: string) => formatDateTick(d, xSpan)}
            tick={{ fill: '#4B5563', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={80}
            interval="preserveStartEnd"
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={58}
          />

          <Tooltip
            content={<ChartTooltip realizedAvailable={realizedAvailable} secondaryLabel={secondaryLabel} secondaryColor={secondaryColor} />}
            cursor={isSelecting ? false : { stroke: '#1E293B', strokeWidth: 1 }}
          />

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
          {realizedAvailable && chartData.at(-1)?.realized != null && (
            <ReferenceLine
              y={chartData.at(-1)!.realized!}
              stroke={secondaryColor}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
      </div>

      {!realizedAvailable && (
        <p className="mt-3 text-xs text-center" style={{ color: 'var(--sct-muted)' }}>
          Realized Price requires <span style={{ color: 'var(--sct-secondary)' }}>CapRealUSD</span> from
          CoinMetrics Pro. Upgrade to unlock the second line.
        </p>
      )}
    </div>
  );
}
