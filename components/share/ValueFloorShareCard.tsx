"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { ValueFloorPoint } from '@/lib/indicators/valueFloors';
import { HALVINGS_CVDD, FLOOR_EVENTS } from '@/lib/indicators/valueFloors';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type ValueFloorSharePayload = {
  points:        ValueFloorPoint[];
  visible:       Record<string, boolean>;
  scoreScore:    number;
  scoreLabel:    string;
  scoreColor:    string;
  btcClose:      number | null;
  realizedPrice: number | null;
  vsRealizedPct: number | null;   // (vsRealized ratio - 1) * 100
  drawdownPct:   number | null;
  generatedAt:   string;
  logoSrc?:      never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 10;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const VALUE_FLOOR_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

const FLOOR_LINES = [
  { key: 'realizedPrice', label: 'Realized Price', color: '#3B82F6', width: 2,   dash: undefined },
  { key: 'ma2y',          label: '2Y MA',          color: '#35D07F', width: 1.5, dash: '6 3'     },
  { key: 'ma200w',        label: '200W MA',        color: '#A855F7', width: 1.5, dash: '6 3'     },
  { key: 'powerLaw',      label: 'Power Law',      color: '#E6B450', width: 1,   dash: '4 4'     },
];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1)         return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

function fmtUSD(v: number | null): string {
  if (v == null) return 'â€”';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number | null): string {
  if (v == null) return 'â€”';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function ValueFloorShareCard({ payload }: { payload: ValueFloorSharePayload }) {
  const {
    points, visible,
    scoreScore, scoreLabel, scoreColor,
    btcClose, realizedPrice, vsRealizedPct, drawdownPct,
    generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const vsColor = vsRealizedPct == null ? '#94A3B8'
    : vsRealizedPct < 0  ? '#35D07F'
    : vsRealizedPct < 50 ? '#3B82F6'
    : vsRealizedPct < 150 ? '#E6B450'
    : '#FF5C5C';

  const stats = [
    { label: 'BTC Price',       value: fmtUSD(btcClose),       sub: 'Current price',              color: '#E6EDF3'   },
    { label: 'Realized Price',  value: fmtUSD(realizedPrice),   sub: 'Aggregate holder cost basis', color: '#3B82F6'   },
    { label: 'vs Cost Basis',   value: fmtPct(vsRealizedPct),   sub: vsRealizedPct != null ? (vsRealizedPct < 0 ? 'Below cost basis' : 'Above cost basis') : 'â€”', color: vsColor },
    { label: 'Floor Score',     value: `${scoreScore}/100`,     sub: scoreLabel,                    color: scoreColor  },
  ];

  // Y-axis domain
  const allPrices = points.flatMap(p => [p.btcClose, p.realizedPrice, p.ma200w, p.ma2y, p.powerLawLow].filter((v): v is number => v != null && v > 0));
  const pMin = allPrices.length ? Math.max(0.01, Math.min(...allPrices) * 0.7) : 0.01;
  const pMax = allPrices.length ? Math.max(...allPrices) * 2.0 : 200_000;
  const logTicks = LOG_TICKS.filter(t => t >= pMin && t <= pMax);

  // Year ticks from data range
  const tMin = points.length ? points[0].ts : 0;
  const tMax = points.length ? points[points.length - 1].ts : 0;
  const yearMin = new Date(tMin).getFullYear();
  const yearMax = new Date(tMax).getFullYear();
  const yearTicks: number[] = [];
  for (let y = yearMin + 1; y <= yearMax; y++) yearTicks.push(new Date(`${y}-01-01`).getTime());

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
            Bitcoin Value Floor Model
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            Realized price · 200W MA · 2Y MA · Power Law â€” long-term cost basis floors
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <span style={{
            padding: '2px 8px', borderRadius: 4,
            backgroundColor: scoreColor + '20',
            fontSize: 10, color: scoreColor,
          }}>
            {scoreLabel}
          </span>
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
        marginBottom:        STATS_GAP,
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
          data={points}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Halvings */}
          {visible.halvings && HALVINGS_CVDD.map((h, i) => (
            <ReferenceLine
              key={i}
              x={h.ts}
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="4 5"
              label={{ value: h.label, position: 'insideTopRight', fill: 'rgba(255,255,255,0.22)', fontSize: 9, fontFamily: 'monospace' }}
            />
          ))}

          {/* Floor events */}
          {visible.floorEvents && FLOOR_EVENTS.map((e, i) => (
            <ReferenceLine
              key={i}
              x={new Date(e.time + 'T00:00:00').getTime()}
              stroke={e.color}
              strokeDasharray="3 4"
              strokeWidth={1}
              strokeOpacity={0.35}
              label={{ value: e.label, position: 'insideTopLeft', fill: e.color, fontSize: 8, opacity: 0.65, fontFamily: 'monospace' }}
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts: number) => new Date(ts).getFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
          />

          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDataOverflow
          />

          {/* Value zone (realized price fill) */}
          {visible.valueZone && visible.realizedPrice && (
            <Area type="monotone" dataKey="realizedPrice" stroke="none" fill="rgba(59,130,246,0.08)" dot={false} isAnimationActive={false} connectNulls />
          )}

          {/* Floor lines */}
          {FLOOR_LINES.map(({ key, color, width, dash }) =>
            visible[key] ? (
              <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={width} strokeDasharray={dash} dot={false} isAnimationActive={false} connectNulls />
            ) : null
          )}

          {/* BTC price on top */}
          {visible.btcPrice && (
            <Line type="monotone" dataKey="btcClose" stroke="#E6EDF3" strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
          )}
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {[
              { key: 'btcPrice',      color: '#E6EDF3', label: 'BTC Price' },
              { key: 'realizedPrice', color: '#3B82F6', label: 'Realized' },
              { key: 'ma2y',          color: '#35D07F', label: '2Y MA' },
              { key: 'ma200w',        color: '#A855F7', label: '200W MA' },
              { key: 'powerLaw',      color: '#E6B450', label: 'Power Law' },
            ].filter(l => visible[l.key]).map(l => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: l.key === 'btcPrice' ? 2.5 : 2, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
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
