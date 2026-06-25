"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { NUPLPoint } from '@/lib/indicators/nupl';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type NUPLSharePayload = {
  points:     NUPLPoint[];
  nupl:       number | null;
  price:      number | null;
  ma730:      number | null;
  zoneLabel:  string;
  zoneColor:  string;
  zone:       string;
  generatedAt: string;
  logoSrc?:   never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 10;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

const PRICE_H  = 140;
const PANEL_GAP = 4;
const NUPL_H   = CHART_H - PRICE_H - PANEL_GAP;

export const NUPL_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const HALVINGS = [
  new Date('2012-11-28').getTime(),
  new Date('2016-07-09').getTime(),
  new Date('2020-05-11').getTime(),
  new Date('2024-04-19').getTime(),
];

const NUPL_BANDS = [
  { y1: -1,   y2: 0,    fill: 'rgba(59,130,246,0.18)',  label: 'Capitulation', color: '#3B82F6'  },
  { y1: 0,    y2: 0.35, fill: 'rgba(53,208,127,0.12)',  label: 'Hope',         color: '#35D07F'  },
  { y1: 0.35, y2: 0.60, fill: 'rgba(163,230,53,0.10)',  label: 'Optimism',     color: '#A3E635'  },
  { y1: 0.60, y2: 0.75, fill: 'rgba(230,180,80,0.12)',  label: 'Belief',       color: '#E6B450'  },
  { y1: 0.75, y2: 1.1,  fill: 'rgba(255,92,92,0.18)',   label: 'Euphoria',     color: '#FF5C5C'  },
];

const LOG_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

export function NUPLShareCard({ payload }: { payload: NUPLSharePayload }) {
  const { points, nupl, price, ma730, zoneLabel, zoneColor, zone, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const ma730Color = ma730 != null && price != null
    ? (price < ma730 ? '#3B82F6' : '#35D07F')
    : '#94A3B8';

  const stats = [
    { label: 'BTC Price',     value: fmtUSD(price),                           sub: 'Current price',      color: '#E6EDF3'  },
    { label: 'NUPL',          value: nupl != null ? nupl.toFixed(3) : '—',    sub: zone,                 color: zoneColor  },
    { label: 'Market Zone',   value: zone,                                     sub: zoneLabel,            color: zoneColor  },
    { label: '2Y MA (Proxy)', value: ma730 != null ? fmtUSD(ma730) : '—',     sub: ma730 != null && price != null ? (price < ma730 ? 'Below cost basis' : 'Above cost basis') : '—', color: ma730Color },
  ];

  // Y-axis domain for price
  const prices = points.map(p => p.price).filter(v => v > 0);
  const pMin = prices.length ? Math.max(50, Math.min(...prices) * 0.8) : 100;
  const pMax = prices.length ? Math.max(...prices) * 2.0 : 200_000;
  const logTicks = LOG_TICKS.filter(t => t >= pMin && t <= pMax);

  // Year ticks
  const tMin = points.length ? points[0].ts : 0;
  const tMax = points.length ? points[points.length - 1].ts : 0;
  const yearMin = new Date(tMin).getFullYear();
  const yearMax = new Date(tMax).getFullYear();
  const yearTicks: number[] = [];
  for (let y = yearMin + 2; y <= yearMax; y += 2) yearTicks.push(new Date(`${y}-01-01`).getTime());

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
            NUPL — Net Unrealized Profit/Loss
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            2Y MA cost-basis proxy · 5-zone sentiment model · Capitulation to Euphoria
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
            backgroundColor: zoneColor + '20',
            fontSize: 10, color: zoneColor,
          }}>
            {zone}
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

      {/* Charts — dual panel */}
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: PANEL_GAP }}>

        {/* Top: BTC price log */}
        <ComposedChart
          data={points}
          width={CHART_W}
          height={PRICE_H}
          margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />
          {HALVINGS.map((ts) => (
            <ReferenceLine key={ts} x={ts} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 5" />
          ))}
          <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
            ticks={yearTicks} tick={false} tickLine={false} axisLine={false} />
          <YAxis scale="log" domain={[pMin, pMax]} ticks={logTicks}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false} axisLine={false} width={52} allowDataOverflow />
          <Area type="monotone" dataKey="price" stroke="rgba(247,249,252,0.85)" strokeWidth={1.5}
            fill="rgba(247,249,252,0.04)" dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>

        {/* Bottom: NUPL */}
        <ComposedChart
          data={points}
          width={CHART_W}
          height={NUPL_H}
          margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {NUPL_BANDS.map((b) => (
            <ReferenceArea key={b.y1} y1={b.y1} y2={b.y2} fill={b.fill} stroke="none" />
          ))}

          <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" strokeWidth={1} />

          {HALVINGS.map((ts) => (
            <ReferenceLine key={ts} x={ts} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 5" />
          ))}

          <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts: number) => new Date(ts).getFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false} axisLine={{ stroke: '#1E293B' }} />

          <YAxis domain={[-0.5, 1.0]}
            ticks={[-0.25, 0, 0.35, 0.60, 0.75]}
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false} axisLine={false} width={52} />

          <Line type="monotone" dataKey="nupl" stroke="#A855F7" strokeWidth={2}
            dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 14, height: 2, backgroundColor: 'rgba(247,249,252,0.8)', display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>BTC Price</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 14, height: 2, backgroundColor: '#A855F7', display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>NUPL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {NUPL_BANDS.map((b) => (
              <div key={b.y1} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 8, height: 8, backgroundColor: b.color, opacity: 0.7, display: 'inline-block', borderRadius: 2 }} />
                <span style={{ fontSize: 9, color: '#6B7280' }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
