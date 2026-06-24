"use client";

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, ReferenceArea, ReferenceLine,
} from 'recharts';
import type { EquityPoint, ZoneSegment, TrendMetrics, ScoreResult, EquityZone } from '@/lib/indicators/equityScore';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type EquitySharePayload = {
  ticker:     string;
  name:       string;
  sector:     string;
  type:       string;
  color:      string;
  points:     EquityPoint[];
  segments:   ZoneSegment[];
  price:      number | null;
  change1d:   number | null;
  currency:   string | null;
  trend:      TrendMetrics;
  scores:     ScoreResult;
  logScale:   boolean;
  startTs:    number;
  generatedAt: string;
  logoSrc?:   never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 68;
const GAP      = 8;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const EQUITY_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + GAP, w: CHART_W, h: CHART_H,
};

const ZONE_FILL: Record<EquityZone, string> = {
  green: 'rgba(53,208,127,0.07)',
  amber: 'rgba(230,180,80,0.06)',
  red:   'rgba(255,92,92,0.07)',
  none:  'transparent',
};

function fmtP(v: number | null, currency?: string | null): string {
  if (v == null) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  if (v >= 1000) return `${sym}${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${sym}${v.toFixed(2)}`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function scoreColor(score: number, invert = false): string {
  if (invert) return score >= 65 ? '#35D07F' : score >= 45 ? '#E6B450' : '#FF5C5C';
  return score < 45 ? '#35D07F' : score < 70 ? '#E6B450' : '#FF5C5C';
}

export function EquityShareCard({ payload }: { payload: EquitySharePayload }) {
  const {
    ticker, name, sector, type, color,
    points, segments,
    price, change1d, currency,
    trend, scores,
    logScale, startTs,
    generatedAt,
  } = payload;

  const filtered     = startTs ? points.filter((p) => p.ts >= startTs) : points;
  const filteredSegs = startTs
    ? segments.filter((s) => s.x2 >= startTs).map((s) => ({ ...s, x1: Math.max(s.x1, startTs) }))
    : segments;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const isEtf = type === 'etf' || type === 'preferred';
  const change1dColor = change1d != null ? (change1d >= 0 ? '#35D07F' : '#FF5C5C') : '#94A3B8';

  const prices = filtered.map((p) => p.close).filter(Boolean);
  const minP   = prices.length ? Math.min(...prices) : 0;
  const maxP   = prices.length ? Math.max(...prices) : 1;
  const pad    = (maxP - minP) * 0.05;
  const domain: [number | string, number | string] = logScale
    ? ['auto', 'auto']
    : [Math.max(0, minP - pad), maxP + pad];
  const athInRange = trend.ath > 0 && trend.ath <= maxP * 1.2;

  const stats = [
    {
      label: 'Price',
      value: fmtP(price, currency),
      sub:   change1d != null ? `${change1d >= 0 ? '+' : ''}${change1d.toFixed(2)}% today` : 'Latest close',
      color: change1dColor,
    },
    {
      label: 'vs 200W MA',
      value: trend.priceVs200w != null ? `${trend.priceVs200w.toFixed(2)}×` : '—',
      sub:   scores.trendLabel,
      color: scoreColor(scores.trend),
    },
    {
      label: isEtf ? 'From ATH' : 'Valuation',
      value: isEtf
        ? (trend.drawdownFromAth != null ? `${(trend.drawdownFromAth * 100).toFixed(1)}%` : '—')
        : scores.valuationLabel,
      sub: isEtf ? 'Drawdown from ATH' : `Score ${scores.valuation}`,
      color: isEtf
        ? (trend.drawdownFromAth != null && trend.drawdownFromAth > -0.1 ? '#35D07F' : '#FF5C5C')
        : scoreColor(scores.valuation),
    },
    {
      label: 'Signal',
      value: isEtf ? scores.trendLabel : scores.quadrantLabel,
      sub:   isEtf ? `Trend ${scores.trend}` : `Quality ${scores.quality}`,
      color: isEtf ? scoreColor(scores.trend) : scores.quadrantColor,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: color + '20',
            fontSize: 14, fontWeight: 700, color,
          }}>
            {ticker.slice(0, 2)}
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>{name || ticker}</p>
            <p style={{ fontSize: 12, color: '#8B949E', margin: '3px 0 0' }}>
              {ticker} · {sector} · {type === 'etf' ? 'ETF' : type === 'preferred' ? 'Preferred' : 'Equity'}
              {logScale ? ' · Log Scale' : ''}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <span style={{
            padding: '2px 8px', borderRadius: 4,
            backgroundColor: scores.quadrantColor + '20',
            fontSize: 10, color: scores.quadrantColor,
          }}>
            {isEtf ? scores.trendLabel : scores.quadrantLabel}
          </span>
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
        {stats.map((s) => (
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
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart
          data={filtered}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 8, right: 8, bottom: 0, left: 4 }}
        >
          <defs>
            <linearGradient id={`eq-fill-${ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
              <stop offset="95%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />

          {filteredSegs.map((s, i) => (
            <ReferenceArea key={i} x1={s.x1} x2={s.x2} fill={ZONE_FILL[s.zone]} stroke="none" />
          ))}

          {athInRange && (
            <ReferenceLine
              y={trend.ath}
              stroke="rgba(255,255,255,0.20)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: 'ATH', position: 'insideTopRight', fill: 'rgba(255,255,255,0.30)', fontSize: 9 }}
            />
          )}

          <XAxis
            dataKey="ts" type="number" scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtDate}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false} axisLine={{ stroke: '#1E293B' }}
            minTickGap={60}
          />
          <YAxis
            scale={logScale ? 'log' : 'linear'}
            domain={domain}
            tickFormatter={(v: number) => fmtP(v, currency)}
            tick={{ fill: '#6B7280', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false} axisLine={false} width={60}
            allowDataOverflow
          />

          <Area
            dataKey="close"
            stroke={color} strokeWidth={1.5}
            fill={`url(#eq-fill-${ticker})`}
            dot={false} isAnimationActive={false}
          />
          <Line dataKey="ma200w" stroke="#5B7DD8" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
          <Line dataKey="ma50w"  stroke="#D4A853" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls />
        </ComposedChart>
      </div>

      {/* Footer */}
      <div style={{
        flex:           '1 1 auto',
        display:        'flex',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 2, backgroundColor: color, display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>{ticker} Price</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 2, backgroundColor: '#D4A853', display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>50W SMA</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 2, backgroundColor: '#5B7DD8', display: 'inline-block', borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: '#8B949E' }}>200W SMA</span>
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
