"use client";

import {
  ComposedChart, Bar, Line, Cell, XAxis, YAxis,
  CartesianGrid, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { SoprPoint } from '@/lib/indicators/sopr';
import { SOPR_REGIME_BANDS } from '@/lib/indicators/sopr';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type SoprSharePayload = {
  points:      SoprPoint[];
  showPrice:   boolean;
  showSma30:   boolean;
  showSma90:   boolean;
  showShading: boolean;
  regimeLabel: string;
  regimeColor: string;
  rawSopr:     number | null;
  soprDev:     number | null;
  sma30:       number | null;
  sma90:       number | null;
  btcClose:    number | null;
  generatedAt: string;
  logoSrc?:    never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 10;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const SOPR_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

const HALVINGS = [
  { date: '2012-11-28', label: 'H1' },
  { date: '2016-07-09', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-19', label: 'H4' },
];

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

function fmt3(v: number | null): string {
  return v == null ? 'â€”' : v.toFixed(3);
}

export function SoprShareCard({ payload }: { payload: SoprSharePayload }) {
  const {
    points, showPrice, showSma30, showSma90, showShading,
    regimeLabel, regimeColor,
    rawSopr, soprDev, sma90, btcClose,
    generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const devColor = soprDev == null ? '#94A3B8' : soprDev >= 0 ? '#35D07F' : '#F85149';

  const stats = [
    { label: 'BTC Price',        value: fmtUSD(btcClose), sub: 'Latest close',          color: '#E6EDF3'    },
    { label: 'MVRV Ratio',       value: fmt3(rawSopr),    sub: (rawSopr ?? 0) >= 1 ? 'Above break-even' : 'Below break-even', color: devColor },
    { label: 'MVRV Deviation',   value: soprDev != null ? `${soprDev >= 0 ? '+' : ''}${soprDev.toFixed(3)}` : 'â€”',
                                  sub: soprDev != null ? (soprDev >= 0 ? 'Net profit territory' : 'Net loss territory') : 'â€”', color: devColor },
    { label: '90D Average',      value: fmt3(sma90),      sub: 'Trend baseline',         color: '#3B82F6'    },
  ];

  // X-axis year ticks (first 7 days of January)
  const xTicks = points
    .map(p => p.time)
    .filter(t => t.slice(5, 7) === '01' && parseInt(t.slice(8, 10)) <= 7);

  // Halving x-values: find closest date in dataset
  const dates = points.map(p => p.time);
  const halvingXs = HALVINGS.map(h => {
    const target = new Date(h.date).getTime();
    return dates.reduce((best, d) =>
      Math.abs(new Date(d).getTime() - target) < Math.abs(new Date(best).getTime() - target) ? d : best
    , dates[0]);
  });

  // Price axis domain
  const prices = points.map(p => p.btcClose).filter(v => v > 0);
  const pMin   = prices.length ? Math.max(0.01, Math.min(...prices) * 0.5) : 0.01;
  const pMax   = prices.length ? Math.max(...prices) * 2.0 : 1_000_000;
  const logTicks = LOG_TICKS.filter(t => t >= pMin && t <= pMax);

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
            Bitcoin SOPR
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            MVRV Deviation · profit/loss behavior of coins on-chain
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
          margin={{ top: 8, right: 68, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

          {/* Regime background bands */}
          {showShading && SOPR_REGIME_BANDS.map((b, i) => (
            <ReferenceArea
              key={i}
              yAxisId="sopr"
              y1={b.y1}
              y2={b.y2}
              fill={b.fill}
              fillOpacity={b.opacity}
              stroke="none"
              ifOverflow="hidden"
            />
          ))}

          {/* Halving markers */}
          {halvingXs.map((x, i) => (
            <ReferenceLine
              key={i}
              yAxisId="sopr"
              x={x}
              stroke="#374151"
              strokeDasharray="3 5"
              strokeWidth={1}
              label={{ value: HALVINGS[i].label, position: 'insideTopRight', fill: '#4B5563', fontSize: 9, fontFamily: 'monospace' }}
            />
          ))}

          {/* Break-even line */}
          <ReferenceLine
            yAxisId="sopr"
            y={0}
            stroke="#6F7A86"
            strokeWidth={1.5}
            label={{ value: '1.0', position: 'left', fill: '#6F7A86', fontSize: 10, fontFamily: 'monospace' }}
          />

          <XAxis
            dataKey="time"
            ticks={xTicks}
            tickFormatter={(v: string) => v.slice(0, 4)}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            interval="preserveStartEnd"
          />

          {/* Left: MVRV deviation */}
          <YAxis
            yAxisId="sopr"
            orientation="left"
            tickFormatter={(v: number) => v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />

          {/* Right: BTC price (log) */}
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

          {/* MVRV deviation bars */}
          <Bar yAxisId="sopr" dataKey="soprDeviation" isAnimationActive={false} maxBarSize={3}>
            {points.map((p, i) => (
              <Cell key={i} fill={p.soprDeviation >= 0 ? '#35D07F' : '#F85149'} fillOpacity={0.80} />
            ))}
          </Bar>

          {/* Optional SMAs */}
          {showSma30 && (
            <Line yAxisId="sopr" dataKey="sma30" stroke="#F2B84B" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          )}
          {showSma90 && (
            <Line yAxisId="sopr" dataKey="sma90" stroke="#3B82F6" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          )}

          {/* BTC price (right axis) */}
          {showPrice && (
            <Line yAxisId="price" dataKey="btcClose" stroke="#E6EDF3" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} opacity={0.7} />
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
              <span style={{ display: 'flex', gap: 2 }}>
                <span style={{ width: 6, height: 14, backgroundColor: '#35D07F', opacity: 0.8, display: 'inline-block', borderRadius: 2 }} />
                <span style={{ width: 6, height: 14, backgroundColor: '#F85149', opacity: 0.8, display: 'inline-block', borderRadius: 2 }} />
              </span>
              <span style={{ fontSize: 10, color: '#8B949E' }}>MVRV Deviation</span>
            </div>
            {showPrice && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, backgroundColor: '#E6EDF3', display: 'inline-block', borderRadius: 1, opacity: 0.7 }} />
                <span style={{ fontSize: 10, color: '#8B949E' }}>BTC Price</span>
              </div>
            )}
            {showSma30 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, backgroundColor: '#F2B84B', display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: '#8B949E' }}>30D Avg</span>
              </div>
            )}
            {showSma90 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, backgroundColor: '#3B82F6', display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: '#8B949E' }}>90D Avg</span>
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
