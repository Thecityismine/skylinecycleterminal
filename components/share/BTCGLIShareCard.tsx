"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceArea, ReferenceDot,
} from 'recharts';
import type { BTCGliRow, GLITurningPoint, GLIPhaseZone, GLICurrentStats } from '@/lib/indicators/gliLag';
import { SIGNAL_COLOR, SIGNAL_LABEL } from '@/lib/indicators/gliLag';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type BTCGLISharePayload = {
  rows:          BTCGliRow[];
  turningPoints: GLITurningPoint[];
  phaseZones:    GLIPhaseZone[];
  current:       GLICurrentStats;
  rangeLabel:    string;
  generatedAt:   string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const BTC_GLI_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

const PHASE_FILL: Record<'rising' | 'falling', string> = {
  rising:  'rgba(53,208,127,0.08)',
  falling: 'rgba(248,81,73,0.08)',
};

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtP(v: number | null): string {
  return v == null ? '—' : fmtPrice(v);
}

export function BTCGLIShareCard({ payload }: { payload: BTCGLISharePayload }) {
  const { rows, turningPoints, phaseZones, current, rangeLabel, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const signalColor = SIGNAL_COLOR[current.signal];

  const first = rows[0]?.time, last = rows[rows.length - 1]?.time;
  const turningDots = turningPoints.filter(tp => first && last && tp.shiftedTime >= first && tp.shiftedTime <= last);

  const stats = [
    { label: 'BTC Price',       value: fmtP(current.btcPrice),                                          sub: 'Latest close',        color: '#F7931A' },
    { label: 'GLI (Shifted)',   value: current.gli != null ? current.gli.toFixed(1) : '—',               sub: `${current.gliTrend} phase`, color: '#F5F7FA' },
    { label: 'Active Lag',      value: `${current.lagDays}D`,                                            sub: 'Forward shift',       color: '#F5F7FA' },
    { label: '90D Correlation', value: current.correlation90d != null ? current.correlation90d.toFixed(2) : '—', sub: 'BTC vs shifted GLI', color: '#8B949E' },
  ];

  return (
    <div style={{
      width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT, backgroundColor: '#0D1117',
      position: 'relative', overflow: 'hidden', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      display: 'flex', flexDirection: 'column', padding: PAD, boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ height: HEADER_H, flex: `0 0 ${HEADER_H}px`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>BTC vs GLI Liquidity Lag</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            GLI shifted forward {current.lagDays}D · {rangeLabel}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>{rangeLabel}</span>
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, backgroundColor: signalColor + '20', color: signalColor }}>
              {SIGNAL_LABEL[current.signal]}
            </span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ height: STATS_H, flex: `0 0 ${STATS_H}px`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: GAP, marginBottom: GAP }}>
        {stats.map(s => (
          <div key={s.label} style={{ backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart data={rows} width={CHART_W} height={CHART_H} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {phaseZones.map(z => (
            <ReferenceArea key={z.start} yAxisId="price" x1={z.start} x2={z.end} fill={PHASE_FILL[z.phase]} strokeOpacity={0} />
          ))}

          <XAxis
            dataKey="time"
            tickFormatter={(d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            minTickGap={100}
          />
          <YAxis yAxisId="price" scale="log" domain={['auto', 'auto']} allowDataOverflow tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#21262D' }} tickLine={false} width={60} />
          <YAxis yAxisId="gli" orientation="right" domain={[0, 100]}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#21262D' }} tickLine={false} width={36} />

          <Area yAxisId="price" type="monotone" dataKey="btcClose" stroke="#F7931A" strokeWidth={2} fill="rgba(247,147,26,0.04)" dot={false} isAnimationActive={false} connectNulls />
          <Line yAxisId="gli" type="monotone" dataKey="gliShifted" stroke="#F5F7FA" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />

          {turningDots.map(tp => (
            <ReferenceDot key={`${tp.type}-${tp.time}`} yAxisId="gli" x={tp.shiftedTime} y={tp.gliValue} r={4} fill="#FDE047" stroke="#0D1117" strokeWidth={1} />
          ))}
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {[
            { color: '#F7931A', label: 'BTC Price' },
            { color: '#F5F7FA', label: `GLI + ${current.lagDays}D` },
            { color: '#FDE047', label: 'Turning Point' },
          ].map(l => (
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
