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
  ResponsiveContainer,
} from 'recharts';
import { ChartWatermark } from '@/components/charts/ChartWatermark';
import { METAL_CONFIG, REGIME_FILL } from '@/lib/indicators/metalTrend';
import type { MetalWeeklyPoint, Metal, MetalRegime } from '@/lib/indicators/metalTrend';

type Props = {
  data: MetalWeeklyPoint[];
  metal: Metal;
  show50W: boolean;
  show200W: boolean;
  showDXY: boolean;
  showRealYield: boolean;
};

function formatDateTick(v: string): string {
  return new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtPrice(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
  metal: Metal;
  show50W: boolean;
  show200W: boolean;
  showDXY: boolean;
  showRealYield: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
  metal,
  show50W,
  show200W,
  showDXY,
  showRealYield,
}: CustomTooltipProps) {
  if (!active || !payload || !label) return null;

  const get = (name: string) => payload.find(p => p.name === name)?.value ?? null;

  const close = get('close');
  const ma50w = show50W ? get('ma50w') : null;
  const ma200w = show200W ? get('ma200w') : null;
  const gsRatio = get('goldSilverRatio');
  const dxy = showDXY ? get('dxy') : null;
  const realYield = showRealYield ? get('realYield') : null;

  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const accent = METAL_CONFIG[metal].accent;

  return (
    <div
      style={{
        backgroundColor: 'var(--sct-card)',
        border: '1px solid var(--sct-border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        lineHeight: 1.7,
        minWidth: 180,
      }}
    >
      <p style={{ color: 'var(--sct-muted)', marginBottom: 6, fontSize: 11 }}>{date}</p>
      {close !== null && (
        <p style={{ color: accent }}>
          <span style={{ color: 'var(--sct-muted)' }}>{METAL_CONFIG[metal].label} </span>
          {close >= 100 ? `$${close.toFixed(0)}` : `$${close.toFixed(2)}`} / oz
        </p>
      )}
      {ma50w !== null && (
        <p style={{ color: '#EAB84D' }}>
          <span style={{ color: 'var(--sct-muted)' }}>50W MA </span>
          {ma50w >= 100 ? `$${ma50w.toFixed(0)}` : `$${ma50w.toFixed(2)}`}
        </p>
      )}
      {ma200w !== null && (
        <p style={{ color: '#5B84FF' }}>
          <span style={{ color: 'var(--sct-muted)' }}>200W MA </span>
          {ma200w >= 100 ? `$${ma200w.toFixed(0)}` : `$${ma200w.toFixed(2)}`}
        </p>
      )}
      {gsRatio !== null && (
        <p style={{ color: 'var(--sct-muted)' }}>
          <span>G/S Ratio </span>
          <span style={{ color: 'var(--sct-text)' }}>{gsRatio.toFixed(1)}</span>
        </p>
      )}
      {dxy !== null && (
        <p style={{ color: 'rgba(230,237,243,0.50)' }}>
          <span style={{ color: 'var(--sct-muted)' }}>DXY </span>
          {dxy.toFixed(2)}
        </p>
      )}
      {realYield !== null && (
        <p style={{ color: 'rgba(248,81,73,0.70)' }}>
          <span style={{ color: 'var(--sct-muted)' }}>Real Yield </span>
          {realYield.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

type Zone = { start: string; end: string; regime: MetalRegime };

function buildZones(data: MetalWeeklyPoint[]): Zone[] {
  const zones: Zone[] = [];
  if (data.length === 0) return zones;
  let zoneStart = data[0].date;
  let zoneRegime = data[0].regime;
  for (let i = 1; i < data.length; i++) {
    if (data[i].regime !== zoneRegime) {
      zones.push({ start: zoneStart, end: data[i - 1].date, regime: zoneRegime });
      zoneStart = data[i].date;
      zoneRegime = data[i].regime;
    }
  }
  zones.push({ start: zoneStart, end: data[data.length - 1].date, regime: zoneRegime });
  return zones;
}

export function PreciousMetalChart({ data, metal, show50W, show200W, showDXY, showRealYield }: Props) {
  const zones = buildZones(data);
  const config = METAL_CONFIG[metal];
  const showOverlay = showDXY || showRealYield;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <ChartWatermark />
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: showOverlay ? 72 : 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.6} vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            minTickGap={100}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          <YAxis
            yAxisId="price"
            tickFormatter={fmtPrice}
            width={64}
            domain={['auto', 'auto']}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          <YAxis
            yAxisId="overlay"
            orientation="right"
            hide={!showOverlay}
            domain={['auto', 'auto']}
            width={52}
            tick={{ fill: '#4B5563', fontSize: 10 }}
          />

          {/* Regime background zones */}
          {zones.map((zone, i) => (
            <ReferenceArea
              key={i}
              x1={zone.start}
              x2={zone.end}
              yAxisId="price"
              fill={REGIME_FILL[zone.regime]}
              strokeOpacity={0}
            />
          ))}

          {/* Price area */}
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke={config.accent}
            strokeWidth={2}
            fill={config.accent + '10'}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 50W MA */}
          {show50W && (
            <Line
              yAxisId="price"
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
              yAxisId="price"
              type="monotone"
              dataKey="ma200w"
              stroke="#5B84FF"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* DXY overlay */}
          {showDXY && (
            <Line
              yAxisId="overlay"
              type="monotone"
              dataKey="dxy"
              stroke="rgba(230,237,243,0.40)"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Real yield overlay */}
          {showRealYield && (
            <Line
              yAxisId="overlay"
              type="monotone"
              dataKey="realYield"
              stroke="rgba(248,81,73,0.50)"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          <Tooltip
            content={
              <CustomTooltip
                metal={metal}
                show50W={show50W}
                show200W={show200W}
                showDXY={showDXY}
                showRealYield={showRealYield}
              />
            }
            cursor={{ stroke: 'rgba(139,148,158,0.2)', strokeWidth: 1 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
