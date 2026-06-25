"use client";

import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { PowerLawPoint } from '@/lib/indicators/powerLaw';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type PowerLawSharePayload = {
  data:       PowerLawPoint[];
  range:      string;
  price:      number | null;
  fair:       number | null;
  floor:      number | null;
  ceil:       number | null;
  pctVsFair:  number | null;
  leadFloor:  number | null;
  leadCeil:   number | null;
  zoneLabel:  string | null;
  zoneColor:  string | null;
  generatedAt: string;
  logoSrc?:   never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 22;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const POWER_LAW_CARD_CHART_RECT = {
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
  if (v == null) return 'â€”';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number | null): string {
  if (v == null) return 'â€”';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}% vs fair`;
}

function fmtYrs(v: number | null): string {
  if (v == null) return 'â€”';
  if (Math.abs(v) < 0.1) return '< 0.1y';
  return `Lead: ${v >= 0 ? '+' : ''}${v.toFixed(1)}y`;
}

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  if (v >= 1)         return `$${v.toFixed(0)}`;
  return `$${v.toFixed(2)}`;
}

export function PowerLawShareCard({ payload }: { payload: PowerLawSharePayload }) {
  const {
    data, range, price, fair, floor, ceil,
    pctVsFair, leadFloor, leadCeil,
    zoneLabel, zoneColor, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const resolvedZoneColor = zoneColor ?? '#6B7280';

  // Dynamic year ticks from data range
  const tsMin = data[0]?.ts ?? 0;
  const tsMax = data[data.length - 1]?.ts ?? 0;
  const yearMin = new Date(tsMin).getUTCFullYear();
  const yearMax = new Date(tsMax).getUTCFullYear() + 1;
  const yearTicks: number[] = [];
  for (let y = yearMin + 1; y <= yearMax; y++) {
    yearTicks.push(new Date(`${y}-01-01T00:00:00Z`).getTime());
  }

  const halvingTs = HALVINGS.map(h => new Date(h.date + 'T00:00:00Z').getTime());

  const stats = [
    { label: 'BTC Price',       value: fmtUSD(price), sub: 'Latest close',     color: '#F7F9FC'   },
    { label: 'Fair Value',      value: fmtUSD(fair),  sub: fmtPct(pctVsFair),  color: '#38BDF8'   },
    { label: 'Floor (Ã—0.42)',   value: fmtUSD(floor), sub: fmtYrs(leadFloor),  color: '#818CF8'   },
    { label: 'Ceiling (Ã—4.27)', value: fmtUSD(ceil),  sub: fmtYrs(leadCeil),   color: '#F472B6'   },
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
            Bitcoin Power Law
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            logâ‚â‚€(P) = 5.82 Ã— logâ‚â‚€(days) âˆ’ 16.73 · Log scale{range !== 'All' ? ` · ${range}` : ''}
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
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
          margin={{ top: 8, right: 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {halvingTs.map((ts, i) => (
            <ReferenceLine
              key={ts}
              x={ts}
              stroke="rgba(100,100,120,0.3)"
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{
                value: HALVINGS[i].label,
                position: 'top',
                fill: 'rgba(100,100,120,0.6)',
                fontSize: 9,
                fontFamily: 'monospace',
              }}
            />
          ))}

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
            scale="log"
            domain={[1, 'auto']}
            ticks={LOG_TICKS}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#1E293B' }}
            tickLine={false}
            width={64}
            allowDataOverflow
          />

          {/* Ceiling â€” pink */}
          <Line
            type="monotone"
            dataKey="ceil"
            stroke="#F472B6"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Fair Value â€” cyan */}
          <Line
            type="monotone"
            dataKey="fair"
            stroke="#38BDF8"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Floor â€” indigo */}
          <Line
            type="monotone"
            dataKey="floor"
            stroke="#818CF8"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* BTC Price â€” white on top */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="rgba(247,249,252,0.9)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
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
              { color: 'rgba(247,249,252,0.9)', label: 'BTC Price'       },
              { color: '#F472B6',              label: 'Ceiling (Ã—4.27)' },
              { color: '#38BDF8',              label: 'Fair Value'       },
              { color: '#818CF8',              label: 'Floor (Ã—0.42)'   },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 16, height: 2, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
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
