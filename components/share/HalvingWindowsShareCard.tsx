"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  useXAxisScale,
  useYAxisScale,
} from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import type { HalvingWindowData } from '@/lib/indicators/halvingWindows';

type PricePoint = { time: string; ts: number; price: number };

export type HalvingWindowsSharePayload = {
  points:      PricePoint[];
  windows:     HalvingWindowData[];
  logScale:    boolean;
  rangeLabel:  string;
  startTs:     number;
  generatedAt: string;
  logoSrc?:    never;
};

const PAD      = 32;
const HEADER_H = 78;
const FOOTER_H = 30;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH  - PAD * 2;

export const HALVING_WINDOWS_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H, w: CHART_W, h: CHART_H,
};

const CYAN = '#45F3FF';
const PINK = '#FF5CA8';

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const ALL_YEAR_TICKS = Array.from({ length: 22 }, (_, i) =>
  new Date(`${2010 + i}-01-01T00:00:00Z`).getTime()
);

// Uses Recharts v3's useXAxisScale/useYAxisScale hooks — the old
// <Customized xAxisMap/yAxisMap> prop-injection API is a v2-only pattern that's
// a deprecated no-op stub in v3, so this must render as a direct chart child.
function CardNeonDots({ windows, startTs }: { windows: HalvingWindowData[]; startTs: number }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  if (!xScale || !yScale) return null;

  const dots: React.ReactElement[] = [];

  for (const w of windows) {
    if (w.projected) continue;

    if (w.accumulationPoint && w.accumulationPoint.ts >= startTs) {
      const cx = xScale(w.accumulationPoint.ts);
      const cy = yScale(w.accumulationPoint.price);
      if (cx != null && cy != null && Number.isFinite(cx) && Number.isFinite(cy)) {
        dots.push(
          <g key={`acc-${w.year}`}>
            <circle cx={cx} cy={cy} r={18} fill={CYAN} opacity={0.05} />
            <circle cx={cx} cy={cy} r={10} fill={CYAN} opacity={0.14} />
            <circle cx={cx} cy={cy} r={6}  fill={CYAN} opacity={0.92} filter="url(#glow-cyan-card)" />
          </g>
        );
      }
    }

    if (w.deriskPoint && w.deriskPoint.ts >= startTs) {
      const cx = xScale(w.deriskPoint.ts);
      const cy = yScale(w.deriskPoint.price);
      if (cx != null && cy != null && Number.isFinite(cx) && Number.isFinite(cy)) {
        dots.push(
          <g key={`risk-${w.year}`}>
            <circle cx={cx} cy={cy} r={18} fill={PINK} opacity={0.05} />
            <circle cx={cx} cy={cy} r={10} fill={PINK} opacity={0.14} />
            <circle cx={cx} cy={cy} r={6}  fill={PINK} opacity={0.92} filter="url(#glow-pink-card)" />
          </g>
        );
      }
    }
  }

  return (
    <g>
      <defs>
        <filter id="glow-cyan-card" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-pink-card" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {dots}
    </g>
  );
}

export function HalvingWindowsShareCard({ payload }: { payload: HalvingWindowsSharePayload }) {
  const { points, windows, logScale, rangeLabel, startTs, generatedAt } = payload;

  const dateStr  = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const visible  = points.filter((p) => p.ts >= startTs);
  const yearTicks = ALL_YEAR_TICKS.filter((t) => startTs === 0 || t >= startTs);
  const now      = Date.now();

  return (
    <div style={{
      width:           SHARE_CARD_WIDTH,
      height:          SHARE_CARD_HEIGHT,
      backgroundColor: '#0D1117',
      position:        'relative',
      overflow:        'hidden',
      color:           '#E6EDF3',
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
        justifyContent: 'space-between',
        alignItems:     'flex-start',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#E6EDF3', textTransform: 'uppercase' }}>
            Skyline Cycle Terminal
          </div>
          <div style={{ fontSize: 12, color: '#8B949E', marginTop: 4, letterSpacing: '0.03em' }}>
            BTC Halving Cycle Windows · 500-Day Framework · {rangeLabel}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, marginTop: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                backgroundColor: CYAN, boxShadow: `0 0 6px ${CYAN}`,
              }} />
              <span style={{ fontSize: 9, color: '#8B949E', letterSpacing: '0.05em' }}>Accumulation Signal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
                backgroundColor: PINK, boxShadow: `0 0 6px ${PINK}`,
              }} />
              <span style={{ fontSize: 9, color: '#8B949E', letterSpacing: '0.05em' }}>De-Risk Signal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 12, height: 8, borderRadius: 2, display: 'inline-block',
                backgroundColor: `rgba(69,243,255,0.14)`, border: `1px solid rgba(69,243,255,0.3)`,
              }} />
              <span style={{ fontSize: 9, color: '#8B949E', letterSpacing: '0.05em' }}>Accum. Window</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 12, height: 8, borderRadius: 2, display: 'inline-block',
                backgroundColor: `rgba(255,92,168,0.14)`, border: `1px solid rgba(255,92,168,0.3)`,
              }} />
              <span style={{ fontSize: 9, color: '#8B949E', letterSpacing: '0.05em' }}>De-Risk Window</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.12em' }}>LIVE DATA</span>
          </div>
          <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3 }}>{dateStr}</div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ width: CHART_W, height: CHART_H, flex: '0 0 auto', position: 'relative' }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={visible}
          margin={{ top: 4, right: 52, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.5)" vertical={false} />

          {windows.map((w) => {
            const x1 = Math.max(w.accumulationStartTs, startTs);
            const x2 = w.accumulationEndTs;
            if (x2 < startTs) return null;
            return (
              <ReferenceArea
                key={`acc-${w.year}`}
                x1={x1} x2={x2}
                fill={`rgba(69,243,255,${w.projected ? 0.04 : 0.07})`}
                stroke={`rgba(69,243,255,${w.projected ? 0.06 : 0.18})`}
                strokeWidth={0.8}
              />
            );
          })}

          {windows.map((w) => {
            const x1 = Math.max(w.deriskStartTs, startTs);
            const x2 = w.deriskEndTs;
            if (x2 < startTs) return null;
            return (
              <ReferenceArea
                key={`risk-${w.year}`}
                x1={x1} x2={x2}
                fill={`rgba(255,92,168,${w.projected ? 0.04 : 0.07})`}
                stroke={`rgba(255,92,168,${w.projected ? 0.06 : 0.18})`}
                strokeWidth={0.8}
              />
            );
          })}

          {windows.map((w) =>
            w.halvingTs >= startTs ? (
              <ReferenceLine
                key={`halving-${w.year}`}
                x={w.halvingTs}
                stroke={w.projected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)'}
                strokeDasharray={w.projected ? '6 4' : undefined}
                strokeWidth={1.5}
                label={{
                  value: w.shortLabel,
                  position: 'insideTopRight',
                  fontSize: 9,
                  fill: w.projected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.65)',
                  fontWeight: 600,
                }}
              />
            ) : null
          )}

          {now >= startTs && (
            <ReferenceLine
              x={now}
              stroke="rgba(247,249,252,0.35)"
              strokeDasharray="2 4"
              label={{ value: 'Now', position: 'insideTopRight', fontSize: 9, fill: 'rgba(247,249,252,0.4)' }}
            />
          )}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={yearTicks}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={56}
          />

          <Area
            type="monotone"
            dataKey="price"
            stroke="rgba(247,249,252,0.82)"
            strokeWidth={1.5}
            fill="rgba(247,249,252,0.04)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          <CardNeonDots windows={windows} startTs={startTs} />
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
