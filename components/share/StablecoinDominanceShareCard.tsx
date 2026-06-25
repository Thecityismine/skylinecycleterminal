"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { StablecoinDominancePoint } from '@/lib/indicators/stablecoinDominance';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type StablecoinDominanceSharePayload = {
  points:          StablecoinDominancePoint[];
  dominance:       number | null;
  ma30:            number | null;
  ma90:            number | null;
  stablecoinMC:    number | null;
  btcPrice:        number | null;
  dom30dChange:    number | null;
  supply30dChange: number | null;
  regimeLabel:     string;
  regimeColor:     string;
  liquidityScore:  number;
  generatedAt:     string;
  logoSrc?:        never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 22;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const STABLECOIN_DOM_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

function fmtBig(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
}

function fmtBTC(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtChange(v: number | null, unit: string): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}${unit}`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function StablecoinDominanceShareCard({ payload }: { payload: StablecoinDominanceSharePayload }) {
  const {
    points, dominance, ma30, stablecoinMC, btcPrice,
    dom30dChange, supply30dChange,
    regimeLabel, regimeColor, liquidityScore, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const dom30dColor = dom30dChange != null
    ? (dom30dChange < -0.3 ? '#35D07F' : dom30dChange > 0.3 ? '#FF5C5C' : '#F2B84B')
    : '#94A3B8';

  const scoreColor = liquidityScore >= 65 ? '#35D07F' : liquidityScore >= 45 ? '#F2B84B' : '#FF5C5C';

  const stats = [
    {
      label: 'Stablecoin Dom.',
      value: dominance != null ? `${dominance.toFixed(2)}%` : '—',
      sub: ma30 != null ? `30D MA: ${ma30.toFixed(2)}%` : 'of total crypto market cap',
      color: '#4DA3FF',
    },
    {
      label: '30D Dom. Change',
      value: fmtChange(dom30dChange, ' pts'),
      sub: dom30dChange != null
        ? (dom30dChange < 0 ? 'Dominance declining' : 'Dominance rising')
        : '30-day momentum',
      color: dom30dColor,
    },
    {
      label: 'Stablecoin Supply',
      value: fmtBig(stablecoinMC),
      sub: supply30dChange != null ? `${fmtChange(supply30dChange, '%')} 30D supply chg` : 'Total stablecoin MC',
      color: '#E6EDF3',
    },
    {
      label: 'Liquidity Score',
      value: `${liquidityScore} / 100`,
      sub: regimeLabel,
      color: scoreColor,
    },
  ];

  const domValues = points.map((p) => p.dominance).filter((v) => !isNaN(v));
  const domMin    = Math.max(0, Math.min(...domValues) * 0.85);
  const domMax    = Math.max(...domValues) * 1.15;

  // Year ticks
  const tMin = points.length ? points[0].ts : 0;
  const tMax = points.length ? points[points.length - 1].ts : 0;
  const yearMin = new Date(tMin).getFullYear();
  const yearMax = new Date(tMax).getFullYear();
  const yearTicks: number[] = [];
  for (let y = yearMin; y <= yearMax; y++) {
    const ts = new Date(`${y}-01-01`).getTime();
    if (ts >= tMin && ts <= tMax) yearTicks.push(ts);
  }

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
            Stablecoin Dominance
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            Stablecoin share of total crypto market cap · BTC overlay (right axis)
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
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart
          data={points}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 4, right: 56, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id="sc-dom-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#4DA3FF" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#4DA3FF" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          <ReferenceLine yAxisId="dom" y={6}  stroke="rgba(53,208,127,0.25)"  strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine yAxisId="dom" y={12} stroke="rgba(255,92,92,0.25)"   strokeDasharray="4 4" strokeWidth={1} />

          <XAxis
            dataKey="ts" type="number" scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={fmtDate}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false} axisLine={{ stroke: '#1E293B' }}
          />

          <YAxis yAxisId="dom" domain={[domMin, domMax]}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false} axisLine={false} width={40} />

          <YAxis yAxisId="btc" orientation="right" scale="log" domain={['auto', 'auto']}
            tickFormatter={(v: number) => fmtBTC(v)}
            tick={{ fill: 'rgba(247,147,26,0.40)', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false} axisLine={false} width={48} />

          <Line yAxisId="btc" type="monotone" dataKey="btcPrice"
            stroke="rgba(247,147,26,0.28)" strokeWidth={1}
            dot={false} isAnimationActive={false} connectNulls />

          <Area yAxisId="dom" type="monotone" dataKey="dominance"
            stroke="#4DA3FF" strokeWidth={2}
            fill="url(#sc-dom-fill)"
            dot={false} isAnimationActive={false} />

          <Line yAxisId="dom" type="monotone" dataKey="ma30"
            stroke="#93C5FD" strokeWidth={1.5} strokeDasharray="5 3"
            dot={false} isAnimationActive={false} connectNulls />

          <Line yAxisId="dom" type="monotone" dataKey="ma90"
            stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="3 5"
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 2, backgroundColor: '#4DA3FF', display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Stable Dom.</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 0, borderTop: '1.5px dashed #93C5FD', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>30D MA</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 0, borderTop: '1.5px dashed #3B82F6', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>90D MA</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 2, backgroundColor: 'rgba(247,147,26,0.4)', display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>BTC Price</span>
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
