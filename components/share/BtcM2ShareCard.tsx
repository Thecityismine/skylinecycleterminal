"use client";

import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { BtcM2Point } from '@/lib/indicators/btcM2';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type BtcM2SharePayload = {
  points:    BtcM2Point[];
  range:     string;
  logScale:  boolean;
  ratio:     number | null;
  ema200:    number | null;
  ema400:    number | null;
  sma52:     number | null;
  zoneLabel: string | null;
  zoneColor: string | null;
  generatedAt: string;
  logoSrc?:  never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 10;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const BTC_M2_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

function fmt(v: number | null, d = 2): string {
  return v == null ? '—' : v.toFixed(d);
}

export function BtcM2ShareCard({ payload }: { payload: BtcM2SharePayload }) {
  const {
    points, range, logScale, ratio, ema200, ema400, sma52,
    zoneLabel, zoneColor, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  // Dynamic year ticks from data range
  const tsMin = points[0]?.ts ?? 0;
  const tsMax = points[points.length - 1]?.ts ?? 0;
  const yearMin = new Date(tsMin).getUTCFullYear();
  const yearMax = new Date(tsMax).getUTCFullYear() + 1;
  const yearTicks: number[] = [];
  for (let y = yearMin + 1; y <= yearMax; y++) {
    yearTicks.push(new Date(`${y}-01-01T00:00:00Z`).getTime());
  }

  const stats = [
    { label: 'Current Ratio',  value: fmt(ratio),  sub: 'BTC price Ã· M2 (Ã—1000)',    color: '#F7F9FC' },
    { label: '200 EMA',        value: fmt(ema200), sub: ratio != null && ema200 != null ? (ratio > ema200 ? 'â†‘ Price above' : 'â†“ Price below') : '—', color: '#35D07F' },
    { label: '400 EMA',        value: fmt(ema400), sub: ratio != null && ema400 != null ? (ratio > ema400 ? 'â†‘ Price above' : 'â†“ Price below') : '—', color: '#FF5C5C' },
    { label: '52-Week SMA',    value: fmt(sma52),  sub: '1-year simple average',       color: '#E6B450' },
  ];

  const resolvedZoneColor = zoneColor ?? '#6B7280';

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
            BTC / M2 Money Supply
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            Weekly BTC price Ã· US M2 · strips out monetary expansion{logScale ? ' · Log scale' : ''}
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
            {zoneLabel && (
              <span style={{
                padding: '2px 8px', borderRadius: 4,
                backgroundColor: resolvedZoneColor + '20',
                fontSize: 10, color: resolvedZoneColor,
              }}>
                {zoneLabel}
              </span>
            )}
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
          data={points}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 8, right: 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.5)" vertical={false} />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts: number) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#1E293B' }}
            tickLine={false}
          />

          <YAxis
            scale={logScale ? 'log' : 'auto'}
            domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
            allowDataOverflow
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#1E293B' }}
            tickLine={false}
            width={52}
          />

          {/* 400 EMA — red */}
          <Line
            type="monotone"
            dataKey="ema400"
            stroke="#FF5C5C"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* 200 EMA — green */}
          <Line
            type="monotone"
            dataKey="ema200"
            stroke="#35D07F"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* 52 SMA — dashed yellow */}
          <Line
            type="monotone"
            dataKey="sma52"
            stroke="#E6B450"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />

          {/* BTC/M2 ratio — white on top */}
          <Line
            type="monotone"
            dataKey="ratio"
            stroke="rgba(247,249,252,0.85)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
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
              { color: 'rgba(247,249,252,0.85)', label: 'BTC / M2' },
              { color: '#35D07F',               label: '200 EMA'   },
              { color: '#FF5C5C',               label: '400 EMA'   },
              { color: '#E6B450',               label: '52 SMA', dashed: true },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  display:         'inline-block',
                  width:           16,
                  height:          l.dashed ? 0 : 2,
                  backgroundColor: l.dashed ? undefined : l.color,
                  borderTop:       l.dashed ? `2px dashed ${l.color}` : undefined,
                  borderRadius:    1,
                }} />
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
