"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import type { HistoricalScorePoint } from '@/lib/indicators/historicalScore';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoreSharePayload = {
  points:       HistoricalScorePoint[];
  currentScore: number;
  zoneLabel:    string;
  zoneColor:    string;
  btcPrice:     number;
  generatedAt:  string;   // ISO string
  logoSrc?:     string;   // processed transparent data URL — white bg stripped via canvas
};

// ─── Shared chart constants ───────────────────────────────────────────────────

const HALVINGS = [
  { ts: new Date('2012-11-28').getTime(), label: 'H1' },
  { ts: new Date('2016-07-09').getTime(), label: 'H2' },
  { ts: new Date('2020-05-11').getTime(), label: 'H3' },
  { ts: new Date('2024-04-19').getTime(), label: 'H4' },
];

const ZONE_BANDS = [
  { y1: 0,   y2: 25,  fill: 'rgba(59,130,246,0.10)'  },
  { y1: 25,  y2: 50,  fill: 'rgba(53,208,127,0.10)'  },
  { y1: 50,  y2: 75,  fill: 'rgba(230,180,80,0.10)'  },
  { y1: 75,  y2: 100, fill: 'rgba(255,92,92,0.10)'   },
];

const ZONE_LINES = [
  { y: 25, color: 'rgba(53,208,127,0.30)' },
  { y: 50, color: 'rgba(230,180,80,0.30)' },
  { y: 75, color: 'rgba(255,92,92,0.30)'  },
];

const LOG_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

// ─── Card dimensions ─────────────────────────────────────────────────────────

const PAD       = 32;         // outer padding
const HEADER_H  = 72;         // header strip
const CHART_H   = 400;        // chart area height
const METRICS_H = 88;         // metrics strip
const FOOTER_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - CHART_H - METRICS_H - PAD;
const CHART_W   = SHARE_CARD_WIDTH - PAD * 2;

const YEAR_TICKS = Array.from({ length: 16 }, (_, i) =>
  new Date(`${2011 + i}-01-01`).getTime(),
);

// ─── Card ─────────────────────────────────────────────────────────────────────

export function ScoreShareCard({ payload }: { payload: ScoreSharePayload }) {
  const { points, currentScore, zoneLabel, zoneColor, btcPrice, generatedAt, logoSrc } = payload;

  const prices   = points.map((p) => p.btcClose).filter((v) => v > 0);
  const pMin     = prices.length ? Math.max(0.01, Math.min(...prices) * 0.6) : 0.01;
  const pMax     = prices.length ? Math.max(...prices) * 2.2 : 200_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);

  const dateStr  = new Date(generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  const ZONES = [
    { color: '#3B82F6', label: '0–25 Accumulate' },
    { color: '#35D07F', label: '25–50 Hold' },
    { color: '#E6B450', label: '50–75 Caution' },
    { color: '#FF5C5C', label: '75–100 Distribution' },
  ];

  return (
    <div
      style={{
        width:           SHARE_CARD_WIDTH,
        height:          SHARE_CARD_HEIGHT,
        backgroundColor: '#0D1117',
        fontFamily:      'ui-monospace, SFMono-Regular, Menlo, monospace',
        position:        'relative',
        overflow:        'hidden',
        color:           '#E6EDF3',
        padding:         PAD,
        boxSizing:       'border-box',
        display:         'flex',
        flexDirection:   'column',
        gap:             0,
      }}
    >

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
      <div style={{ height: HEADER_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: '#E6EDF3', textTransform: 'uppercase' }}>
            Skyline Cycle Terminal
          </div>
          <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3, letterSpacing: '0.04em' }}>
            Skyline Score History · BTC Cycle Position
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
          data={points}
          margin={{ top: 4, right: 68, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.5)" vertical={false} />

          {ZONE_BANDS.map((b) => (
            <ReferenceArea key={b.y1} yAxisId="score" y1={b.y1} y2={b.y2} fill={b.fill} stroke="none" />
          ))}
          {ZONE_LINES.map((b) => (
            <ReferenceLine key={b.y} yAxisId="score" y={b.y} stroke={b.color} strokeDasharray="4 4" />
          ))}
          {HALVINGS.map((h) => (
            <ReferenceLine
              key={h.label}
              yAxisId="score"
              x={h.ts}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="3 5"
              label={{ value: h.label, position: 'insideTopRight', fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
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
            yAxisId="score"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={30}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtPrice}
            tick={{ fill: '#F7931A', fontSize: 9, fontFamily: 'monospace', opacity: 0.5 }}
            axisLine={false}
            tickLine={false}
            width={56}
            allowDataOverflow
          />

          <Line
            yAxisId="price"
            type="monotone"
            dataKey="btcClose"
            stroke="#F7931A"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
            opacity={0.5}
          />
          <Area
            yAxisId="score"
            type="monotone"
            dataKey="score"
            stroke="none"
            fill="rgba(247,249,252,0.05)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="score"
            stroke="rgba(247,249,252,0.95)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </div>

      {/* ── Metrics strip ── */}
      <div style={{
        height:          METRICS_H,
        display:         'flex',
        alignItems:      'center',
        borderTop:       '1px solid #21262D',
        marginTop:       12,
        paddingTop:      12,
        gap:             0,
      }}>
        {/* Current score */}
        <div style={{ flex: 1, borderRight: '1px solid #21262D', paddingRight: 20 }}>
          <div style={{ fontSize: 10, color: '#8B949E', letterSpacing: '0.1em', marginBottom: 4 }}>CYCLE SCORE</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: zoneColor, lineHeight: 1 }}>{currentScore}</div>
          <div style={{ fontSize: 10, color: zoneColor, marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {zoneLabel}
          </div>
        </div>

        {/* BTC Price */}
        <div style={{ flex: 1, paddingLeft: 20, borderRight: '1px solid #21262D', paddingRight: 20 }}>
          <div style={{ fontSize: 10, color: '#8B949E', letterSpacing: '0.1em', marginBottom: 4 }}>BTC PRICE</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#F7931A' }}>{fmtUsd(btcPrice)}</div>
        </div>

        {/* Zone legend */}
        <div style={{ flex: 2, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {ZONES.map((z) => (
            <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: z.color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#8B949E', letterSpacing: '0.04em' }}>{z.label}</span>
            </div>
          ))}
        </div>

        {/* Score bar */}
        <div style={{ flex: 1, paddingLeft: 20 }}>
          <div style={{ fontSize: 10, color: '#8B949E', letterSpacing: '0.1em', marginBottom: 8 }}>POSITION</div>
          <div style={{ width: '100%', height: 6, backgroundColor: '#21262D', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${currentScore}%`, height: '100%', backgroundColor: zoneColor, borderRadius: 3 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: '#8B949E' }}>0</span>
            <span style={{ fontSize: 9, color: '#8B949E' }}>100</span>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: '#484F58' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
