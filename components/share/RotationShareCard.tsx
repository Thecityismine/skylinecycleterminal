"use client";

import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import { fmtRotationValue } from '@/components/rotation/RotationChart';

export type RotationSharePoint = {
  time:       string;
  ts:         number;
  value:      number;
  ma50:       number | null;
  ma100:      number | null;
  ma200:      number | null;
  cloudUpper: number | null;
  cloudLower: number | null;
};

export type RotationSharePayload = {
  ticker:          string;
  title:           string;
  subtitle:        string;
  color:           string;
  isRatio:         boolean;
  points:          RotationSharePoint[];
  ma:              50 | 100 | 200;
  rangeLabel:      string;
  logScale:        boolean;
  score:           number;
  regimeLabel:     string;
  regimeColor:     string;
  currentValue:    number;
  distanceFromATH: number;
  trend:           string;
  generatedAt:     string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const ROTATION_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

const YEAR_TICKS = Array.from({ length: 20 }, (_, i) =>
  new Date(`${2011 + i}-01-01T00:00:00Z`).getTime(),
);

export function RotationShareCard({ payload }: { payload: RotationSharePayload }) {
  const {
    ticker, title, subtitle, color, isRatio, points, ma, rangeLabel, logScale,
    score, regimeLabel, regimeColor, currentValue, distanceFromATH, trend, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const maKey = ma === 50 ? 'ma50' : ma === 100 ? 'ma100' : 'ma200';

  const stats = [
    { label: ticker,          value: fmtRotationValue(currentValue, isRatio), sub: 'Current value',          color },
    { label: 'Distance / ATH', value: `${distanceFromATH.toFixed(1)}%`,       sub: 'From cycle high',         color: distanceFromATH >= 0 ? '#35D07F' : '#FF5C5C' },
    { label: 'Trend',          value: trend,                                  sub: `${ma}W EMA read`,          color: trend === 'Bullish' ? '#35D07F' : trend === 'Bearish' ? '#FF5C5C' : '#E6B450' },
    { label: 'Rotation Score', value: `${score}`,                             sub: regimeLabel,                color: regimeColor },
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
          <p style={{ fontSize: 12, color: '#8B949E', margin: 0, letterSpacing: '0.08em' }}>SKYLINE · MARKET ROTATION</p>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: '4px 0 0' }}>{title}</p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>{subtitle}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>{rangeLabel}</span>
            {logScale && <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>Log</span>}
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, backgroundColor: regimeColor + '20', color: regimeColor }}>{regimeLabel}</span>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ height: STATS_H, flex: `0 0 ${STATS_H}px`, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: GAP, marginBottom: GAP }}>
        {stats.map((s) => (
          <div key={s.label} style={{ backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart data={points} width={CHART_W} height={CHART_H} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />
          <XAxis
            dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} ticks={YEAR_TICKS}
            tickFormatter={(ts) => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }} tickLine={false}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'} domain={['auto', 'auto']} allowDataOverflow
            tickFormatter={(v) => fmtRotationValue(v, isRatio)}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }} tickLine={false} width={60}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.05} dot={false} isAnimationActive={false} connectNulls />
          <Line type="monotone" dataKey={maKey} stroke="#5B84FF" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {[{ color, label: ticker }, { color: '#5B84FF', label: `${ma}W EMA` }].map((l) => (
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
