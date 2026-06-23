"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import {
  HALVINGS,
  CYCLE_FILL,
  CYCLE_STROKE,
  CYCLE_LABEL,
} from '@/lib/indicators/cycleHelpers';
import type { CyclePoint } from '@/lib/indicators/cycleHelpers';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type FourYearCycleSharePayload = {
  data:            CyclePoint[];
  cycleNum:        number;
  daysSince:       number;
  cycleProgress:   number;
  daysToNext:      number;
  nextHalvingDate: string;
  generatedAt:     string;
  logoSrc?:        never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const FOUR_YEAR_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

const YEAR_TICKS = Array.from({ length: 17 }, (_, i) =>
  new Date(`${2012 + i}-01-01`).getTime(),
);

export function FourYearCycleShareCard({ payload }: { payload: FourYearCycleSharePayload }) {
  const { data, cycleNum, daysSince, cycleProgress, daysToNext, nextHalvingDate, generatedAt } = payload;

  const halvingTs = HALVINGS.map((h) => ({ ...h, ts: new Date(h.date).getTime() }));

  const cycleColor    = CYCLE_STROKE[cycleNum] ?? '#F7F9FC';
  const progressColor = cycleProgress > 75 ? '#FF5C5C' : cycleProgress > 50 ? '#F59E0B' : '#35D07F';

  const stats = [
    { label: 'Current Cycle',     value: `Cycle ${cycleNum}`,              sub: CYCLE_LABEL[cycleNum],         color: cycleColor    },
    { label: 'Days Since Halving', value: daysSince.toLocaleString(),        sub: 'of ~1,460 day epoch',         color: '#F7F9FC'     },
    { label: 'Cycle Progress',     value: `${cycleProgress}%`,              sub: 'of 4-year window',            color: progressColor },
    { label: 'Next Halving',       value: `${daysToNext.toLocaleString()} days`, sub: `est. ${nextHalvingDate}`, color: '#8B949E'     },
  ];

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

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
            Bitcoin 4-Year Cycle
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 12px' }}>
            Halving-driven cycle epochs · log scale
          </p>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            {[1, 2, 3, 4].map((c) => (
              <span key={c} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 2,
                  backgroundColor: CYCLE_STROKE[c], opacity: 0.7,
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 10, color: CYCLE_STROKE[c] }}>{CYCLE_LABEL[c]}</span>
              </span>
            ))}
          </div>
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
        marginBottom:        GAP,
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            backgroundColor: '#161B22',
            border:          '1px solid #21262D',
            borderRadius:    8,
            padding:         '10px 12px',
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

          {/* Pre-cycle zone */}
          <ReferenceArea
            x1={data[0]?.ts}
            x2={halvingTs[0].ts}
            fill={CYCLE_FILL[0]}
            strokeOpacity={0}
          />

          {/* Cycle zones between halvings */}
          {halvingTs.slice(0, -1).map((h, i) => (
            <ReferenceArea
              key={h.date}
              x1={h.ts}
              x2={halvingTs[i + 1].ts}
              fill={CYCLE_FILL[h.cycle]}
              strokeOpacity={0}
            />
          ))}

          {/* Current cycle zone */}
          <ReferenceArea
            x1={halvingTs[halvingTs.length - 1].ts}
            fill={CYCLE_FILL[halvingTs[halvingTs.length - 1].cycle]}
            strokeOpacity={0}
          />

          {/* Halving lines (skip estimated future) */}
          {halvingTs.slice(0, -1).map((h) => (
            <ReferenceLine
              key={h.date}
              x={h.ts}
              stroke={CYCLE_STROKE[h.cycle]}
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{
                value:    h.label,
                position: 'top',
                fill:     CYCLE_STROKE[h.cycle],
                fontSize: 9,
              }}
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
            domain={[1, 'auto']}
            ticks={LOG_TICKS}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={56}
          />

          <Line
            type="monotone"
            dataKey="price"
            stroke="rgba(247,249,252,0.9)"
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
        justifyContent: 'flex-end',
      }}>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
