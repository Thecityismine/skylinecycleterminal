"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceArea,
} from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import type { LiquidityChartRow, LiquidityRegimeZone, LiquidityCurrentStats } from '@/lib/indicators/liquidityRegime';
import { REGIME_COLOR, REGIME_FILL, REGIME_LABEL } from '@/lib/indicators/liquidityRegime';

export type LiquidityRegimeSharePayload = {
  chartData:   LiquidityChartRow[];
  zones:       LiquidityRegimeZone[];
  current:     LiquidityCurrentStats;
  generatedAt: string;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const LIQUIDITY_REGIME_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtXTick(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function LiquidityRegimeShareCard({ payload }: { payload: LiquidityRegimeSharePayload }) {
  const { chartData, zones, current, generatedAt } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const regimeColor = REGIME_COLOR[current.regime];

  const fmtChange = (v: number | null, decimals = 1, suffix = '%'): string => {
    if (v == null) return '—';
    return `${v >= 0 ? '+' : ''}${v.toFixed(decimals)}${suffix}`;
  };

  const dxyColor = current.dxyChange90d != null
    ? (current.dxyChange90d < 0 ? '#35D07F' : '#F85149')
    : '#8B949E';

  const stats = [
    {
      label: 'Liquidity Score',
      value: `${Math.round(current.score)} / 100`,
      sub:   REGIME_LABEL[current.regime],
      color: regimeColor,
    },
    {
      label: 'DXY 90d Change',
      value: fmtChange(current.dxyChange90d),
      sub:   current.dxyChange90d != null ? (current.dxyChange90d < -1 ? 'Weakening' : current.dxyChange90d > 1 ? 'Strengthening' : 'Flat') : '—',
      color: dxyColor,
    },
    {
      label: '10Y Real Yield',
      value: fmtChange(current.realYieldChange90d, 2, 'pp'),
      sub:   '90d change',
      color: '#FF7A7A',
    },
    {
      label: 'Stablecoin Supply',
      value: fmtChange(current.stablecoin30d),
      sub:   '30-day growth',
      color: '#5B84FF',
    },
  ];

  return (
    <div style={{
      width:           SHARE_CARD_WIDTH,
      height:          SHARE_CARD_HEIGHT,
      backgroundColor: '#0D1117',
      position:        'relative',
      overflow:        'hidden',
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
        alignItems:     'flex-start',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>
            BTC Liquidity Regime Matrix
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            Fed balance sheet · DXY · real yields · M2 · stablecoin supply
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: regimeColor + '20', fontSize: 10, color: regimeColor, fontWeight: 600 }}>
              {REGIME_LABEL[current.regime]}
            </span>
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
        marginBottom:        GAP,
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            backgroundColor: '#161B22',
            border:          '1px solid #21262D',
            borderRadius:    8,
            padding:         '10px 12px',
            display:         'flex',
            flexDirection:   'column',
            justifyContent:  'center',
          }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart
          data={chartData}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 8, right: 16, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.5} vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={fmtXTick}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={80}
          />

          <YAxis
            scale="log"
            domain={['auto', 'auto']}
            allowDataOverflow
            tickFormatter={fmtY}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={68}
          />

          {/* Regime background shading */}
          {zones.map(z => (
            <ReferenceArea
              key={z.start}
              x1={z.start}
              x2={z.end}
              fill={REGIME_FILL[z.regime]}
              strokeOpacity={0}
            />
          ))}

          {/* BTC Price */}
          <Area
            type="monotone"
            dataKey="price"
            stroke="rgba(245,247,250,0.85)"
            strokeWidth={1.5}
            fill="rgba(245,247,250,0.02)"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* 100W MA */}
          <Line
            type="monotone"
            dataKey="ma100w"
            stroke="#E6B450"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {[
            { color: '#35D07F',             label: 'Strong', square: true },
            { color: '#EAB84D',             label: 'Improving', square: true },
            { color: '#F97316',             label: 'Restrictive', square: true },
            { color: '#F85149',             label: 'Tight', square: true },
            { color: 'rgba(245,247,250,0.85)', label: 'BTC Price' },
            { color: '#E6B450',             label: '100W MA' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {(l as { color: string; label: string; square?: boolean }).square ? (
                <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: l.color, display: 'inline-block' }} />
              ) : (
                <span style={{ width: 16, height: 2, backgroundColor: l.color, display: 'inline-block', borderRadius: 1 }} />
              )}
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
