"use client";

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { BottomConfluencePoint, ConfluencePeriod } from '@/lib/indicators/bottomConfluence';
import { BOTTOM_EVENTS, HALVINGS_BOTTOM } from '@/lib/indicators/bottomConfluence';
import { ChartWatermark } from '@/components/charts/ChartWatermark';

type Props = {
  points:  BottomConfluencePoint[];
  periods: ConfluencePeriod[];
  range?:  'all' | '8y' | '4y';
};

const LOG_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: BottomConfluencePoint = payload[0]?.payload;
  if (!d) return null;

  const rows = [
    { label: 'BTC Price',        value: fmtPrice(d.btcClose),                                     color: '#E6EDF3' },
    { label: '2Y MA',            value: d.ma2y != null ? fmtPrice(d.ma2y) : '—',                  color: '#35D07F' },
    { label: 'MVRV',             value: d.mvrv.toFixed(2),                                         color: '#E6B450' },
    { label: 'Hash Ratio 30/60', value: d.hrRatio != null ? d.hrRatio.toFixed(3) : '—',            color: '#3B82F6' },
    { label: 'Exchange Δ30D',    value: fmtPct(d.exchChange30d),                                   color: '#A855F7' },
    { label: 'Confluence Score', value: `${d.confluenceScore.toFixed(1)} / 4`,                     color: '#35D07F' },
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
      </div>
    </div>
  );
}

export function BTCBottomConfluenceChart({ points, periods, range = 'all' }: Props) {
  const [visible, setVisible] = useState<Record<string, boolean>>({
    btcPrice:  true,
    ma2y:      true,
    zones:     true,
    halvings:  true,
    bottoms:   true,
  });

  const toggle = (key: string) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!points.length) return null;

  const cutoff =
    range === '8y' ? Date.now() - 8  * 365.25 * 86_400_000 :
    range === '4y' ? Date.now() - 4  * 365.25 * 86_400_000 :
                     0;
  const filtered = cutoff ? points.filter((p) => p.ts >= cutoff) : points;

  const allPrices = filtered.flatMap((p) =>
    [p.btcClose, p.ma2y].filter((v): v is number => v != null && v > 0),
  );
  const pMin = allPrices.length ? Math.max(50, Math.min(...allPrices) * 0.7) : 100;
  const pMax = allPrices.length ? Math.max(...allPrices) * 2.2 : 200_000;
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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {toggleBtn('btcPrice', 'BTC Price',        '#E6EDF3')}
        {toggleBtn('ma2y',     '2Y MA',             '#35D07F')}
        {toggleBtn('zones',    'Confluence Zones',  '#35D07F')}
        {toggleBtn('halvings', 'Halvings',           'rgba(255,255,255,0.4)')}
        {toggleBtn('bottoms',  'Bottom Events',      '#35D07F')}
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={filtered} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Confluence periods — shaded backgrounds */}
          {visible.zones && periods
            .filter((p) => p.x2 >= cutoffTs)
            .map((p, i) => (
              <ReferenceArea
                key={i}
                x1={Math.max(p.x1, cutoffTs || p.x1)}
                x2={p.x2}
                fill={p.color}
                stroke="none"
              />
            ))}

          {/* Halvings */}
          {visible.halvings && HALVINGS_BOTTOM
            .filter((h) => h.ts >= cutoffTs)
            .map((h) => (
              <ReferenceLine
                key={h.label}
                x={h.ts}
                stroke="rgba(255,255,255,0.10)"
                strokeDasharray="4 5"
                label={{
                  value: h.label,
                  position: 'insideTopRight',
                  fill: 'rgba(255,255,255,0.22)',
                  fontSize: 9,
                }}
              />
            ))}

          {/* Historical bottom events */}
          {visible.bottoms && BOTTOM_EVENTS
            .filter((e) => new Date(e.time + 'T00:00:00').getTime() >= cutoffTs)
            .map((e) => (
              <ReferenceLine
                key={e.time}
                x={new Date(e.time + 'T00:00:00').getTime()}
                stroke={e.color}
                strokeDasharray="3 4"
                strokeWidth={1}
                strokeOpacity={0.4}
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

          <Tooltip content={<CustomTooltip />} />

          {/* 2Y MA — draw before BTC price */}
          {visible.ma2y && (
            <Line
              type="monotone"
              dataKey="ma2y"
              stroke="#35D07F"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* BTC price — topmost */}
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
