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

// ── Layout constants ────────────────────────────────────────────────────────
const PAD      = 28;
const HEADER_H = 72;
const STATS_H  = 58;
const GAP      = 6;
const SPREAD_H = 76;
const FOOTER_H = 28;
const CHART_H  = SHARE_CARD_HEIGHT - PAD * 2 - HEADER_H - STATS_H - GAP * 2 - SPREAD_H - FOOTER_H;
const CHART_W  = SHARE_CARD_WIDTH  - PAD * 2;

export const GOLDEN_DEATH_CROSS_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

// ── Colors ───────────────────────────────────────────────────────────────────
const GOLD  = '#EAB84D';
const BLUE  = '#5B84FF';
const GREEN = '#35D07F';
const RED   = '#F85149';
const BG    = '#0D1117';
const CARD  = '#161B22';
const MUTED = '#8B949E';
const TEXT  = '#E6EDF3';
const BORD  = '#21262D';

function fmtP(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

const YEAR_TICKS = Array.from({ length: 22 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime()
);

// ── Neon dots layer ──────────────────────────────────────────────────────────
function CardCrossDotsLayer({ xAxisMap, yAxisMap, crossEvents, startTs }: any) {
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
  const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const dots: React.ReactElement[] = [];
  for (const ev of crossEvents as CrossEvent[]) {
    if (ev.ts < (startTs as number)) continue;
    const cx = xAxis.scale(ev.ts);
    const cy = yAxis.scale(ev.price);
    if (!isFinite(cx) || !isFinite(cy)) continue;
    const color = ev.type === 'golden' ? GREEN : RED;
    const fid   = ev.type === 'golden' ? 'gdc-glow-g' : 'gdc-glow-r';
    dots.push(
      <g key={`${ev.type}-${ev.ts}`}>
        <circle cx={cx} cy={cy} r={18} fill={color} opacity={0.05} />
        <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.15} />
        <circle cx={cx} cy={cy} r={5}  fill={color} opacity={0.95} filter={`url(#${fid})`} />
      </g>
    );
  }
  return (
    <g>
      <defs>
        <filter id="gdc-glow-g" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="gdc-glow-r" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {dots}
    </g>
  );
}

// ── Spread bar layer ─────────────────────────────────────────────────────────
function SpreadBars({ xAxisMap, yAxisMap, data }: any) {
  if (!xAxisMap || !yAxisMap) return null;
  const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
  const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const visible = (data as ChartPoint[]).filter((p) => p.spread !== null);
  if (visible.length < 2) return null;

  const barW = Math.max(2, (xAxis.scale(visible[visible.length - 1].ts) - xAxis.scale(visible[0].ts)) / (visible.length - 1) * 0.9);
  const zero = yAxis.scale(0);

  return (
    <g>
      {visible.map((p) => {
        const x  = xAxis.scale(p.ts) - barW / 2;
        const y1 = zero;
        const y2 = yAxis.scale(p.spread!);
        const fill = (p.spread ?? 0) >= 0 ? 'rgba(53,208,127,0.55)' : 'rgba(248,81,73,0.55)';
        return (
          <rect
            key={p.ts}
            x={x}
            y={Math.min(y1, y2)}
            width={barW}
            height={Math.abs(y2 - y1)}
            fill={fill}
          />
        );
      })}
      {/* zero line */}
      <line x1={xAxis.scale(visible[0].ts)} y1={zero} x2={xAxis.scale(visible[visible.length - 1].ts)} y2={zero} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
    </g>
  );
}

// ── Stat box ─────────────────────────────────────────────────────────────────
function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: CARD, border: `1px solid ${BORD}`, borderRadius: 6, padding: '8px 14px', flex: 1 }}>
      <span style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: color ?? TEXT }}>{value}</span>
      {sub && <span style={{ fontSize: 9, color: MUTED }}>{sub}</span>}
    </div>
  );
}

// ── Main card component ───────────────────────────────────────────────────────
export function GoldenDeathCrossShareCard({ payload }: { payload: GoldenDeathCrossSharePayload }) {
  const {
    chartPoints, crossEvents, startTs,
    price, ma50, ma200, spread,
    regime, confidence, daysSinceCross, lastCrossType, lastCrossDate,
    logScale, generatedAt,
  } = payload;

  const ri          = REGIMES[regime];
  const visible     = chartPoints.filter((p) => p.ts >= startTs);
  const yearTicks   = YEAR_TICKS.filter((t) => t >= startTs);

  const spreadColor = (spread ?? 0) >= 0 ? GREEN : RED;
  const regimeColor = ri.color;

  return (
    <div style={{
      width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT,
      background: BG, display: 'flex', flexDirection: 'column',
      padding: PAD, boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ height: HEADER_H, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: TEXT, letterSpacing: -0.5 }}>BTC Golden / Death Cross</span>
          <span style={{
            fontSize: 10, fontWeight: 600, background: regimeColor + '22',
            color: regimeColor, border: `1px solid ${regimeColor}55`,
            borderRadius: 999, padding: '2px 10px',
          }}>{ri.shortLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: MUTED }}>
          <span>50D / 200D Moving Averages</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 20, height: 2, background: GOLD, display: 'inline-block', borderRadius: 1 }} />
            50D MA
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 20, height: 2, background: BLUE, display: 'inline-block', borderRadius: 1 }} />
            200D MA
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, display: 'inline-block' }} />
            Golden
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED, display: 'inline-block' }} />
            Death
          </span>
          <span style={{ marginLeft: 'auto' }}>{generatedAt}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ height: STATS_H, display: 'flex', gap: 8, marginBottom: GAP }}>
        <StatBox label="BTC Price"   value={fmtP(price)}               color="#F7931A" />
        <StatBox label="50D MA"      value={ma50  ? fmtP(ma50)  : '—'} color={GOLD}   sub="Short-term trend" />
        <StatBox label="200D MA"     value={ma200 ? fmtP(ma200) : '—'} color={BLUE}   sub="Long-term floor"  />
        <StatBox
          label="MA Spread"
          value={spread !== null ? `${spread > 0 ? '+' : ''}${spread.toFixed(1)}%` : '—'}
          color={spreadColor}
          sub="(50D − 200D) / 200D"
        />
        <StatBox
          label="Confidence"
          value={`${confidence}/100`}
          color={confidence >= 65 ? GREEN : confidence >= 40 ? '#E6B450' : RED}
          sub={lastCrossDate ? `Last cross: ${lastCrossDate}` : undefined}
        />
      </div>

      {/* Main price chart */}
      <div style={{ height: CHART_H, marginBottom: GAP }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={visible}
          margin={{ top: 8, right: 12, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />
          <XAxis
            dataKey="ts" type="number" scale="time"
            domain={['dataMin', 'dataMax']} ticks={yearTicks}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: MUTED, fontSize: 10 }}
            axisLine={{ stroke: BORD }} tickLine={false}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={['auto', 'auto']} allowDataOverflow
            tickFormatter={fmtP}
            tick={{ fill: MUTED, fontSize: 10 }}
            axisLine={{ stroke: BORD }} tickLine={false} width={60}
          />
          <Area
            type="monotone" dataKey="price"
            stroke="#F7931A" strokeWidth={1.5}
            fill="rgba(247,147,26,0.05)"
            dot={false} isAnimationActive={false} connectNulls
          />
          <Line
            type="monotone" dataKey="ma200"
            stroke={BLUE} strokeWidth={2}
            dot={false} isAnimationActive={false} connectNulls
          />
          <Line
            type="monotone" dataKey="ma50"
            stroke={GOLD} strokeWidth={2}
            dot={false} isAnimationActive={false} connectNulls
          />
          <Customized
            component={(props: any) => (
              <CardCrossDotsLayer {...props} crossEvents={crossEvents} startTs={startTs} />
            )}
          />
        </ComposedChart>
      </div>

      {/* MA Spread chart */}
      <div style={{ height: SPREAD_H, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>MA Spread (50D − 200D) / 200D × 100</span>
        <div style={{ flex: 1 }}>
          <ComposedChart
            width={CHART_W}
            height={SPREAD_H - 14}
            data={visible}
            margin={{ top: 2, right: 12, bottom: 2, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.35)" vertical={false} />
            <XAxis
              dataKey="ts" type="number" scale="time"
              domain={['dataMin', 'dataMax']} ticks={yearTicks}
              tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
              tick={{ fill: MUTED, fontSize: 9 }}
              axisLine={{ stroke: BORD }} tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              tick={{ fill: MUTED, fontSize: 9 }}
              axisLine={{ stroke: BORD }} tickLine={false} width={36}
            />
            <Customized component={(props: any) => <SpreadBars {...props} data={visible} />} />
          </ComposedChart>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        height: FOOTER_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${BORD}`, paddingTop: 6, marginTop: 4,
      }}>
        <span style={{ fontSize: 9, color: MUTED }}>skyline-cycle-terminal.com · Data: CoinMetrics Community</span>
        <span style={{ fontSize: 9, color: MUTED }}>
          Confidence: {confidence}/100
          {daysSinceCross !== null ? ` · ${daysSinceCross}d since last ${lastCrossType} cross` : ''}
        </span>
      </div>
    </div>
  );
}
