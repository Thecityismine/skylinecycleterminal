"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { HALVINGS, PHASES } from '@/lib/indicators/halvingCycles';
import type { ZoneSegment } from '@/lib/indicators/halvingCycles';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

type PricePoint = { time: string; ts: number; price: number };

export type HalvingSharePayload = {
  points:      PricePoint[];
  segments:    ZoneSegment[];
  logScale:    boolean;
  rangeLabel:  string;
  startTs:     number;
  generatedAt: string;
  logoSrc?:    string;
};

const PAD      = 32;
const HEADER_H = 82;
const FOOTER_H = 32;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH  - PAD * 2;

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

const ALL_YEAR_TICKS = Array.from({ length: 18 }, (_, i) =>
  new Date(`${2012 + i}-01-01T00:00:00Z`).getTime(),
);

export function HalvingShareCard({ payload }: { payload: HalvingSharePayload }) {
  const { points, segments, logScale, rangeLabel, startTs, generatedAt, logoSrc } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const visible = points.filter((p) => p.ts >= startTs);
  const visSegs = segments
    .filter((s) => s.x2 >= startTs)
    .map((s) => ({ ...s, x1: Math.max(s.x1, startTs) }));

  const yearTicks = ALL_YEAR_TICKS.filter((t) => startTs === 0 || t >= startTs);
  const now = Date.now();

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

      {/* ── Watermark — on outer card div so it's never buried under chart SVG ── */}
      <div style={{
        position:      'absolute',
        top:           '50%',
        left:          '50%',
        transform:     'translate(-50%, -50%)',
        pointerEvents: 'none',
        userSelect:    'none',
        textAlign:     'center',
        opacity:       logoSrc ? 0.13 : 0.09,
        zIndex:        20,
      }}>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" style={{ display: 'block', width: 320, height: 'auto' }} />
        ) : (
          <>
            <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: '0.18em', color: '#FFFFFF', textTransform: 'uppercase', fontFamily: "'Orbitron', ui-monospace, monospace", lineHeight: 1 }}>
              SKYLINE
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.42em', color: '#FFFFFF', textTransform: 'uppercase', fontFamily: "'Orbitron', ui-monospace, monospace", marginTop: 10 }}>
              CYCLE TERMINAL
            </div>
          </>
        )}
      </div>

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
            BTC Price · Halving Accumulation Windows · {rangeLabel}
          </div>
          {/* Phase legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {PHASES.map((p) => (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 2, display: 'inline-block',
                  backgroundColor: p.color + '55', border: `1px solid ${p.color}`,
                }} />
                <span style={{ fontSize: 9, color: '#8B949E', letterSpacing: '0.05em' }}>{p.shortLabel}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 16, height: 0, borderTop: '2px dashed rgba(255,200,50,0.6)', display: 'inline-block',
              }} />
              <span style={{ fontSize: 9, color: 'rgba(255,200,50,0.8)', letterSpacing: '0.05em' }}>Halving</span>
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

          {visSegs.map((seg, i) => (
            <ReferenceArea
              key={i}
              x1={seg.x1}
              x2={seg.x2}
              fill={seg.phase.fill}
              stroke="none"
            />
          ))}

          {HALVINGS.map((h) =>
            h.ts >= startTs && (
              <ReferenceLine
                key={h.label}
                x={h.ts}
                stroke={h.estimated ? 'rgba(255,255,255,0.25)' : 'rgba(255,200,50,0.60)'}
                strokeDasharray={h.estimated ? '6 4' : '4 3'}
                strokeWidth={1.5}
                label={{
                  value:     h.label,
                  position:  'insideTopRight',
                  fontSize:  9,
                  fill:      h.estimated ? 'rgba(255,255,255,0.4)' : 'rgba(255,200,50,0.8)',
                  fontWeight: 600,
                }}
              />
            ),
          )}

          {now >= startTs && (
            <ReferenceLine
              x={now}
              stroke="rgba(247,249,252,0.45)"
              strokeDasharray="2 4"
              label={{ value: 'Now', position: 'insideTopRight', fontSize: 9, fill: 'rgba(247,249,252,0.5)' }}
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
            stroke="rgba(247,249,252,0.85)"
            strokeWidth={1.5}
            fill="rgba(247,249,252,0.04)"
            dot={false}
            isAnimationActive={false}
            connectNulls
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
