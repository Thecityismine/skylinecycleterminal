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
import {
  METAL_CONFIG,
  REGIME_FILL,
  MACRO_QUADRANT_LABEL,
  MACRO_QUADRANT_COLOR,
} from '@/lib/indicators/metalTrend';
import type { MetalWeeklyPoint, MetalCurrent, Metal, MetalRegime } from '@/lib/indicators/metalTrend';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type MetalsSharePayload = {
  metal:       Metal;
  chartData:   MetalWeeklyPoint[];
  current:     MetalCurrent;
  show50W:     boolean;
  show200W:    boolean;
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

export const METALS_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

type Zone = { start: string; end: string; regime: MetalRegime };

function buildZones(data: MetalWeeklyPoint[]): Zone[] {
  const zones: Zone[] = [];
  if (data.length === 0) return zones;
  let zoneStart = data[0].date;
  let zoneRegime = data[0].regime;
  for (let i = 1; i < data.length; i++) {
    if (data[i].regime !== zoneRegime) {
      zones.push({ start: zoneStart, end: data[i - 1].date, regime: zoneRegime });
      zoneStart = data[i].date;
      zoneRegime = data[i].regime;
    }
  }
  zones.push({ start: zoneStart, end: data[data.length - 1].date, regime: zoneRegime });
  return zones;
}

function formatDateTick(v: string): string {
  return new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtPrice(v: number, isGold: boolean): string {
  if (isGold) return v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`;
  return `$${v.toFixed(0)}`;
}

export function MetalsShareCard({ payload }: { payload: MetalsSharePayload }) {
  const { metal, chartData, current, show50W, show200W, generatedAt } = payload;
  const config   = METAL_CONFIG[metal];
  const zones    = buildZones(chartData);
  const isGold   = metal === 'gold';

  const regimeColor = current.trendRegime === 'bullish' ? '#35D07F'
    : current.trendRegime === 'bearish' ? '#F85149'
    : '#EAB84D';

  const quadrantColor = MACRO_QUADRANT_COLOR[current.macroQuadrant];
  const quadrantLabel = MACRO_QUADRANT_LABEL[current.macroQuadrant];

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const priceStr = isGold
    ? `$${current.price.toFixed(0)} / oz`
    : `$${current.price.toFixed(2)} / oz`;

  const dist50wStr = current.distFrom50w !== null
    ? `${current.distFrom50w >= 0 ? '+' : ''}${current.distFrom50w.toFixed(1)}%`
    : '—';

  const gsRatioStr = current.goldSilverRatio !== null
    ? current.goldSilverRatio.toFixed(1)
    : '—';

  const dist50wColor = current.distFrom50w !== null
    ? (current.distFrom50w >= 0 ? '#35D07F' : current.distFrom50w < -5 ? '#F85149' : '#8B949E')
    : '#8B949E';

  const stats = [
    {
      label: isGold ? 'GOLD PRICE' : 'SILVER PRICE',
      value: priceStr,
      sub:   config.symbol,
      color: config.accent,
    },
    {
      label: 'VS 50W MA',
      value: dist50wStr,
      sub:   current.ma50w !== null
        ? (isGold ? `50W: $${current.ma50w.toFixed(0)}` : `50W: $${current.ma50w.toFixed(2)}`)
        : '50W MA: —',
      color: dist50wColor,
    },
    {
      label: 'TREND REGIME',
      value: current.trendRegime === 'bullish' ? 'Bullish'
        : current.trendRegime === 'bearish' ? 'Bearish'
        : 'Neutral',
      sub:   `Score: ${current.trendScore} / 100`,
      color: regimeColor,
    },
    {
      label: 'MACRO CONTEXT',
      value: quadrantLabel,
      sub:   `G/S Ratio: ${gsRatioStr}`,
      color: quadrantColor,
    },
  ];

  const yTickFmt = (v: number) => fmtPrice(v, isGold);

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
            {config.label} Macro Chart · {config.symbol} · Weekly
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'nowrap', alignItems: 'center', overflow: 'hidden' }}>
            {([
              { color: config.accent, label: config.label },
              ...(show50W  ? [{ color: '#EAB84D', label: '50W MA'  }] : []),
              ...(show200W ? [{ color: '#5B84FF', label: '200W MA' }] : []),
            ] as { color: string; label: string }[]).map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: item.color, display: 'inline-block' }} />
                <span style={{ fontSize: 9, color: item.color, letterSpacing: '0.05em' }}>{item.label}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', backgroundColor: 'rgba(53,208,127,0.2)', border: '1px solid rgba(53,208,127,0.6)' }} />
              <span style={{ fontSize: 9, color: '#35D07F', letterSpacing: '0.05em' }}>Bullish</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', backgroundColor: 'rgba(248,81,73,0.2)', border: '1px solid rgba(248,81,73,0.6)' }} />
              <span style={{ fontSize: 9, color: '#F85149', letterSpacing: '0.05em' }}>Bearish</span>
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
            {current.trendRegime === 'bullish' ? 'Bullish' : current.trendRegime === 'bearish' ? 'Bearish' : 'Neutral'}
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
            tickFormatter={yTickFmt}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            axisLine={{ stroke: '#21262D' }}
            tickLine={false}
            width={52}
            domain={['auto', 'auto']}
          />

          <Area
            type="monotone"
            dataKey="close"
            stroke={config.accent}
            strokeWidth={2}
            fill={config.accent + '10'}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {show50W && (
            <Line
              type="monotone"
              dataKey="ma50w"
              stroke="#EAB84D"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {show200W && (
            <Line
              type="monotone"
              dataKey="ma200w"
              stroke="#5B84FF"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}
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
