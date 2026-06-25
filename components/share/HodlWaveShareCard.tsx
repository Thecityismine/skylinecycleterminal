"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { HodlWavePoint } from '@/lib/indicators/exchangeReserve';
import { HALVINGS_WITH_EXCHANGE, HODL_CYCLE_EVENTS } from '@/lib/indicators/exchangeReserve';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type HodlWaveSharePayload = {
  points:       HodlWavePoint[];
  showPrice:    boolean;
  show30d:      boolean;
  show90d:      boolean;
  showHalvings: boolean;
  showEvents:   boolean;
  regimeLabel:  string;
  regimeColor:  string;
  exchPct:      number | null;
  change30d:    number | null;
  change90d:    number | null;
  btcClose:     number | null;
  scoreScore:   number;
  scoreLabel:   string;
  scoreColor:   string;
  generatedAt:  string;
  logoSrc?:     never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 22;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const HODL_WAVE_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtUSD(v: number | null): string {
  if (v == null) return 'â€”';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number | null): string {
  return v == null ? 'â€”' : `${v.toFixed(2)}%`;
}

function fmtPp(v: number | null): string {
  if (v == null) return 'â€”';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)} pp`;
}

export function HodlWaveShareCard({ payload }: { payload: HodlWaveSharePayload }) {
  const {
    points, showPrice, show30d, show90d, showHalvings, showEvents,
    regimeLabel, regimeColor,
    exchPct, change30d, change90d, btcClose,
    scoreScore, scoreLabel, scoreColor,
    generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const changeColor = change30d == null ? '#94A3B8' : change30d < 0 ? '#35D07F' : '#F85149';

  const stats = [
    { label: 'BTC Price',           value: fmtUSD(btcClose), sub: 'Latest close',          color: '#E6EDF3'    },
    { label: 'Exchange Reserve',    value: fmtPct(exchPct),  sub: '% of circulating supply', color: '#F7931A'  },
    { label: '30D Change',          value: fmtPp(change30d), sub: change30d != null ? (change30d < 0 ? 'Coins leaving exchanges' : 'Coins entering exchanges') : 'â€”', color: changeColor },
    { label: 'Distribution Score',  value: `${scoreScore}/100`, sub: scoreLabel,              color: scoreColor },
  ];

  // Pre-compute timestamps for static chart
  const chartData = points.map(p => ({
    ...p,
    ts: new Date(p.time + 'T00:00:00').getTime(),
  }));

  const prices   = points.map(p => p.btcClose).filter(v => v > 0);
  const pMin     = prices.length ? Math.max(1, Math.min(...prices) * 0.6) : 1;
  const pMax     = prices.length ? Math.max(...prices) * 2.5 : 200_000;
  const logTicks = LOG_TICKS.filter(t => t >= pMin && t <= pMax);

  const exchPcts = points.map(p => p.exchPct).filter(v => v > 0);
  const yMin     = exchPcts.length ? Math.max(0, Math.min(...exchPcts) * 0.85) : 5;
  const yMax     = exchPcts.length ? Math.max(...exchPcts) * 1.15 : 30;

  // Year tick marks from the data range
  const tMin = chartData.length ? chartData[0].ts : 0;
  const tMax = chartData.length ? chartData[chartData.length - 1].ts : 0;
  const yearMin = new Date(tMin).getFullYear();
  const yearMax = new Date(tMax).getFullYear();
  const yearTicks: number[] = [];
  for (let y = yearMin + 1; y <= yearMax; y++) {
    yearTicks.push(new Date(`${y}-01-01`).getTime());
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
            Bitcoin HODL Wave
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            Exchange reserve · long-term holder accumulation signal
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
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart
          data={chartData}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 8, right: 68, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />

          {/* Halvings */}
          {showHalvings && HALVINGS_WITH_EXCHANGE.map((h, i) => (
            <ReferenceLine
              key={i}
              yAxisId="exch"
              x={h.ts}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="4 5"
              label={{ value: h.label, position: 'insideTopRight', fill: 'rgba(255,255,255,0.25)', fontSize: 9, fontFamily: 'monospace' }}
            />
          ))}

          {/* Cycle events */}
          {showEvents && HODL_CYCLE_EVENTS.map((e, i) => (
            <ReferenceLine
              key={i}
              yAxisId="exch"
              x={new Date(e.time + 'T00:00:00').getTime()}
              stroke={e.color}
              strokeDasharray="3 4"
              strokeWidth={1}
              strokeOpacity={0.4}
              label={{ value: e.label, position: e.type === 'peak' ? 'insideTopLeft' : 'insideBottomLeft', fill: e.color, fontSize: 8, opacity: 0.7, fontFamily: 'monospace' }}
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

          {/* Left: exchange reserve % */}
          <YAxis
            yAxisId="exch"
            domain={[yMin, yMax]}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
            tick={{ fill: '#F7931A', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={46}
          />

          {/* Right: BTC price log */}
          <YAxis
            yAxisId="price"
            orientation="right"
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

          {/* BTC price â€” behind area */}
          {showPrice && (
            <Line yAxisId="price" type="monotone" dataKey="btcClose" stroke="rgba(230,237,243,0.6)" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          )}

          {/* Exchange reserve area */}
          <Area yAxisId="exch" type="monotone" dataKey="exchPct" stroke="#F7931A" strokeWidth={2} fill="rgba(247,147,26,0.10)" dot={false} isAnimationActive={false} connectNulls />

          {/* SMAs */}
          {show30d && (
            <Line yAxisId="exch" type="monotone" dataKey="exch30d" stroke="#F2B84B" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          )}
          {show90d && (
            <Line yAxisId="exch" type="monotone" dataKey="exch90d" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="5 3" dot={false} isAnimationActive={false} connectNulls />
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
              <span style={{ width: 14, height: 8, backgroundColor: '#F7931A', opacity: 0.4, display: 'inline-block', borderRadius: 2 }} />
              <span style={{ width: 14, height: 2, backgroundColor: '#F7931A', display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: '#8B949E' }}>Exchange Reserve</span>
            </div>
            {showPrice && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, backgroundColor: 'rgba(230,237,243,0.6)', display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: '#8B949E' }}>BTC Price</span>
              </div>
            )}
            {show30d && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, backgroundColor: '#F2B84B', display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: '#8B949E' }}>30D SMA</span>
              </div>
            )}
            {show90d && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, backgroundColor: '#3B82F6', display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: '#8B949E' }}>90D SMA</span>
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
