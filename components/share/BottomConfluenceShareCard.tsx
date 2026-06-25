"use client";

import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { BottomConfluencePoint, ConfluencePeriod } from '@/lib/indicators/bottomConfluence';
import { BOTTOM_EVENTS, HALVINGS_BOTTOM } from '@/lib/indicators/bottomConfluence';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type BottomConfluenceSharePayload = {
  points:          BottomConfluencePoint[];
  periods:         ConfluencePeriod[];
  visible:         Record<string, boolean>;
  confluenceScore: number;
  regimeLabel:     string;
  regimeColor:     string;
  btcClose:        number | null;
  mvrv:            number | null;
  hrRatio:         number | null;
  priceTo2y:       number | null;
  generatedAt:     string;
  logoSrc?:        never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 10;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const BOTTOM_CONFLUENCE_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

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

export function BottomConfluenceShareCard({ payload }: { payload: BottomConfluenceSharePayload }) {
  const {
    points, periods, visible,
    confluenceScore, regimeLabel, regimeColor,
    btcClose, mvrv, hrRatio, priceTo2y,
    generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const mvrvColor  = mvrv  == null ? '#94A3B8' : mvrv  < 1.0 ? '#35D07F' : mvrv  < 1.5 ? '#E6B450' : '#FF5C5C';
  const hrColor    = hrRatio == null ? '#94A3B8' : hrRatio < 1.0 ? '#35D07F' : '#3B82F6';
  const p2yColor   = priceTo2y == null ? '#94A3B8' : priceTo2y < 1.0 ? '#35D07F' : '#E6B450';

  const stats = [
    { label: 'BTC Price',         value: fmtUSD(btcClose),  sub: 'Current price',                   color: '#E6EDF3'   },
    { label: 'Confluence Score',  value: `${confluenceScore.toFixed(1)} / 4`, sub: regimeLabel,      color: regimeColor },
    { label: 'MVRV Ratio',        value: mvrv  != null ? mvrv.toFixed(2)  : '—', sub: mvrv != null  ? (mvrv < 1.0 ? 'Supply at loss' : mvrv < 1.5 ? 'Near cost basis' : 'Profitable') : '—', color: mvrvColor },
    { label: 'HR Ratio 30/60D',   value: hrRatio != null ? hrRatio.toFixed(3) : '—', sub: hrRatio != null ? (hrRatio < 1.0 ? 'Miner capitulation' : 'Miners healthy') : '—', color: hrColor },
  ];

  // Y-axis domain
  const allPrices = points.flatMap(p => [p.btcClose, p.ma2y].filter((v): v is number => v != null && v > 0));
  const pMin = allPrices.length ? Math.max(50, Math.min(...allPrices) * 0.7) : 100;
  const pMax = allPrices.length ? Math.max(...allPrices) * 2.2 : 200_000;
  const logTicks = LOG_TICKS.filter(t => t >= pMin && t <= pMax);

  // Year ticks
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
            Bear-Market Bottom Confluence
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            MVRV · Hash Ribbon · 2Y MA · Exchange Flow — signal alignment model
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
            backgroundColor: regimeColor + '20',
            fontSize: 10, color: regimeColor,
          }}>
            {regimeLabel}
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

          {/* Confluence periods */}
          {visible.zones && periods.map((p, i) => (
            <ReferenceArea key={i} x1={p.x1} x2={p.x2} fill={p.color} stroke="none" />
          ))}

          {/* Halvings */}
          {visible.halvings && HALVINGS_BOTTOM.map((h, i) => (
            <ReferenceLine
              key={i}
              x={h.ts}
              stroke="rgba(255,255,255,0.10)"
              strokeDasharray="4 5"
              label={{ value: h.label, position: 'insideTopRight', fill: 'rgba(255,255,255,0.22)', fontSize: 9, fontFamily: 'monospace' }}
            />
          ))}

          {/* Bottom events */}
          {visible.bottoms && BOTTOM_EVENTS.map((e, i) => (
            <ReferenceLine
              key={i}
              x={new Date(e.time + 'T00:00:00').getTime()}
              stroke={e.color}
              strokeDasharray="3 4"
              strokeWidth={1}
              strokeOpacity={0.4}
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

          {/* 2Y MA */}
          {visible.ma2y && (
            <Line type="monotone" dataKey="ma2y" stroke="#35D07F" strokeWidth={1.5} strokeDasharray="6 3" dot={false} isAnimationActive={false} connectNulls />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 2.5, backgroundColor: '#E6EDF3', display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: '#8B949E' }}>BTC Price</span>
            </div>
            {visible.ma2y && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, backgroundColor: '#35D07F', display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: '#8B949E' }}>2Y MA</span>
              </div>
            )}
            {visible.zones && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 10, backgroundColor: '#35D07F', opacity: 0.15, display: 'inline-block', borderRadius: 2 }} />
                <span style={{ fontSize: 10, color: '#8B949E' }}>Confluence Zones</span>
              </div>
            )}
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
