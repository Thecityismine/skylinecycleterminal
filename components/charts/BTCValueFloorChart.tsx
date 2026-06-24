"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { ValueFloorPoint } from '@/lib/indicators/valueFloors';
import { HALVINGS_CVDD, FLOOR_EVENTS } from '@/lib/indicators/valueFloors';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { useChartZoom } from '@/lib/hooks/useChartZoom';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type Props = {
  points:           ValueFloorPoint[];
  range?:           'all' | '8y' | '4y';
  onVisibleChange?: (visible: Record<string, boolean>) => void;
  onZoomChange?:    (d: ZoomDomain<number> | null) => void;
};

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1)         return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ValueFloorPoint = payload[0]?.payload;
  if (!d) return null;

  const rows: Array<{ label: string; value: string; color: string }> = [
    { label: 'BTC Price',      value: fmtPrice(d.btcClose),                             color: '#E6EDF3' },
    { label: 'Realized Price', value: d.realizedPrice != null ? fmtPrice(d.realizedPrice) : '—', color: '#3B82F6' },
    { label: '2Y MA',          value: d.ma2y != null ? fmtPrice(d.ma2y) : '—',           color: '#35D07F' },
    { label: '200W MA',        value: d.ma200w != null ? fmtPrice(d.ma200w) : '—',       color: '#A855F7' },
    { label: 'Power Law',      value: fmtPrice(d.powerLaw),                              color: '#E6B450' },
  ];

  return (
    <div
      className="rounded-lg border px-3 py-2.5 text-sm shadow-xl min-w-[210px]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <p className="text-xs mb-2 font-mono" style={{ color: 'var(--sct-muted)' }}>{d.time}</p>
      <div className="space-y-1">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex justify-between gap-6">
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>{label}</span>
            <span className="text-xs font-mono font-semibold" style={{ color }}>{value}</span>
          </div>
        ))}
        {d.drawdownPct < -1 && (
          <div className="flex justify-between gap-6 pt-1 mt-1 border-t" style={{ borderColor: 'var(--sct-border)' }}>
            <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>ATH Drawdown</span>
            <span className="text-xs font-mono" style={{ color: d.drawdownPct < -50 ? '#35D07F' : '#E6B450' }}>
              {d.drawdownPct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const FLOOR_LINES = [
  { key: 'realizedPrice', label: 'Realized Price', color: '#3B82F6', width: 2,   dash: undefined },
  { key: 'ma2y',          label: '2Y MA',          color: '#35D07F', width: 1.5, dash: '6 3' },
  { key: 'ma200w',        label: '200W MA',        color: '#A855F7', width: 1.5, dash: '6 3' },
  { key: 'powerLaw',      label: 'Power Law',      color: '#E6B450', width: 1,   dash: '4 4' },
];

export function BTCValueFloorChart({ points, range = 'all', onVisibleChange, onZoomChange }: Props) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    btcPrice:      true,
    realizedPrice: true,
    ma2y:          true,
    ma200w:        true,
    powerLaw:      false,
    halvings:      true,
    floorEvents:   true,
    valueZone:     true,
  });

  const toggle = (key: string) =>
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      onVisibleChange?.(next);
      return next;
    });

  const {
    domain, isSelecting, selectionArea, cancel, chartHandlers,
  } = useChartZoom<number>();

  useEffect(() => {
    onZoomChange?.(domain);
  }, [domain, onZoomChange]);

  if (!points.length) return null;

  // Date range filter
  const cutoff = range === 'all' ? 0
    : range === '8y' ? Date.now() - 8 * 365.25 * 86_400_000
    :                  Date.now() - 4 * 365.25 * 86_400_000;
  const filtered = cutoff ? points.filter((p) => p.ts >= cutoff) : points;

  const chartData = useMemo(() => {
    if (!domain) return filtered;
    return filtered.filter(d => d.ts >= domain.start && d.ts <= domain.end);
  }, [filtered, domain]);

  // Y-axis domain (log)
  const allPrices = chartData.flatMap((p) => [
    p.btcClose,
    p.realizedPrice,
    p.ma200w,
    p.ma2y,
    p.powerLawLow,
  ].filter((v): v is number => v != null && v > 0));
  const pMin = allPrices.length ? Math.max(0.01, Math.min(...allPrices) * 0.7) : 0.01;
  const pMax = allPrices.length ? Math.max(...allPrices) * 2.0 : 200_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const cutoffTs = cutoff || 0;

  const toggleBtn = (key: string, label: string, color: string) => (
    <button
      key={key}
      onClick={() => toggle(key)}
      className="px-2.5 py-1 rounded text-[10px] font-mono transition-all border"
      style={{
        backgroundColor: visible[key] ? `${color}20` : 'transparent',
        borderColor:     visible[key] ? color : 'var(--sct-border)',
        color:           visible[key] ? color : 'var(--sct-muted)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: 'relative', width: '100%', height: '100%',
        cursor: isSelecting ? 'crosshair' : 'default',
        userSelect: 'none',
      }}
      onMouseLeave={cancel}
    >
      {/* Toggles */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {toggleBtn('btcPrice',      'BTC Price',      '#E6EDF3')}
        {toggleBtn('realizedPrice', 'Realized Price', '#3B82F6')}
        {toggleBtn('ma2y',          '2Y MA',          '#35D07F')}
        {toggleBtn('ma200w',        '200W MA',        '#A855F7')}
        {toggleBtn('powerLaw',      'Power Law',      '#E6B450')}
        {toggleBtn('valueZone',     'Value Zone',     '#3B82F6')}
        {toggleBtn('halvings',      'Halvings',       'rgba(255,255,255,0.4)')}
        {toggleBtn('floorEvents',   'Bottom Events',  '#35D07F')}
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }} {...chartHandlers}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

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

          {/* Halvings */}
          {visible.halvings && HALVINGS_CVDD
            .filter((h) => h.ts >= cutoffTs)
            .map((h) => (
              <ReferenceLine
                key={h.label}
                x={h.ts}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4 5"
                label={{
                  value: h.label,
                  position: 'insideTopRight',
                  fill: 'rgba(255,255,255,0.22)',
                  fontSize: 9,
                }}
              />
            ))}

          {/* Floor events (bear lows) */}
          {visible.floorEvents && FLOOR_EVENTS
            .filter((e) => new Date(e.time + 'T00:00:00').getTime() >= cutoffTs)
            .map((e) => (
              <ReferenceLine
                key={e.time}
                x={new Date(e.time + 'T00:00:00').getTime()}
                stroke={e.color}
                strokeDasharray="3 4"
                strokeWidth={1}
                strokeOpacity={0.35}
                label={{
                  value: e.label,
                  position: 'insideTopLeft',
                  fill: e.color,
                  fontSize: 8,
                  opacity: 0.65,
                }}
              />
            ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
          />

          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtPrice}
            tick={{ fill: 'var(--sct-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--sct-border)' }}
            tickLine={false}
            width={56}
            allowDataOverflow
          />

          <Tooltip content={<CustomTooltip />} cursor={isSelecting ? false : undefined} />

          {/* Value zone — subtle fill between realizedPrice and price */}
          {visible.valueZone && visible.realizedPrice && (
            <Area
              type="monotone"
              dataKey="realizedPrice"
              stroke="none"
              fill="rgba(59,130,246,0.08)"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Floor lines — drawn before BTC price so price sits on top */}
          {FLOOR_LINES.map(({ key, color, width, dash }) =>
            visible[key] ? (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={width}
                strokeDasharray={dash}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ) : null,
          )}

          {/* BTC price — topmost, thicker */}
          {visible.btcPrice && (
            <Line
              type="monotone"
              dataKey="btcClose"
              stroke="#E6EDF3"
              strokeWidth={2.5}
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
