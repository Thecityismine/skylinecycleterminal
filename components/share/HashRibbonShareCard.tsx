"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { HRPoint } from '@/components/charts/HashRibbonChart';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type HashRibbonSharePayload = {
  data:          HRPoint[];
  range:         string;
  statusLabel:   string;
  statusColor:   string;
  currentPrice:  number | null;
  currentMA30:   number | null;
  currentMA60:   number | null;
  currentRatio:  number | null;
  dataSource:    string;
  generatedAt:   string;
  logoSrc?:      never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 22;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const HASH_RIBBON_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

function fmtUSD(v: number | null): string {
  if (v == null) return 'â€”';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtHashRate(v: number | null, source: string): string {
  if (v == null) return 'â€”';
  if (source === 'DiffLast') {
    if (v >= 1e12) return `${(v / 1e12).toFixed(1)} T`;
    if (v >= 1e9)  return `${(v / 1e9).toFixed(1)} B`;
    return v.toFixed(0);
  }
  if (v >= 1e18) return `${(v / 1e18).toFixed(1)} EH/s`;
  if (v >= 1e15) return `${(v / 1e15).toFixed(1)} PH/s`;
  if (v >= 1e12) return `${(v / 1e12).toFixed(1)} TH/s`;
  if (v >= 1e9)  return `${(v / 1e9).toFixed(1)} GH/s`;
  return `${(v / 1e6).toFixed(1)} MH/s`;
}

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function HashRibbonShareCard({ payload }: { payload: HashRibbonSharePayload }) {
  const {
    data, range, statusLabel, statusColor,
    currentPrice, currentMA30, currentMA60, currentRatio,
    dataSource, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const ratioColor = currentRatio == null
    ? '#F7F9FC'
    : currentRatio < 1.0  ? '#FF5C5C'
    : currentRatio < 1.05 ? '#35D07F'
    : '#6B7280';

  const maLabel  = dataSource === 'DiffLast' ? 'Difficulty' : 'Hash Rate';

  const stats = [
    { label: 'BTC Price',        value: fmtUSD(currentPrice),                              sub: 'Latest close',                  color: '#F7F9FC'    },
    { label: `30d ${maLabel} MA`, value: fmtHashRate(currentMA30, dataSource),             sub: '30-day moving average',         color: '#E6B450'    },
    { label: `60d ${maLabel} MA`, value: fmtHashRate(currentMA60, dataSource),             sub: '60-day moving average',         color: '#3B82F6'    },
    { label: 'Ribbon Ratio',     value: currentRatio != null ? `${currentRatio.toFixed(3)}Ã—` : 'â€”', sub: statusLabel,            color: ratioColor   },
  ];

  // Capitulation zones
  const capitZones: { x1: string; x2: string }[] = [];
  let zStart: string | null = null;
  for (const p of data) {
    if (p.inCapit && !zStart)        { zStart = p.date; }
    else if (!p.inCapit && zStart)   { capitZones.push({ x1: zStart, x2: p.date }); zStart = null; }
  }
  if (zStart && data.length) capitZones.push({ x1: zStart, x2: data[data.length - 1].date });

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
            Hash Ribbons
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            Miner capitulation · 30d vs 60d {maLabel} MA{range !== 'All' ? ` · ${range}` : ''}
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
            padding:         '4px 12px',
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
          margin={{ top: 8, right: 56, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.45} />

          <YAxis
            yAxisId="price"
            scale="log"
            domain={[pMin, pMax]}
            tickFormatter={fmtY}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={68}
            allowDataOverflow
          />

          <YAxis
            yAxisId="ribbon"
            orientation="right"
            domain={[0, 2.5]}
            tickFormatter={(v: number) => `${v.toFixed(1)}Ã—`}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={44}
            ticks={[0, 0.5, 1.0, 1.5, 2.0, 2.5]}
          />

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

          {/* Capitulation zone shading */}
          {capitZones.map((z, i) => (
            <ReferenceArea
              key={i}
              x1={z.x1}
              x2={z.x2}
              yAxisId="price"
              fill="rgba(255,92,92,0.07)"
              strokeOpacity={0}
            />
          ))}

          {/* Threshold at ratio 1.0 */}
          <ReferenceLine
            y={1.0}
            yAxisId="ribbon"
            stroke="#6B7280"
            strokeDasharray="3 4"
            strokeWidth={1}
          />

          {/* BTC Price */}
          <Area
            yAxisId="price"
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

          {/* Ribbon ratio */}
          <Line
            yAxisId="ribbon"
            type="monotone"
            dataKey="ratio"
            name="Ribbon Ratio"
            stroke="#A78BFA"
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
              { color: 'rgba(247,249,252,0.75)', label: 'BTC Price'         },
              { color: '#A78BFA',                label: '30d / 60d Ratio'   },
              { color: 'rgba(255,92,92,0.25)',   label: 'Capitulation Zone', square: true },
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
