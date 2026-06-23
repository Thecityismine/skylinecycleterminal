"use client";

import { useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { HodlWavePoint } from '@/lib/indicators/exchangeReserve';
import { HALVINGS_WITH_EXCHANGE, HODL_CYCLE_EVENTS } from '@/lib/indicators/exchangeReserve';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = {
  points:                HodlWavePoint[];
  range?:                '4y' | '8y' | 'all';
  onShowPriceChange?:    (v: boolean) => void;
  onShow30dChange?:      (v: boolean) => void;
  onShow90dChange?:      (v: boolean) => void;
  onShowHalvingsChange?: (v: boolean) => void;
  onShowEventsChange?:   (v: boolean) => void;
};

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtPct(v: number): string { return `${v.toFixed(1)}%`; }

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: HodlWavePoint = payload[0]?.payload;
  if (!d) return null;

  const ppChange = d.change90d;

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[210px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>Exchange Reserve</span>
          <span className="text-sm font-mono font-bold" style={{ color: '#F7931A' }}>
            {d.exchPct.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC on Exchanges</span>
          <span className="text-xs font-mono" style={{ color: 'var(--sct-secondary)' }}>
            {d.exchBtc.toLocaleString(undefined, { maximumFractionDigits: 0 })} BTC
          </span>
        </div>
        {ppChange != null && (
          <div className="flex justify-between gap-6">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>90D Change</span>
            <span
              className="text-xs font-mono"
              style={{ color: ppChange > 0 ? '#FF5C5C' : '#35D07F' }}
            >
              {ppChange > 0 ? '+' : ''}{ppChange.toFixed(2)} pp
            </span>
          </div>
        )}
        <div
          className="flex justify-between gap-6 pt-1 mt-1 border-t"
          style={{ borderColor: 'var(--sct-border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Price</span>
          <span className="text-xs font-mono font-bold" style={{ color: 'rgba(230,237,243,0.8)' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.btcClose)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BTCHodlWaveChart({ points, range = 'all', onShowPriceChange, onShow30dChange, onShow90dChange, onShowHalvingsChange, onShowEventsChange }: Props) {
  const [showPrice,    setShowPrice]    = useState(true);
  const [show30d,      setShow30d]      = useState(false);
  const [show90d,      setShow90d]      = useState(true);
  const [showHalvings, setShowHalvings] = useState(true);
  const [showEvents,   setShowEvents]   = useState(true);

  if (!points.length) return null;

  // Date range filter
  const cutoff = range === 'all' ? 0
    : range === '8y' ? Date.now() - 8 * 365.25 * 86_400_000
    :                  Date.now() - 4 * 365.25 * 86_400_000;

  const filtered = cutoff
    ? points.filter((p) => new Date(p.time + 'T00:00:00').getTime() >= cutoff)
    : points;

  const prices   = filtered.map((p) => p.btcClose).filter((v) => v > 0);
  const pMin     = prices.length ? Math.max(1, Math.min(...prices) * 0.6) : 1;
  const pMax     = prices.length ? Math.max(...prices) * 2.5 : 200_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const exchPcts   = filtered.map((p) => p.exchPct).filter((v) => v > 0);
  const yMin       = exchPcts.length ? Math.max(0, Math.min(...exchPcts) * 0.85) : 5;
  const yMax       = exchPcts.length ? Math.max(...exchPcts) * 1.15 : 30;

  const cutoffTs = cutoff || 0;

  // Buttons
  const toggleBtn = (active: boolean, label: string, onClick: () => void, color = '#F7931A') => (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded text-[10px] font-mono transition-all border"
      style={{
        backgroundColor: active ? `${color}20` : 'transparent',
        borderColor:     active ? color : 'var(--sct-border)',
        color:           active ? color : 'var(--sct-muted)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Toggles */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {toggleBtn(showPrice,    'BTC Price',    () => { const n = !showPrice;    setShowPrice(n);    onShowPriceChange?.(n);    }, '#E6EDF3')}
          {toggleBtn(show30d,      '30D SMA',      () => { const n = !show30d;      setShow30d(n);      onShow30dChange?.(n);      }, '#F2B84B')}
          {toggleBtn(show90d,      '90D SMA',      () => { const n = !show90d;      setShow90d(n);      onShow90dChange?.(n);      }, '#3B82F6')}
          {toggleBtn(showHalvings, 'Halvings',     () => { const n = !showHalvings; setShowHalvings(n); onShowHalvingsChange?.(n); }, 'rgba(255,255,255,0.4)')}
          {toggleBtn(showEvents,   'Cycle Events', () => { const n = !showEvents;   setShowEvents(n);   onShowEventsChange?.(n);   }, '#6B7280')}
        </div>
        <p className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
          ↓ Falling exchange supply = more coins in cold storage = LTH accumulation
        </p>
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={filtered} margin={{ top: 8, right: 68, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Halvings */}
          {showHalvings && HALVINGS_WITH_EXCHANGE
            .filter((h) => h.ts >= cutoffTs)
            .map((h) => (
              <ReferenceLine
                key={h.label}
                yAxisId="exch"
                x={h.ts}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="4 5"
                label={{
                  value: h.label,
                  position: 'insideTopRight',
                  fill: 'rgba(255,255,255,0.25)',
                  fontSize: 9,
                }}
              />
            ))}

          {/* Cycle events */}
          {showEvents && HODL_CYCLE_EVENTS
            .filter((e) => new Date(e.time + 'T00:00:00').getTime() >= cutoffTs)
            .map((e) => (
              <ReferenceLine
                key={e.time}
                yAxisId="exch"
                x={new Date(e.time + 'T00:00:00').getTime()}
                stroke={e.color}
                strokeDasharray="3 4"
                strokeWidth={1}
                strokeOpacity={0.4}
                label={{
                  value: e.label,
                  position: e.type === 'peak' ? 'insideTopLeft' : 'insideBottomLeft',
                  fill: e.color,
                  fontSize: 8,
                  opacity: 0.7,
                }}
              />
            ))}

          <XAxis
            dataKey={(d: HodlWavePoint) => new Date(d.time + 'T00:00:00').getTime()}
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />

          {/* Left: exchange reserve % */}
          <YAxis
            yAxisId="exch"
            domain={[yMin, yMax]}
            tickFormatter={fmtPct}
            tick={{ fill: '#F7931A', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={46}
          />

          {/* Right: BTC price log scale */}
          <YAxis
            yAxisId="price"
            orientation="right"
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtPrice}
            tick={{ fill: 'rgba(230,237,243,0.45)', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            width={58}
            allowDataOverflow
          />

          <Tooltip content={<CustomTooltip />} />

          {/* BTC price — drawn first, sits behind exchange line */}
          {showPrice && (
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="btcClose"
              stroke="rgba(230,237,243,0.6)"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Exchange reserve area — the primary story */}
          <Area
            yAxisId="exch"
            type="monotone"
            dataKey="exchPct"
            stroke="#F7931A"
            strokeWidth={2}
            fill="rgba(247,147,26,0.10)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 30D SMA */}
          {show30d && (
            <Line
              yAxisId="exch"
              type="monotone"
              dataKey="exch30d"
              stroke="#F2B84B"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* 90D SMA */}
          {show90d && (
            <Line
              yAxisId="exch"
              type="monotone"
              dataKey="exch90d"
              stroke="#3B82F6"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <ChartWatermark />
    </div>
  );
}
