"use client";

import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { RealizedVolPoint, VolZone } from '@/lib/indicators/realizedVolatility';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import { formatCardDate } from '@/lib/share/cardDate';

export type RealizedVolSharePayload = {
  data:         RealizedVolPoint[];
  timeframe:    string;
  show90:       boolean;
  showPrice:    boolean;
  rv30:         number | null;
  rv90:         number | null;
  percentile:   number | null;
  longRunMean:  number | null;
  compressedAt: number | null;
  vsLongRunPct: number | null;
  drawdownPct:  number | null;
  zone:         VolZone;
  zoneLabel:    string;
  zoneColor:    string;
  signalActive: boolean;
  price:        number | null;
  livePrice?:   number | null;
  generatedAt:  string;
  logoSrc?:     never;
};

const PAD       = 32;
const HEADER_H  = 72;
const STATS_H   = 52;
const GAP       = 10;
const STATS_GAP = 22;
const FOOTER_H  = 24;
const CHART_H   = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W   = SHARE_CARD_WIDTH - PAD * 2;

export const REALIZED_VOL_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const HALVINGS = [
  new Date('2012-11-28T00:00:00Z').getTime(),
  new Date('2016-07-09T00:00:00Z').getTime(),
  new Date('2020-05-11T00:00:00Z').getTime(),
  new Date('2024-04-19T00:00:00Z').getTime(),
];

// Starts at 2012 rather than 2010 to match the history window the indicator is
// computed over — see the note in the page. An axis that opens two years before
// the first data point just renders empty gutter.
const YEAR_TICKS = Array.from({ length: 15 }, (_, i) =>
  new Date(`${2012 + i}-01-01T00:00:00Z`).getTime(),
);

function fmtVol(v: number | null): string { return v == null ? '—' : `${v.toFixed(1)}%`; }
function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
function ordinal(n: number): string {
  const r = Math.round(n);
  const s = ['th', 'st', 'nd', 'rd'], v = r % 100;
  return r + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function RealizedVolShareCard({ payload }: { payload: RealizedVolSharePayload }) {
  const {
    data, timeframe, show90, showPrice,
    rv30, rv90, percentile, longRunMean, compressedAt, vsLongRunPct, drawdownPct,
    zoneLabel, zoneColor, signalActive, price, livePrice,
  } = payload;

  const dateStr = formatCardDate(payload);

  const stats = [
    {
      label: '30-Day Realized Vol',
      value: fmtVol(rv30),
      sub:   zoneLabel,
      color: zoneColor,
    },
    {
      label: '90-Day Realized Vol',
      value: fmtVol(rv90),
      sub:   'Slower confirmation',
      color: '#A78BFA',
    },
    {
      label: 'Historical Percentile',
      value: percentile == null ? '—' : ordinal(percentile),
      sub:   longRunMean == null
        ? 'Insufficient history'
        : `Long-run avg ${longRunMean.toFixed(0)}%${vsLongRunPct != null ? ` · at ${vsLongRunPct.toFixed(0)}%` : ''}`,
      color: zoneColor,
    },
    {
      label: 'BTC Price',
      value: fmtUSD(livePrice ?? price),
      sub:   `${livePrice != null ? 'Live spot' : 'Latest close'}${drawdownPct != null ? ` · ${drawdownPct.toFixed(1)}% from ATH` : ''}`,
      color: '#F7931A',
    },
  ];

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
            Bitcoin Realized Volatility
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            Annualized std. dev. of daily log returns
            {timeframe !== 'All' ? ` · ${timeframe}` : ''}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
              {timeframe}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              backgroundColor: signalActive ? 'rgba(53,208,127,0.15)' : '#21262D',
              fontSize: 10, color: signalActive ? '#35D07F' : '#8B949E',
            }}>
              {signalActive ? 'Capitulation signal' : 'Signal inactive'}
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
          data={data}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 6, right: showPrice ? 52 : 12, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {compressedAt != null && (
            <ReferenceArea
              yAxisId="vol" y1={0} y2={compressedAt}
              fill="rgba(53,208,127,0.10)" stroke="none" ifOverflow="hidden"
            />
          )}

          <XAxis
            dataKey="ts" type="number" scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={YEAR_TICKS}
            tickFormatter={(ts: number) => new Date(ts).getUTCFullYear().toString()}
            stroke="#484F58"
            tick={{ fontSize: 10, fill: '#6B7280' }}
          />

          <YAxis
            yAxisId="vol" orientation="left"
            domain={[0, 200]} allowDataOverflow
            tickFormatter={(v: number) => `${v}%`}
            stroke="#484F58"
            tick={{ fontSize: 10, fill: '#6B7280' }}
            width={44}
          />

          {showPrice && (
            <YAxis
              yAxisId="price" orientation="right" scale="log"
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
              stroke="#F7931A"
              tick={{ fontSize: 9, fill: '#F7931A' }}
              width={48}
            />
          )}

          {longRunMean != null && (
            <ReferenceLine
              yAxisId="vol" y={longRunMean}
              stroke="#6B7280" strokeDasharray="4 4"
            />
          )}

          {HALVINGS.map((ts) => (
            <ReferenceLine
              key={ts} yAxisId="vol" x={ts}
              stroke="#F7931A" strokeDasharray="2 4" strokeOpacity={0.5}
            />
          ))}

          {showPrice && (
            <Line
              yAxisId="price" type="monotone" dataKey="price"
              stroke="#F7931A" strokeWidth={1} strokeOpacity={0.45}
              dot={false} isAnimationActive={false}
            />
          )}

          {show90 && (
            <Line
              yAxisId="vol" type="monotone" dataKey="rv90"
              stroke="#A78BFA" strokeWidth={1.3}
              dot={false} connectNulls isAnimationActive={false}
            />
          )}

          <Line
            yAxisId="vol" type="monotone" dataKey="rv30"
            stroke="#38BDF8" strokeWidth={1.5}
            dot={false} connectNulls isAnimationActive={false}
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
            { color: '#38BDF8', label: '30d vol' },
            ...(show90 ? [{ color: '#A78BFA', label: '90d vol' }] : []),
            { color: 'rgba(53,208,127,0.5)', label: `Compression <${fmtVol(compressedAt)}` },
            ...(showPrice ? [{ color: '#F7931A', label: 'BTC price' }] : []),
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color, display: 'inline-block' }} />
              <span style={{ fontSize: 9, color: '#6B7280' }}>{l.label}</span>
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
