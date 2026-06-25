"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { CycleMasterPoint } from '@/lib/indicators/cycleMaster';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type CycleMasterSharePayload = {
  data:        CycleMasterPoint[];
  range:       string;
  logScale:    boolean;
  price:       number | null;
  realized:    number | null;
  transferred: number | null;
  mvrv:        number | null;
  score:       number | null;
  scoreLabel:  string | null;
  scoreColor:  string | null;
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

export const CYCLE_MASTER_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

const HALVINGS = [
  { date: '2012-11-28', label: 'H1' },
  { date: '2016-07-09', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-19', label: 'H4' },
];

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function CycleMasterShareCard({ payload }: { payload: CycleMasterSharePayload }) {
  const {
    data, range, logScale,
    price, realized, transferred, mvrv,
    score, scoreLabel, scoreColor,
    generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const resolvedScoreColor = scoreColor ?? '#94A3B8';

  const mvrvSub = mvrv == null ? '—'
    : mvrv < 1.0 ? 'Below cost basis'
    : mvrv < 2.0 ? 'Accumulation zone'
    : mvrv < 3.5 ? 'Expansion / elevated'
    : 'Distribution risk';

  const stats = [
    { label: 'BTC Price',      value: fmtUSD(price),                               sub: 'Current market price',  color: '#F7931A'          },
    { label: 'MVRV Ratio',     value: mvrv != null ? `${mvrv.toFixed(2)}Ã—` : '—', sub: mvrvSub,                 color: '#A78BFA'          },
    { label: 'Realized Price', value: fmtUSD(realized),                            sub: 'Avg on-chain cost basis', color: '#3B82F6'         },
    { label: 'Cycle Score',    value: score != null ? `${score.toFixed(0)} / 100` : '—', sub: scoreLabel ?? '—', color: resolvedScoreColor },
  ];

  // Compute year ticks from data
  const yearTicks: number[] = [];
  const seenYears = new Set<number>();
  for (const d of data) {
    const yr = new Date(d.ts).getUTCFullYear();
    if (!seenYears.has(yr)) { seenYears.add(yr); yearTicks.push(d.ts); }
  }

  // Y-axis domain (log or linear)
  const prices = data.map(d => d.price).filter(v => v > 0);
  const pMin   = logScale && prices.length ? Math.max(0.1, Math.min(...prices) * 0.5) : undefined;
  const pMax   = prices.length ? Math.max(...prices) * 2.5 : undefined;
  const logTicksFiltered = logScale && pMin != null && pMax != null
    ? LOG_TICKS.filter(t => t >= pMin && t <= pMax)
    : undefined;

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
            Bitcoin Cycle Master
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            On-chain valuation · Terminal · Transferred · Realized · Balance{range !== 'All' ? ` · ${range}` : ''}{logScale ? ' · Log' : ''}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          {scoreLabel && (
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              backgroundColor: resolvedScoreColor + '20',
              fontSize: 10, color: resolvedScoreColor,
            }}>
              {scoreLabel}
            </span>
          )}
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
          margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts: number) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
          />

          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={logScale ? [pMin ?? 0.1, pMax ?? 'auto'] : ['auto', 'auto']}
            ticks={logScale ? logTicksFiltered : undefined}
            tickFormatter={fmtUSD}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={64}
            allowDataOverflow
          />

          {/* Shaded bands */}
          <Area type="monotone" dataKey="realized"    name="_r" stroke="none" fill="#3B82F620" fillOpacity={1} dot={false} isAnimationActive={false} connectNulls legendType="none" />
          <Area type="monotone" dataKey="transferred" name="_t" stroke="none" fill="#94A3B810" fillOpacity={1} dot={false} isAnimationActive={false} connectNulls legendType="none" />
          <Area type="monotone" dataKey="terminal"    name="_n" stroke="none" fill="#EAB84D10" fillOpacity={1} dot={false} isAnimationActive={false} connectNulls legendType="none" />

          {/* Lines */}
          <Line type="monotone" dataKey="balance"     name="balance"     stroke="#35D07F" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="realized"    name="realized"    stroke="#3B82F6" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="transferred" name="transferred" stroke="#EAB84D" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="price"       name="price"       stroke="#F7931A" strokeWidth={2}   dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="terminal"    name="terminal"    stroke="#FF5C68" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />

          {/* Halving lines */}
          {HALVINGS.map((h) => (
            <ReferenceLine
              key={h.date}
              x={new Date(h.date + 'T00:00:00Z').getTime()}
              stroke="#4B5563"
              strokeDasharray="3 5"
              strokeWidth={1}
              label={{ value: h.label, position: 'insideTopRight', fill: '#4B5563', fontSize: 9, fontFamily: 'monospace' }}
            />
          ))}
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
            {[
              { color: '#F7931A', label: 'Price'       },
              { color: '#FF5C68', label: 'Terminal'    },
              { color: '#EAB84D', label: 'Transferred' },
              { color: '#3B82F6', label: 'Realized'    },
              { color: '#35D07F', label: 'Balance'     },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, height: 2, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
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
