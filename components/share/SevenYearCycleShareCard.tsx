"use client";

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceLine, ReferenceDot } from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type SevenYearCycleSharePayload = {
  price:          number;
  fourYearPhase:  string;
  sevenYearPhase: string;
  modelAgreement: string;
  points:         { ts: number; price: number }[];
  halvings:       { ts: number; label: string }[];
  stressWindows:  { startTs: number; endTs: number; label: string; projected: boolean }[];
  cycleMarkers:   { ts: number; price: number; kind: 'low' | 'high' }[];
  generatedAt:    string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CENTER_H = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CARD_W   = SHARE_CARD_WIDTH - PAD * 2;

export const SEVEN_YEAR_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CARD_W, h: CENTER_H,
};

const LOG_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];
const YEAR_TICKS = Array.from({ length: 21 }, (_, i) => new Date(`${2010 + i}-01-01T00:00:00Z`).getTime());

function fmtUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function MarkerDot({ cx, cy, kind }: { cx?: number; cy?: number; kind: 'low' | 'high' }) {
  if (cx == null || cy == null) return null;
  const color = kind === 'low' ? '#38BDF8' : '#FF5C8A';
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#0D1117" strokeWidth={1.5} />;
}

export function SevenYearCycleShareCard({ payload }: { payload: SevenYearCycleSharePayload }) {
  const { price, fourYearPhase, sevenYearPhase, modelAgreement, points, halvings, stressWindows, cycleMarkers, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const stats = [
    { label: 'BTC Price',       value: fmtUSD(price),  sub: 'Latest close',        color: '#F7931A' },
    { label: '4-Year Model',    value: fourYearPhase,  sub: 'Halving cycle phase', color: '#F7931A' },
    { label: '7-Year Model',    value: sevenYearPhase, sub: 'Stress cycle phase',  color: '#F85149' },
    { label: 'Model Agreement', value: modelAgreement, sub: 'Do models align?',    color: '#5B84FF' },
  ];

  const prices = points.map((p) => p.price).filter((v) => v > 0);
  const pMin = prices.length ? Math.max(1, Math.min(...prices) * 0.5) : 1;
  const pMax = prices.length ? Math.max(...prices) * 2 : 200_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);
  const xStart = points[0]?.ts ?? new Date('2010-01-01').getTime();
  const xEnd   = points.at(-1)?.ts ?? new Date(generatedAt).getTime();

  return (
    <div style={{
      width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, backgroundColor: '#0D1117',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      display: 'flex', flexDirection: 'column', padding: PAD, boxSizing: 'border-box',
    }}>
      <div style={{ height: HEADER_H, flex: `0 0 ${HEADER_H}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>Bitcoin 7-Year Stress Cycle</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>Halving cycle vs. financial stress cycle</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
        </div>
      </div>

      <div style={{ height: STATS_H, flex: `0 0 ${STATS_H}px`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: GAP, marginBottom: GAP }}>
        {stats.map((s) => (
          <div key={s.label} style={{ backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart data={points} width={CARD_W} height={CENTER_H} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {stressWindows.map((w) => (
            <ReferenceArea
              key={w.label}
              x1={w.startTs}
              x2={w.endTs}
              fill="#F85149"
              fillOpacity={w.projected ? 0.06 : 0.1}
              stroke={w.projected ? '#F85149' : 'none'}
              strokeOpacity={w.projected ? 0.4 : 0}
              strokeDasharray={w.projected ? '4 4' : undefined}
            />
          ))}

          {halvings.map((h) => (
            <ReferenceLine
              key={h.label}
              x={h.ts}
              stroke="#F7931A"
              strokeOpacity={0.55}
              strokeDasharray="4 4"
              label={{ value: h.label, position: 'insideTopRight', fill: '#F7931A', fontSize: 10, fillOpacity: 0.8 }}
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={[xStart, xEnd]}
            ticks={YEAR_TICKS}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            scale="log"
            domain={[pMin, pMax]}
            ticks={logTicks}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={56}
            allowDataOverflow
          />

          <Line
            type="monotone"
            dataKey="price"
            stroke="#F5F7FA"
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {cycleMarkers.map((m) => (
            <ReferenceDot
              key={`${m.kind}-${m.ts}`}
              x={m.ts}
              y={m.price}
              r={0}
              shape={(dotProps: { cx?: number; cy?: number }) => <MarkerDot cx={dotProps.cx} cy={dotProps.cy} kind={m.kind} />}
              ifOverflow="extendDomain"
            />
          ))}
        </ComposedChart>
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: GAP }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#38BDF8', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Cycle Low</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FF5C8A', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Cycle High</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 8, backgroundColor: 'rgba(248,81,73,0.3)', display: 'inline-block', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Stress Windows</span>
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
