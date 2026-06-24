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

// ── Layout — mirrors Altseason card pattern ──────────────────────────────────
const PAD      = 32;
const HEADER_H = 82;
const FOOTER_H = 30;
const CHART_H  = SHARE_CARD_HEIGHT - PAD * 2 - HEADER_H - FOOTER_H;
const CHART_W  = SHARE_CARD_WIDTH  - PAD * 2;

export const GOLDEN_DEATH_CROSS_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H, w: CHART_W, h: CHART_H,
};

// ── Colors ───────────────────────────────────────────────────────────────────
const PRICE = '#F5F7FA';
const GOLD  = '#EAB84D';
const BLUE  = '#5B84FF';
const GREEN = '#35D07F';
const RED   = '#F85149';
const MUTED = '#8B949E';
const TEXT  = '#E6EDF3';
const BORD  = '#21262D';
const MONO  = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const YEAR_TICKS = Array.from({ length: 22 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime()
);

function fmtP(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// ── Neon cross dots ──────────────────────────────────────────────────────────
function CardCrossDotsLayer({ xAxisMap, yAxisMap, crossEvents, startTs, offset }: any) {
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
  const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const chartBottom = (offset?.top ?? 0) + (offset?.height ?? 0);
  const dots: React.ReactElement[] = [];

  for (const ev of crossEvents as CrossEvent[]) {
    if (ev.ts < (startTs as number)) continue;
    const cx  = xAxis.scale(ev.ts);
    const cy  = yAxis.scale((ev.ma50 + ev.ma200) / 2);
    if (!isFinite(cx) || !isFinite(cy)) continue;

    const isGolden = ev.type === 'golden';
    const color    = isGolden ? GREEN : RED;
    const fid      = isGolden ? 'gdc-card-glow-g' : 'gdc-card-glow-r';

    dots.push(
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
        <filter id="gdc-card-glow-g" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="gdc-card-glow-r" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {dots}
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

  const ri        = REGIMES[regime];
  const visible   = chartPoints.filter((p) => p.ts >= startTs);
  const yearTicks = YEAR_TICKS.filter((t) => t >= startTs);

  const spreadColor   = (spread ?? 0) >= 0 ? GREEN : RED;
  const spreadFmt     = spread !== null ? `${spread > 0 ? '+' : ''}${spread.toFixed(1)}%` : '—';
  const confidenceColor = confidence >= 65 ? GREEN : confidence >= 40 ? '#E6B450' : RED;

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
      color:           TEXT,
      fontFamily:      MONO,
      display:         'flex',
      flexDirection:   'column',
      padding:         PAD,
      boxSizing:       'border-box',
    }}>

      {/* ── Header — two column, mirrors Altseason ── */}
      <div style={{
        height:         HEADER_H,
        flex:           `0 0 ${HEADER_H}px`,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
      }}>

        {/* Left: branding + title + stat pills */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Skyline Cycle Terminal
          </div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
            BTC Golden / Death Cross · {rangeLabel}
          </div>

          {/* Stat pills row */}
          <div style={{ display: 'flex', gap: 20, marginTop: 10, alignItems: 'center' }}>
            {/* Price */}
            <div>
              <span style={{ fontSize: 22, fontWeight: 700, color: PRICE }}>{fmtP(price)}</span>
              <span style={{ fontSize: 11, color: MUTED, marginLeft: 5 }}>BTC</span>
            </div>
            {/* Regime badge */}
            <span style={{
              fontSize: 10, fontWeight: 600, color: ri.color,
              backgroundColor: ri.color + '20', padding: '2px 8px', borderRadius: 4,
            }}>
              {ri.shortLabel}
            </span>
            {/* MA values */}
            <div style={{ fontSize: 10, color: MUTED }}>
              <span style={{ color: GOLD, fontWeight: 600 }}>50D</span>{' '}
              {ma50 ? fmtP(ma50) : '—'}
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>
              <span style={{ color: BLUE, fontWeight: 600 }}>200D</span>{' '}
              {ma200 ? fmtP(ma200) : '—'}
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>
              <span style={{ color: spreadColor, fontWeight: 600 }}>Spread</span>{' '}
              <span style={{ color: spreadColor }}>{spreadFmt}</span>
            </div>
            <div style={{ fontSize: 10, color: MUTED }}>
              <span style={{ color: confidenceColor, fontWeight: 600 }}>Conf.</span>{' '}
              <span style={{ color: confidenceColor }}>{confidence}/100</span>
            </div>
          </div>
        </div>

        {/* Right: live dot + date + legend */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: GREEN, display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: GREEN, letterSpacing: '0.12em' }}>LIVE DATA</span>
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{dateStr}</div>

          {/* Line legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 10, alignItems: 'flex-end' }}>
            {[
              { color: PRICE, label: 'BTC Price', line: true },
              { color: GOLD,  label: logScale ? '50D MA' : '50D MA', line: true },
              { color: BLUE,  label: '200D MA',  line: true },
              { color: GREEN, label: 'Golden Cross', line: false },
              { color: RED,   label: 'Death Cross',  line: false },
            ].map(({ color, label, line }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {line
                  ? <span style={{ width: 14, height: 2, backgroundColor: color, display: 'inline-block', borderRadius: 1 }} />
                  : <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, display: 'inline-block' }} />
                }
                <span style={{ fontSize: 9, color: MUTED }}>{label}</span>
              </div>
            ))}
            {daysSinceCross !== null && (
              <div style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>
                {daysSinceCross}d since last {lastCrossType} cross
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ width: CHART_W, height: CHART_H, flex: '0 0 auto' }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={visible}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: MUTED, fontSize: 9, fontFamily: MONO }}
            axisLine={{ stroke: BORD }}
            tickLine={false}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtP}
            tick={{ fill: MUTED, fontSize: 9, fontFamily: MONO }}
            axisLine={{ stroke: BORD }}
            tickLine={false}
            width={56}
          />

          {/* 200D first, then 50D, then price on top */}
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
        justifyContent: 'flex-end',
      }}>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
