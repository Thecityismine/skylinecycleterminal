"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { REGIME_FILL, MACRO_EVENTS } from '@/lib/indicators/dxyTrend';
import type { DxyWeeklyPoint, DxyZone } from '@/lib/indicators/dxyTrend';

type Props = {
  data: DxyWeeklyPoint[];
  zones: DxyZone[];
  show50W: boolean;
  show200W: boolean;
  showBTC: boolean;
  showEvents: boolean;
};

function formatDateTick(v: string): string {
  return new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatBtcTick(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
  show50W: boolean;
  show200W: boolean;
  showBTC: boolean;
}

function CustomTooltip({ active, payload, label, show50W, show200W, showBTC }: CustomTooltipProps) {
  if (!active || !payload || !label) return null;

  const get = (name: string) => payload.find(p => p.name === name)?.value ?? null;

  const dxy = get('dxy');
  const ma50w = show50W ? get('ma50w') : null;
  const ma200w = show200W ? get('ma200w') : null;
  const btcPrice = showBTC ? get('btcPrice') : null;

  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div
      style={{
        backgroundColor: 'var(--sct-card)',
        border: '1px solid var(--sct-border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        lineHeight: 1.7,
        minWidth: 160,
      }}
    >
      <p style={{ color: 'var(--sct-muted)', marginBottom: 6, fontSize: 11 }}>{date}</p>
      {dxy !== null && (
        <p style={{ color: '#7AA2FF' }}>
          <span style={{ color: 'var(--sct-muted)' }}>DXY </span>
          {dxy.toFixed(2)}
        </p>
      )}
      {ma50w !== null && (
        <p style={{ color: '#EAB84D' }}>
          <span style={{ color: 'var(--sct-muted)' }}>50W MA </span>
          {ma50w.toFixed(2)}
        </p>
      )}
      {ma200w !== null && (
        <p style={{ color: '#8C6BFF' }}>
          <span style={{ color: 'var(--sct-muted)' }}>200W MA </span>
          {ma200w.toFixed(2)}
        </p>
      )}
      {btcPrice !== null && (
        <p style={{ color: 'rgba(245,247,250,0.7)' }}>
          <span style={{ color: 'var(--sct-muted)' }}>BTC </span>
          {formatBtcTick(btcPrice)}
        </p>
      )}
    </div>
  );
}

export function DXYChart({ data, zones, show50W, show200W, showBTC, showEvents }: Props) {
  const firstDate = data[0]?.date;
  const lastDate  = data[data.length - 1]?.date;

  const visibleEvents = showEvents && firstDate && lastDate
    ? MACRO_EVENTS.filter(e => e.date >= firstDate && e.date <= lastDate)
    : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ChartWatermark />
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: showBTC ? 72 : 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="#1E293B"
            strokeOpacity={0.5}
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            minTickGap={100}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          <YAxis
            yAxisId="left"
            tickFormatter={(v: number) => v.toFixed(0)}
            width={52}
            domain={['auto', 'auto']}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            hide={!showBTC}
            scale="log"
            domain={['auto', 'auto']}
            width={72}
            tickFormatter={formatBtcTick}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          {/* Regime background zones */}
          {zones.map((zone, i) => (
            <ReferenceArea
              key={i}
              x1={zone.start}
              x2={zone.end}
              yAxisId="left"
              fill={REGIME_FILL[zone.regime]}
              strokeOpacity={0}
            />
          ))}

          {/* Macro event vertical lines */}
          {visibleEvents.map(event => (
            <ReferenceLine
              key={event.date}
              x={event.date}
              yAxisId="left"
              stroke="rgba(230,180,80,0.4)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          ))}

          {/* Main DXY Area */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="dxy"
            stroke="#7AA2FF"
            strokeWidth={2}
            fill="rgba(122,162,255,0.04)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 50W MA */}
          {show50W && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ma50w"
              stroke="#EAB84D"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* 200W MA */}
          {show200W && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ma200w"
              stroke="#8C6BFF"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* BTC overlay */}
          {showBTC && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="btcPrice"
              stroke="rgba(245,247,250,0.3)"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          <Tooltip
            content={<CustomTooltip show50W={show50W} show200W={show200W} showBTC={showBTC} />}
            cursor={{ stroke: 'rgba(139,148,158,0.2)', strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
