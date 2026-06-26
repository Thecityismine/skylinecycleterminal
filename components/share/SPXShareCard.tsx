"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { NBER_RECESSIONS } from '@/lib/indicators/recessionRisk';
import type { SPXPoint } from '@/lib/indicators/recessionRisk';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type SPXSharePayload = {
  chartData:    SPXPoint[];
  spxPrice:     number;
  pctVs200w:    number | null;
  athDrawdown:  number;
  ath:          number;
  riskScore:    number;
  riskLabel:    string;
  riskColor:    string;
  show50w:      boolean;
  show200w:     boolean;
  showRecs:     boolean;
  generatedAt:  string;
};

const PAD       = 32;
const HEADER_H  = 72;
const STATS_H   = 52;
const GAP       = 10;
const STATS_GAP = 22;
const FOOTER_H  = 24;
const CHART_H   = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W   = SHARE_CARD_WIDTH  - PAD * 2;

export const SPX_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const LOG_TICKS  = [100, 500, 1_000, 2_000, 5_000, 10_000, 20_000];
const YEAR_TICKS = Array.from({ length: 26 }, (_, i) =>
  new Date(`${2000 + i}-01-01T00:00:00Z`).getTime()
);

function fmtPrice(v: number): string {
  if (v >= 10_000) return `${(v / 1_000).toFixed(0)}K`;
  if (v >= 1_000)  return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export function SPXShareCard({ payload }: { payload: SPXSharePayload }) {
  const { chartData, spxPrice, pctVs200w, athDrawdown, riskScore, riskLabel, riskColor, show50w, show200w, showRecs, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const vs200wColor = pctVs200w != null && pctVs200w >= 0 ? '#35D07F' : '#FF5C5C';
  const ddColor     = athDrawdown > -5 ? '#35D07F' : athDrawdown > -15 ? '#E6B450' : '#FF5C5C';

  const stats = [
    {
      label: 'S&P 500',
      value: spxPrice > 0 ? spxPrice.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—',
      sub:   'Latest close',
      color: '#E6EDF3',
    },
    {
      label: 'VS 200W MA',
      value: pctVs200w != null ? fmtPct(pctVs200w) : '—',
      sub:   'Price vs 200-week MA',
      color: vs200wColor,
    },
    {
      label: 'ATH DRAWDOWN',
      value: athDrawdown < -0.1 ? fmtPct(athDrawdown) : 'At ATH',
      sub:   'From all-time high',
      color: ddColor,
    },
    {
      label: 'RECESSION RISK',
      value: `${riskScore} / 100`,
      sub:   riskLabel,
      color: riskColor,
    },
  ];

  const recessionAreas = NBER_RECESSIONS.map(r => ({
    ...r,
    x1: new Date(r.start + 'T00:00:00Z').getTime(),
    x2: new Date(r.end   + 'T00:00:00Z').getTime(),
  }));

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

      {/* Header */}
      <div style={{
        height:         HEADER_H,
        flex:           `0 0 ${HEADER_H}px`,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        overflow:       'hidden',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#E6EDF3', textTransform: 'uppercase' }}>
            Skyline Cycle Terminal
          </div>
          <div style={{ fontSize: 12, color: '#8B949E', marginTop: 4, letterSpacing: '0.03em' }}>
            S&P 500 &amp; Recession Risk · Daily Close · FRED SP500
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
            {([
              { color: 'rgba(247,249,252,0.9)', label: 'S&P 500', show: true },
              { color: '#3B82F6',               label: '50W MA',  show: show50w  },
              { color: '#A855F7',               label: '200W MA', show: show200w },
            ] as { color: string; label: string; show: boolean }[])
              .filter(i => i.show)
              .map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: color, display: 'inline-block' }} />
                  <span style={{ fontSize: 9, color, letterSpacing: '0.05em' }}>{label}</span>
                </div>
              ))}
            {showRecs && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', backgroundColor: 'rgba(220,60,60,0.18)', border: '1px solid rgba(220,60,60,0.4)' }} />
                <span style={{ fontSize: 9, color: '#FF5C5C', letterSpacing: '0.05em' }}>NBER Recession</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.12em' }}>LIVE DATA</span>
          </div>
          <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3 }}>{dateStr}</div>
          <div style={{
            marginTop:       6,
            padding:         '2px 8px',
            borderRadius:    4,
            display:         'inline-block',
            backgroundColor: riskColor + '20',
            fontSize:        10,
            color:           riskColor,
          }}>
            {riskLabel}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        height:              STATS_H,
        flex:                `0 0 ${STATS_H}px`,
        display:             'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:                 12,
        marginTop:           GAP,
        marginBottom:        STATS_GAP,
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            backgroundColor: '#161B22',
            border:          '1px solid #21262D',
            borderRadius:    8,
            padding:         '4px 12px',
            display:         'flex',
            flexDirection:   'column',
            justifyContent:  'center',
          }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ width: CHART_W, height: CHART_H, flex: '0 0 auto' }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {showRecs && recessionAreas.map((r) => (
            <ReferenceArea
              key={r.label}
              x1={r.x1}
              x2={r.x2}
              fill="rgba(220,60,60,0.10)"
              stroke="rgba(220,60,60,0.25)"
              strokeWidth={1}
            />
          ))}

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            ticks={YEAR_TICKS}
            tickFormatter={ts => new Date(ts).getUTCFullYear().toString()}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
          />
          <YAxis
            scale="log"
            domain={['auto', 'auto']}
            ticks={LOG_TICKS}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={52}
            allowDataOverflow
          />

          {show200w && (
            <Line type="monotone" dataKey="ma200w" stroke="#A855F7" strokeWidth={1.5}
              dot={false} isAnimationActive={false} connectNulls={false} />
          )}
          {show50w && (
            <Line type="monotone" dataKey="ma50w"  stroke="#3B82F6" strokeWidth={1.5}
              dot={false} isAnimationActive={false} connectNulls={false} />
          )}
          <Line type="monotone" dataKey="price"  stroke="rgba(247,249,252,0.9)" strokeWidth={1.5}
            dot={false} isAnimationActive={false} />
        </ComposedChart>
      </div>

      {/* Footer */}
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
