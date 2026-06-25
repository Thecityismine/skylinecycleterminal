"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Customized,
} from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import type { CrossEvent, CrossRegime } from '@/lib/indicators/goldenDeathCross';
import { REGIMES } from '@/lib/indicators/goldenDeathCross';

type ChartPoint = {
  time:   string;
  ts:     number;
  price:  number;
  ma50:   number | null;
  ma200:  number | null;
  spread: number | null;
};

export type GoldenDeathCrossSharePayload = {
  chartPoints:    ChartPoint[];
  crossEvents:    CrossEvent[];
  startTs:        number;
  price:          number;
  ma50:           number | null;
  ma200:          number | null;
  spread:         number | null;
  regime:         CrossRegime;
  confidence:     number;
  daysSinceCross: number | null;
  lastCrossType:  'golden' | 'death' | null;
  lastCrossDate:  string | null;
  logScale:       boolean;
  rangeLabel:     string;
  generatedAt:    string;
};

// ── Layout — exact match to WeeklySMAShareCard ───────────────────────────────
const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 60;
const GAP      = 8;
const STATS_GAP = 20;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH  - PAD * 2;

export const GOLDEN_DEATH_CROSS_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

// ── Colors ───────────────────────────────────────────────────────────────────
const PRICE = '#F5F7FA';
const GOLD  = '#EAB84D';
const BLUE  = '#5B84FF';
const GREEN = '#35D07F';
const RED   = '#F85149';

const YEAR_TICKS = Array.from({ length: 22 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime()
);

function fmtP(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// ── Neon cross dots (same as main chart) ────────────────────────────────────
function CardCrossDotsLayer({ xAxisMap, yAxisMap, crossEvents, startTs, offset }: any) {
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
  const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const chartBottom = (offset?.top ?? 0) + (offset?.height ?? 0);
  const elements: React.ReactElement[] = [];

  for (const ev of crossEvents as CrossEvent[]) {
    if (ev.ts < (startTs as number)) continue;
    const cx = xAxis.scale(ev.ts);
    const cy = yAxis.scale((ev.ma50 + ev.ma200) / 2);
    if (!isFinite(cx) || !isFinite(cy)) continue;

    const isGolden = ev.type === 'golden';
    const color    = isGolden ? GREEN : RED;
    const fid      = isGolden ? 'gdc-card-g' : 'gdc-card-r';

    elements.push(
      <g key={`${ev.type}-${ev.ts}`}>
        <line x1={cx} y1={cy} x2={cx} y2={chartBottom} stroke={color} strokeWidth={1} strokeDasharray="3 4" opacity={0.25} />
        <circle cx={cx} cy={cy} r={18} fill={color} opacity={0.08} />
        <circle cx={cx} cy={cy} r={11} fill={color} opacity={0.18} />
        <circle cx={cx} cy={cy} r={5}  fill={color} opacity={1}    filter={`url(#${fid})`} />
      </g>
    );
  }

  return (
    <g>
      <defs>
        <filter id="gdc-card-g" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="gdc-card-r" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {elements}
    </g>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function GoldenDeathCrossShareCard({ payload }: { payload: GoldenDeathCrossSharePayload }) {
  const {
    chartPoints, crossEvents, startTs,
    price, ma50, ma200, spread,
    regime, confidence, daysSinceCross, lastCrossType,
    logScale, rangeLabel, generatedAt,
  } = payload;

  const ri      = REGIMES[regime];
  const visible = chartPoints.filter((p) => p.ts >= startTs);
  const ticks   = YEAR_TICKS.filter((t) => t >= startTs);

  const spreadColor = (spread ?? 0) >= 0 ? GREEN : RED;
  const spreadFmt   = spread !== null ? `${spread > 0 ? '+' : ''}${spread.toFixed(1)}%` : '—';

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const stats = [
    { label: 'BTC Price', value: fmtP(price), sub: 'Bitcoin price',     color: PRICE },
    { label: '50D MA',    value: fmtP(ma50),  sub: 'Short-term trend',  color: GOLD  },
    { label: '200D MA',   value: fmtP(ma200), sub: 'Long-term floor',   color: BLUE  },
    {
      label: 'Cross Signal',
      value: ri.shortLabel,
      sub:   daysSinceCross !== null
        ? `${daysSinceCross}d since last ${lastCrossType} cross`
        : ri.posture.slice(0, 40),
      color: ri.color,
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

      {/* ── Header ── */}
      <div style={{
        height:         HEADER_H,
        flex:           `0 0 ${HEADER_H}px`,
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>
            BTC Golden / Death Cross
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            50D &amp; 200D moving average crossovers
            {' · '}{rangeLabel === 'All' ? 'Full history' : rangeLabel}
            {logScale ? ' · Log scale' : ''}
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
              {rangeLabel}
            </span>
            {logScale && (
              <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
                Log
              </span>
            )}
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
              backgroundColor: ri.color + '20', color: ri.color,
            }}>
              {ri.shortLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
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

      {/* ── Chart ── */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart
          data={visible}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 12, right: 16, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={ticks}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtP}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={60}
          />

          {/* 200D first, 50D second, price on top */}
          <Line type="monotone" dataKey="ma200" stroke={BLUE}  strokeWidth={2} strokeOpacity={0.9} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey="ma50"  stroke={GOLD}  strokeWidth={2} strokeOpacity={0.9} dot={false} isAnimationActive={false} connectNulls />
          <Area type="monotone" dataKey="price" stroke={PRICE} strokeWidth={2.5} fill="rgba(245,247,250,0.03)" dot={false} isAnimationActive={false} connectNulls />

          <Customized
            component={(props: any) => (
              <CardCrossDotsLayer {...props} crossEvents={crossEvents} startTs={startTs} />
            )}
          />
        </ComposedChart>
      </div>

      {/* ── Footer ── */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {[
            { color: PRICE, label: 'Price',    dot: false },
            { color: GOLD,  label: '50D MA',   dot: false },
            { color: BLUE,  label: '200D MA',  dot: false },
            { color: GREEN, label: 'Golden',   dot: true  },
            { color: RED,   label: 'Death',    dot: true  },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {l.dot
                ? <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: l.color, display: 'inline-block' }} />
                : <span style={{ width: 16, height: 2, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
              }
              <span style={{ fontSize: 10, color: '#8B949E' }}>{l.label}</span>
            </div>
          ))}
          {spread !== null && (
            <div style={{ fontSize: 10, color: '#484F58' }}>
              Spread: <span style={{ color: spreadColor }}>{spreadFmt}</span>
            </div>
          )}
          {confidence > 0 && (
            <div style={{ fontSize: 10, color: '#484F58' }}>
              Confidence: <span style={{ color: '#8B949E' }}>{confidence}/100</span>
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
