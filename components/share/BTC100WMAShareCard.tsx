"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { WeeklyPoint, RegimeSegment } from '@/lib/indicators/weeklyMA';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type BTC100WMASharePayload = {
  data:          WeeklyPoint[];
  regimes:       RegimeSegment[];
  latestClose:   number;
  latestMA100:   number | null;
  latestMA50:    number | null;
  latestMA200:   number | null;
  distancePct:   number | null;
  distanceColor: string;
  trendScoreNum: number;
  trendLabel:    string;
  trendColor:    string;
  slope:         number | null;
  slopeText:     string;
  slopeColor:    string;
  show50:        boolean;
  show100:       boolean;
  show200:       boolean;
  showShading:   boolean;
  generatedAt:   string;
  logoSrc?:      never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const BTC_100W_MA_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

const HALVINGS = [
  { date: '2012-11-26', label: 'H1' },
  { date: '2016-07-04', label: 'H2' },
  { date: '2020-05-11', label: 'H3' },
  { date: '2024-04-15', label: 'H4' },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtFull(n: number | null): string {
  if (n == null) return 'â€”';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number | null): string {
  if (n == null) return 'â€”';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// Closest Monday string in `allTimes` to a given date
function mondayOn(date: string, allTimes: string[]): string {
  const target = new Date(date + 'T00:00:00Z').getTime();
  return allTimes.reduce((best, t) =>
    Math.abs(new Date(t).getTime() - target) < Math.abs(new Date(best).getTime() - target) ? t : best,
  );
}

function regimeColor(r: RegimeSegment['regime']): string {
  return r === 'bullish' ? '#35D07F' : r === 'bearish' ? '#FF5C5C' : '#E6B450';
}

export function BTC100WMAShareCard({ payload }: { payload: BTC100WMASharePayload }) {
  const {
    data, regimes,
    latestClose, latestMA100, latestMA50, latestMA200,
    distancePct, distanceColor,
    trendScoreNum, trendLabel, trendColor,
    slope, slopeText, slopeColor,
    show50, show100, show200, showShading,
    generatedAt,
  } = payload;

  const allTimes = data.map((p) => p.time);

  const prices    = data.map((p) => p.close).filter((v) => v > 0);
  const pMin      = prices.length ? Math.max(0.01, Math.min(...prices) * 0.4) : 0.01;
  const pMax      = prices.length ? Math.max(...prices) * 2.5 : 1_000_000;
  const logTicks  = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const xTickTimes = allTimes.filter((t) => {
    const mo = t.slice(5, 7);
    const dy = parseInt(t.slice(8, 10));
    return mo === '01' && dy <= 7;
  });

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const stats = [
    { label: 'BTC Price',        value: fmtFull(latestClose),  sub: 'Weekly close',             color: '#F7931A'  },
    { label: '100-Week MA',      value: fmtFull(latestMA100),  sub: 'Medium-term trend',        color: '#EAB84D'  },
    { label: 'Distance 100W',    value: fmtPct(distancePct),   sub: distancePct == null ? 'â€”' : distancePct > 5 ? 'Above trend' : distancePct < -5 ? 'Below trend' : 'Testing zone', color: distanceColor },
    { label: 'Trend Score',      value: `${trendScoreNum}/100`, sub: trendLabel,                color: trendColor  },
  ];

  const legend = [
    { color: '#F7931A', label: 'BTC Price',  w: 2,   visible: true      },
    { color: '#EAB84D', label: '100W MA',    w: 2.5, visible: show100   },
    { color: '#3B82F6', label: '50W MA',     w: 1.5, visible: show50    },
    { color: '#A855F7', label: '200W MA',    w: 1.5, visible: show200   },
  ].filter((l) => l.visible);

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
            100-Week Moving Average
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 12px' }}>
            Medium-term trend · 50W / 100W / 200W MAs · Log scale
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 0' }}>{dateStr}</p>
          {slope != null && (
            <p style={{ fontSize: 10, color: slopeColor, margin: '2px 0 0' }}>
              Slope: {fmtPct(slope)} â€” {slopeText}
            </p>
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
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} />

          {/* Regime shading */}
          {showShading && regimes.map((seg, i) => (
            <ReferenceArea
              key={i}
              x1={seg.start}
              x2={seg.end}
              fill={regimeColor(seg.regime)}
              fillOpacity={0.055}
              stroke="none"
              ifOverflow="hidden"
            />
          ))}

          {/* Halving marks */}
          {HALVINGS.map((h) => (
            <ReferenceLine
              key={h.date}
              x={mondayOn(h.date, allTimes)}
              stroke="#374151"
              strokeDasharray="3 5"
              strokeWidth={1}
              label={{ value: h.label, position: 'insideTopRight', fill: '#4B5563', fontSize: 9 }}
            />
          ))}

          <XAxis
            dataKey="time"
            ticks={xTickTimes}
            tickFormatter={(v: string) => v.slice(0, 4)}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            interval="preserveStartEnd"
          />
          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={64}
            allowDataOverflow
          />

          {show200 && <Line dataKey="ma200" stroke="#A855F7" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
          {show50  && <Line dataKey="ma50"  stroke="#3B82F6" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
          {show100 && <Line dataKey="ma100" stroke="#EAB84D" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />}
                      <Line dataKey="close" stroke="#F7931A" strokeWidth={2}   dot={false} connectNulls isAnimationActive={false} />
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
            {legend.map((l) => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 16, height: l.w, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: l.color }}>{l.label}</span>
              </span>
            ))}
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
