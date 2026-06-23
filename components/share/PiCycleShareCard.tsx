"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceArea,
} from 'recharts';
import type { PiBottomPoint } from '@/components/charts/PiCycleBottomChart';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type PiCycleSharePayload = {
  data:             PiBottomPoint[];
  range:            string;
  statusLabel:      string;
  statusColor:      string;
  currentPrice:     number | null;
  currentMA150:     number | null;
  currentThreshold: number | null;
  ratio:            number | null;
  generatedAt:      string;
  logoSrc?:         never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const PI_CYCLE_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtUSD(v: number | null): string {
  if (v == null) return 'â€”';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export function PiCycleShareCard({ payload }: { payload: PiCycleSharePayload }) {
  const {
    data, range, statusLabel, statusColor,
    currentPrice, currentMA150, currentThreshold, ratio,
    generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const ratioColor = ratio == null
    ? '#F7F9FC'
    : ratio < 1.0   ? '#3B82F6'
    : ratio < 1.15  ? '#E6B450'
    : '#6B7280';

  const stats = [
    { label: 'BTC Price',        value: fmtUSD(currentPrice),                         sub: 'Latest close',            color: '#F7F9FC'   },
    { label: '150-Day MA',       value: fmtUSD(currentMA150),                         sub: 'Short-term trend line',   color: '#E6B450'   },
    { label: '471d MA Ã— 0.745',  value: fmtUSD(currentThreshold),                     sub: 'Pi Cycle threshold',      color: '#3B82F6'   },
    { label: 'Ratio (150d / T)', value: ratio != null ? `${ratio.toFixed(3)}Ã—` : 'â€”', sub: statusLabel,               color: ratioColor  },
  ];

  // Compute zone spans from the data
  const zones: { x1: string; x2: string }[] = [];
  let zoneStart: string | null = null;
  for (const p of data) {
    if (p.inZone && !zoneStart)       { zoneStart = p.date; }
    else if (!p.inZone && zoneStart)  { zones.push({ x1: zoneStart, x2: p.date }); zoneStart = null; }
  }
  if (zoneStart && data.length) {
    zones.push({ x1: zoneStart, x2: data[data.length - 1].date });
  }

  // Y-axis domain
  const prices = data.map(d => d.price).filter((v): v is number => v != null && v > 0);
  const pMin   = prices.length ? Math.max(1, Math.min(...prices) * 0.85) : 1;
  const pMax   = prices.length ? Math.max(...prices) * 1.15 : 200_000;

  return (
    <div style={{
      width:           SHARE_CARD_WIDTH,
      height:          SHARE_CARD_HEIGHT,
      backgroundColor: '#0D1117',
      position:        'relative',
      overflow:        'hidden',
      fontFamily:      'ui-monospace, SFMono-Regular, Menlo, monospace',
      display:         'flex',
      flexDirection:   'column',
      padding:         PAD,
      boxSizing:       'border-box',
    }}>

      {/* Header */}
      <div style={{
        height:         HEADER_H,
        flex:           `0 0 ${HEADER_H}px`,
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>
            Pi Cycle Bottom
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            150d MA vs 471d MA Ã— 0.745 · Log scale{range !== 'All' ? ` · ${range}` : ''}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
              {range}
            </span>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: statusColor + '20', fontSize: 10, color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        height:              STATS_H,
        flex:                `0 0 ${STATS_H}px`,
        display:             'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:                 12,
        marginTop:           GAP,
        marginBottom:        GAP,
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            backgroundColor: '#161B22',
            border:          '1px solid #21262D',
            borderRadius:    8,
            padding:         '10px 12px',
            display:         'flex',
            flexDirection:   'column',
            justifyContent:  'center',
          }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart
          data={data}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 8, right: 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

          <XAxis
            dataKey="date"
            tickFormatter={(d: string) =>
              new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            }
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={80}
          />

          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            tickFormatter={fmtY}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={68}
            allowDataOverflow
          />

          {/* Bottom zone shading */}
          {zones.map((z, i) => (
            <ReferenceArea
              key={i}
              x1={z.x1}
              x2={z.x2}
              fill="rgba(59,130,246,0.08)"
              strokeOpacity={0}
            />
          ))}

          {/* BTC Price */}
          <Area
            type="monotone"
            dataKey="price"
            name="BTC Price"
            stroke="rgba(247,249,252,0.75)"
            strokeWidth={1.5}
            fill="rgba(247,249,252,0.03)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 471d Ã— 0.745 threshold */}
          <Line
            type="monotone"
            dataKey="threshold"
            name="471d Ã— 0.745"
            stroke="#3B82F6"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 150d MA */}
          <Line
            type="monotone"
            dataKey="ma150"
            name="150d MA"
            stroke="#E6B450"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {[
              { color: 'rgba(247,249,252,0.75)', label: 'BTC Price'    },
              { color: '#E6B450',                label: '150d MA'      },
              { color: '#3B82F6',                label: '471d Ã— 0.745' },
              { color: 'rgba(59,130,246,0.35)',  label: 'Bottom Zone', square: true },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {l.square ? (
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color, display: 'inline-block' }} />
                ) : (
                  <span style={{ width: 16, height: 2, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
                )}
                <span style={{ fontSize: 10, color: '#8B949E' }}>{l.label}</span>
              </div>
            ))}
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
