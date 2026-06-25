"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { HALVINGS } from '@/lib/indicators/cycleHelpers';
import type { MAPoint } from '@/lib/indicators/cycleHelpers';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type TwoYearMASharePayload = {
  data:        MAPoint[];
  latestPrice: number;
  latestMA:    number | null;
  latestMA5:   number | null;
  multiplier:  number | null;
  zoneLabel:   string;
  zoneColor:   string;
  generatedAt: string;
  logoSrc?:    never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 22;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const TWO_YEAR_MA_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const LOG_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];

const YEAR_TICKS = Array.from({ length: 17 }, (_, i) =>
  new Date(`${2012 + i}-01-01`).getTime(),
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtFull(n: number | null): string {
  if (n == null || n === 0) return 'â€”';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function TwoYearMAShareCard({ payload }: { payload: TwoYearMASharePayload }) {
  const { data, latestPrice, latestMA, latestMA5, multiplier, zoneLabel, zoneColor, generatedAt } = payload;

  const halvingTs = HALVINGS.slice(0, -1).map((h) => ({ ...h, ts: new Date(h.date).getTime() }));

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const stats = [
    { label: 'BTC Price',        value: fmtFull(latestPrice), sub: 'Latest close',             color: '#F7F9FC'  },
    { label: '2-Year MA',        value: fmtFull(latestMA),    sub: '730-day simple MA',         color: '#F7931A'  },
    { label: '2Y MA Ã— 5',        value: fmtFull(latestMA5),   sub: 'Historical top band',       color: '#FF5C5C'  },
    { label: 'Current Multiple', value: multiplier != null ? `${multiplier.toFixed(2)}Ã—` : 'â€”', sub: zoneLabel, color: zoneColor },
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
            2-Year Moving Average
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 12px' }}>
            Accumulate below 2YMA · Distribute above 2YMAÃ—5 · Log scale
          </p>
          {/* Legend */}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 0' }}>{dateStr}</p>
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
          margin={{ top: 4, right: 8, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {halvingTs.map((h) => (
            <ReferenceLine
              key={h.date}
              x={h.ts}
              stroke="rgba(100,100,120,0.4)"
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{ value: h.label, position: 'top', fill: 'rgba(100,100,120,0.7)', fontSize: 9 }}
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={YEAR_TICKS}
            tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            scale="log"
            domain={[100, 'auto']}
            ticks={LOG_TICKS}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={56}
          />

          <Line type="monotone" dataKey="ma5"   stroke="#FF5C5C" strokeWidth={1.5} strokeDasharray="6 3" dot={false} isAnimationActive={false} connectNulls={false} />
          <Line type="monotone" dataKey="ma"    stroke="#F7931A" strokeWidth={2}   dot={false} isAnimationActive={false} connectNulls={false} />
          <Line type="monotone" dataKey="price" stroke="rgba(247,249,252,0.9)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
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
              <span style={{ width: 16, height: 2, backgroundColor: 'rgba(247,249,252,0.9)', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#F7F9FC' }}>BTC Price</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 2, backgroundColor: '#F7931A', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#F7931A' }}>2Y MA</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 0, borderTop: '2px dashed #FF5C5C', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#FF5C5C' }}>2Y MA Ã—5</span>
            </span>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
