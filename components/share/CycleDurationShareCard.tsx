"use client";

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceLine } from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type CycleDurationSharePayload = {
  phaseLabel: string;
  phaseColor: string;
  modeledLowDateFmt: string;
  bullWindowLabel: string;
  bullDays: number;
  skylineScore: number;
  skylineZoneLabel: string;
  points: { ts: number; price: number }[];
  boxes: {
    id: string;
    x1: number; x2: number;
    y1?: number; y2?: number;
    kind: 'bull' | 'bear';
    confirmed: boolean;
  }[];
  generatedAt: string;
};

const PAD = 32;
const HEADER_H = 72;
const STATS_H = 68;
const GAP = 8;
const FOOTER_H = 24;
const CENTER_H = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CARD_W = SHARE_CARD_WIDTH - PAD * 2;

export const CYCLE_DURATION_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CARD_W, h: CENTER_H,
};

const LOG_TICKS = [100, 1_000, 10_000, 100_000, 1_000_000];
const YEAR_TICKS = Array.from({ length: 22 }, (_, i) => new Date(`${2010 + i}-01-01T00:00:00Z`).getTime());

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export function CycleDurationShareCard({ payload }: { payload: CycleDurationSharePayload }) {
  const {
    phaseLabel, phaseColor, modeledLowDateFmt, bullWindowLabel, bullDays,
    skylineScore, skylineZoneLabel, points, boxes, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const stats = [
    { label: 'Current Phase', value: phaseLabel, sub: 'Skyline Cycle Model', color: phaseColor },
    { label: 'Modeled Bottom', value: modeledLowDateFmt, sub: 'Next cycle anchor', color: '#5B84FF' },
    { label: 'Projected Bull Window', value: bullWindowLabel, sub: `${bullDays.toLocaleString()} days`, color: '#35D07F' },
    { label: 'Skyline Score', value: `${skylineScore} / 100`, sub: skylineZoneLabel, color: '#E6B450' },
  ];

  const prices = points.map((p) => p.price).filter((v) => v > 0);
  const pMin = prices.length ? Math.max(1, Math.min(...prices) * 0.5) : 1;
  const pMax = prices.length ? Math.max(...prices) * 2 : 200_000;
  const logTicks = LOG_TICKS.filter((t) => t >= pMin && t <= pMax);
  const xStart = points[0]?.ts ?? new Date('2015-01-01').getTime();
  const xEnd = Math.max(points.at(-1)?.ts ?? Date.now(), ...boxes.map((b) => b.x2));
  const now = Date.now();

  return (
    <div style={{
      width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, backgroundColor: '#0D1117',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      display: 'flex', flexDirection: 'column', padding: PAD, boxSizing: 'border-box',
    }}>
      <div style={{ height: HEADER_H, flex: `0 0 ${HEADER_H}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, color: '#F7931A', letterSpacing: '0.12em', margin: 0, fontWeight: 700 }}>SKYLINE CYCLE TERMINAL</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: '4px 0 0' }}>BTC 1,064 / 364 Cycle Model</p>
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

          {boxes.map((b) => (
            <ReferenceArea
              key={b.id}
              x1={b.x1} x2={b.x2} y1={b.y1} y2={b.y2}
              fill={b.kind === 'bull' ? '#35D07F' : '#F85149'}
              fillOpacity={b.confirmed ? (b.kind === 'bull' ? 0.09 : 0.08) : 0.04}
              stroke={b.kind === 'bull' ? '#35D07F' : '#F85149'}
              strokeOpacity={b.confirmed ? 0.45 : 0.3}
              strokeWidth={1}
              strokeDasharray={b.confirmed ? undefined : '5 4'}
            />
          ))}

          <ReferenceLine
            x={now}
            stroke="#F7931A"
            strokeWidth={1.2}
            label={{ value: 'YOU ARE HERE', position: 'insideTopRight', fontSize: 9, fill: '#F7931A', fontWeight: 700 }}
          />

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
        </ComposedChart>
      </div>

      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: GAP }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 8, backgroundColor: 'rgba(53,208,127,0.3)', display: 'inline-block', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Bull Window</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 8, backgroundColor: 'rgba(248,81,73,0.3)', display: 'inline-block', borderRadius: 2 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>Bear Window</span>
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Historical timing model, not financial advice
        </span>
      </div>
    </div>
  );
}
