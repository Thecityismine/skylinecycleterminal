"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { RatioPoint, RatioKey } from '@/lib/api/ratios';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type RatioSharePayload = {
  data:          RatioPoint[];
  ratioKey:      RatioKey;
  ratioLabel:    string;
  ratioDesc:     string;
  logScale:      boolean;
  range:         string;
  current:       number | null;
  ath:           number | null;
  pctFromAth:    number | null;
  oneYearChange: number | null;
  generatedAt:   string;
  logoSrc?:      never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 60;
const GAP      = 8;
const STATS_GAP = 20;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const RATIO_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const COLORS: Record<RatioKey, { stroke: string; fill: string }> = {
  btc_ixic: { stroke: '#F7931A', fill: 'rgba(247,147,26,0.12)'  },
  btc_spx:  { stroke: '#53A7FF', fill: 'rgba(83,167,255,0.12)'  },
  eth_ixic: { stroke: '#9B8CFF', fill: 'rgba(155,140,255,0.12)' },
  btc_eth:  { stroke: '#35D07F', fill: 'rgba(53,208,127,0.10)'  },
  eth_btc:  { stroke: '#A78BFA', fill: 'rgba(167,139,250,0.10)' },
};

const HALVINGS = [
  { ts: new Date('2016-07-09').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19').getTime(), label: 'H4' },
];

const YEAR_TICKS = Array.from({ length: 13 }, (_, i) =>
  new Date(`${2014 + i}-01-01`).getTime(),
);

function fmtRatio(v: number): string {
  if (v >= 100) return v.toFixed(1);
  if (v >= 10)  return v.toFixed(2);
  if (v >= 1)   return v.toFixed(3);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(6);
}

function fmtR(v: number | null): string {
  if (v == null) return 'â€”';
  return fmtRatio(v);
}

function fmtPct(v: number | null): string {
  if (v == null) return 'â€”';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function RatioShareCard({ payload }: { payload: RatioSharePayload }) {
  const {
    data, ratioKey, ratioLabel, ratioDesc, logScale, range,
    current, ath, pctFromAth, oneYearChange,
    generatedAt,
  } = payload;

  const col = COLORS[ratioKey];

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const pctColor = (pctFromAth ?? 0) < -30 ? '#35D07F' : '#FF5C5C';
  const chgColor = (oneYearChange ?? 0) >= 0 ? '#35D07F' : '#FF5C5C';

  const stats = [
    { label: 'Current Ratio',  value: fmtR(current),       sub: ratioLabel,                  color: col.stroke },
    { label: 'All-Time High',  value: fmtR(ath),            sub: 'Ratio peak (since 2015)',    color: '#F7F9FC'  },
    { label: '% from ATH',     value: fmtPct(pctFromAth),   sub: 'vs. historical peak ratio',  color: pctColor   },
    { label: '1Y Change',      value: fmtPct(oneYearChange), sub: 'Ratio change past 12 months', color: chgColor  },
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
            {ratioLabel}
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 12px' }}>
            Relative strength · {ratioDesc}
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
              {range}
            </span>
            {logScale && (
              <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
                Log
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
        marginBottom:        GAP,
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            backgroundColor: '#161B22',
            border:          '1px solid #21262D',
            borderRadius:    8,
            padding:         '6px 12px',
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
        <AreaChart
          data={data}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 12, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {HALVINGS.map((h) => (
            <ReferenceLine
              key={h.ts} x={h.ts}
              stroke="rgba(255,200,50,0.35)" strokeDasharray="4 6"
              label={{ value: h.label, position: 'insideTopRight', fontSize: 9, fill: 'rgba(255,200,50,0.6)' }}
            />
          ))}

          <XAxis
            dataKey="ts" type="number" scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={YEAR_TICKS}
            tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }} tickLine={false}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtRatio}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }} tickLine={false}
            width={60}
          />

          <Area
            type="monotone" dataKey="value"
            stroke={col.stroke} strokeWidth={2}
            fill={col.fill}
            dot={false} isAnimationActive={false} connectNulls
          />
        </AreaChart>
      </div>

      {/* Footer */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ width: 16, height: 2, backgroundColor: col.stroke, display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: col.stroke }}>{ratioLabel}</span>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
