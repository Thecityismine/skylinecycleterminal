"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
} from 'recharts';
import type { RegimePoint, RegimeZone, RegimeCurrent } from '@/lib/indicators/regimeHelpers';
import { REGIME_FILL, REGIME_COLOR, REGIME_LABEL } from '@/lib/indicators/regimeHelpers';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type RegimeSharePayload = {
  points:      RegimePoint[];
  zones:       RegimeZone[];
  current:     RegimeCurrent;
  showMA:      boolean;
  generatedAt: string;
  logoSrc?:    never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const FOOTER_H = 28;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - STATS_H - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH  - PAD * 2;

export const REGIME_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + STATS_H, w: CHART_W, h: CHART_H,
};

const LOG_TICKS  = [100, 1_000, 10_000, 100_000, 1_000_000];
const YEAR_TICKS = Array.from({ length: 14 }, (_, i) =>
  new Date(`${2012 + i}-01-01`).getTime(),
);

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

export function RegimeShareCard({ payload }: { payload: RegimeSharePayload }) {
  const { points, zones, current, showMA, generatedAt, logoSrc } = payload;

  const regimeColor = REGIME_COLOR[current.regime];
  const regimeLabel = REGIME_LABEL[current.regime];

  const ma200Pct = current.priceVsMA200;
  const ma200PctStr = ma200Pct != null
    ? `${ma200Pct >= 0 ? '+' : ''}${ma200Pct.toFixed(1)}%`
    : '—';

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const stats = [
    {
      label: 'CURRENT REGIME',
      value: regimeLabel,
      sub:   current.ma200Direction === 'rising' ? '200DMA rising'
           : current.ma200Direction === 'falling' ? '200DMA falling'
           : '200DMA flat',
      color: regimeColor,
    },
    {
      label: 'DAYS IN REGIME',
      value: `${current.daysInRegime}d`,
      sub:   '',
      color: regimeColor,
    },
    {
      label: 'PRICE VS 200 DMA',
      value: ma200PctStr,
      sub:   current.ma200 ? fmtUSD(current.ma200) : '',
      color: ma200Pct != null ? (ma200Pct >= 0 ? '#35D07F' : '#FF5C5C') : '#6F7A86',
    },
    {
      label: 'CONFIDENCE',
      value: `${current.confidencePct}%`,
      sub:   current.confidencePct >= 70 ? 'Strong signal'
           : current.confidencePct >= 40 ? 'Moderate signal'
           : 'Weak / transition',
      color: current.confidencePct >= 70 ? regimeColor : '#E6B450',
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
            BTC Market Regime · Bull & Bear Classification
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'nowrap', alignItems: 'center', overflow: 'hidden' }}>
            {(['bull', 'bear', 'neutral'] as const).map((r) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', backgroundColor: REGIME_FILL[r], border: `1px solid ${REGIME_COLOR[r]}` }} />
                <span style={{ fontSize: 9, color: REGIME_COLOR[r], letterSpacing: '0.05em' }}>
                  {r === 'bull' ? 'Bull Market' : r === 'bear' ? 'Bear Market' : 'Neutral'}
                </span>
              </div>
            ))}
            {showMA && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: '#F7931A', display: 'inline-block' }} />
                <span style={{ fontSize: 9, color: '#F7931A', letterSpacing: '0.05em' }}>200 DMA</span>
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
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div style={{
        height:        STATS_H,
        flex:          `0 0 ${STATS_H}px`,
        display:       'flex',
        gap:           0,
        borderTop:     '1px solid #21262D',
        borderBottom:  '1px solid #21262D',
        marginTop:     8,
      }}>
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              flex:        1,
              padding:     '10px 16px',
              borderRight: i < stats.length - 1 ? '1px solid #21262D' : 'none',
              display:     'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap:         2,
            }}
          >
            <div style={{ fontSize: 8, color: '#6B7280', letterSpacing: '0.12em' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: 9, color: '#6B7280' }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── Chart ── */}
      <div style={{ width: CHART_W, height: CHART_H, flex: '0 0 auto' }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={points}
          margin={{ top: 4, right: 52, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(38,50,65,0.4)" vertical={false} />

          {zones.map((z) => (
            <ReferenceArea
              key={`${z.start}-${z.regime}`}
              x1={z.startTs}
              x2={z.endTs}
              fill={REGIME_FILL[z.regime]}
              stroke="none"
              label={z.durationDays >= 90
                ? {
                    value:    z.regime === 'bull' ? 'Bull' : z.regime === 'bear' ? 'Bear' : '',
                    position: 'insideTop',
                    fill:     REGIME_COLOR[z.regime],
                    fontSize: 9,
                    opacity:  0.65,
                  }
                : undefined
              }
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
            scale="log"
            domain={[100, 'auto']}
            ticks={LOG_TICKS}
            tickFormatter={fmtPrice}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={56}
          />

          {showMA && (
            <Line
              type="monotone"
              dataKey="ma200"
              stroke="#F7931A"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          )}

          <Line
            type="monotone"
            dataKey="price"
            stroke="rgba(247,249,252,0.9)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
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
