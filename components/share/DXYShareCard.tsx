"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import type { DxyWeeklyPoint, DxyZone, DxyCurrent } from '@/lib/indicators/dxyTrend';
import { REGIME_FILL, REGIME_COLOR, REGIME_LABEL } from '@/lib/indicators/dxyTrend';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type DXYSharePayload = {
  chartData:   DxyWeeklyPoint[];
  zones:       DxyZone[];
  current:     DxyCurrent;
  generatedAt: string;
  logoSrc?:    never;
};

const PAD       = 32;
const HEADER_H  = 72;
const STATS_H   = 52;
const GAP       = 10;
const STATS_GAP = 22;
const FOOTER_H  = 24;
const CHART_H   = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W   = SHARE_CARD_WIDTH  - PAD * 2;

export const DXY_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

function formatDateTick(v: string): string {
  return new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function DXYShareCard({ payload }: { payload: DXYSharePayload }) {
  const { chartData, zones, current, generatedAt } = payload;

  const regimeColor = REGIME_COLOR[current.trendRegime];
  const regimeLabel = REGIME_LABEL[current.trendRegime];

  const btcContextColor = current.btcContext === 'headwind' ? '#F85149'
    : current.btcContext === 'tailwind' ? '#35D07F'
    : '#EAB84D';

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const change90dStr = current.change90d !== null
    ? `${current.change90d >= 0 ? '+' : ''}${current.change90d.toFixed(1)}%`
    : '—';

  const change90dColor = current.change90d !== null
    ? (current.change90d < 0 ? '#35D07F' : '#F85149')
    : '#6F7A86';

  const stats = [
    {
      label: 'DXY CURRENT',
      value: current.dxy.toFixed(1),
      sub:   'DTWEXBGS broad index',
      color: regimeColor,
    },
    {
      label: '90D CHANGE',
      value: change90dStr,
      sub:   'vs 13 weeks ago',
      color: change90dColor,
    },
    {
      label: 'TREND REGIME',
      value: regimeLabel,
      sub:   'vs 200-week moving avg',
      color: regimeColor,
    },
    {
      label: 'BTC CONTEXT',
      value: current.btcContext === 'headwind' ? 'Headwind'
           : current.btcContext === 'tailwind'  ? 'Tailwind'
           : 'Neutral',
      sub:   `Score: ${current.trendScore} / 100`,
      color: btcContextColor,
    },
  ];

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
        overflow:       'hidden',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#E6EDF3', textTransform: 'uppercase' }}>
            Skyline Cycle Terminal
          </div>
          <div style={{ fontSize: 12, color: '#8B949E', marginTop: 4, letterSpacing: '0.03em' }}>
            DXY — U.S. Dollar Index · Dollar Trend & Liquidity Pressure
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'nowrap', alignItems: 'center', overflow: 'hidden' }}>
            {([
              { color: '#7AA2FF', label: 'DXY'    },
              { color: '#EAB84D', label: '50W MA'  },
              { color: '#8C6BFF', label: '200W MA' },
            ] as const).map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: item.color, display: 'inline-block' }} />
                <span style={{ fontSize: 9, color: item.color, letterSpacing: '0.05em' }}>{item.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', backgroundColor: 'rgba(248,81,73,0.2)', border: '1px solid rgba(248,81,73,0.6)' }} />
              <span style={{ fontSize: 9, color: '#F85149', letterSpacing: '0.05em' }}>BTC Headwind</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', backgroundColor: 'rgba(53,208,127,0.2)', border: '1px solid rgba(53,208,127,0.6)' }} />
              <span style={{ fontSize: 9, color: '#35D07F', letterSpacing: '0.05em' }}>BTC Tailwind</span>
            </div>
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
            backgroundColor: regimeColor + '20',
            fontSize:        10,
            color:           regimeColor,
          }}>
            {regimeLabel}
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
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

      {/* ── Chart ── */}
      <div style={{ width: CHART_W, height: CHART_H, flex: '0 0 auto' }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {zones.map((zone, i) => (
            <ReferenceArea
              key={i}
              x1={zone.start}
              x2={zone.end}
              fill={REGIME_FILL[zone.regime]}
              strokeOpacity={0}
            />
          ))}

          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            minTickGap={80}
          />
          <YAxis
            tickFormatter={(v: number) => v.toFixed(0)}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={44}
            domain={['auto', 'auto']}
          />

          <Area
            type="monotone"
            dataKey="dxy"
            stroke="#7AA2FF"
            strokeWidth={2}
            fill="rgba(122,162,255,0.05)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="ma50w"
            stroke="#EAB84D"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="ma200w"
            stroke="#8C6BFF"
            strokeWidth={1.5}
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
