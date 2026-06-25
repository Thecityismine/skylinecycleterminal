"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { RealizedPricePoint } from '@/lib/api/coinmetrics';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type RealizedPriceSharePayload = {
  data:            RealizedPricePoint[];
  period:          string;
  currentPrice:    number;
  ma200w:          number | null;
  ratio:           number | null;
  premium:         number | null;
  zoneLabel:       string;
  zoneColor:       string;
  secondaryLabel:  string;
  secondaryColor:  string;
  generatedAt:     string;
  logoSrc?:        never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 10;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const REALIZED_PRICE_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

function fmtFull(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number | null): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function fmtX(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export function RealizedPriceShareCard({ payload }: { payload: RealizedPriceSharePayload }) {
  const {
    data, period,
    currentPrice, ma200w, ratio, premium,
    zoneLabel, zoneColor,
    secondaryLabel, secondaryColor,
    generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const stats = [
    { label: 'BTC Price',          value: fmtFull(currentPrice), sub: 'Latest close',            color: '#F7931A'      },
    { label: secondaryLabel,       value: fmtFull(ma200w),       sub: 'Long-term trend floor',   color: secondaryColor },
    { label: 'Price / 200W MA',    value: ratio != null ? `${ratio.toFixed(2)}Ã—` : '—',          sub: zoneLabel,       color: zoneColor      },
    { label: 'Premium to MA',      value: fmtPct(premium),       sub: premium != null && premium < 0 ? 'Below MA — historic buy' : premium != null && premium < 100 ? 'Low risk zone' : 'Elevated premium', color: premium == null ? '#8B949E' : premium < 0 ? '#3B82F6' : premium < 100 ? '#35D07F' : premium < 300 ? '#E6B450' : '#FF5C5C' },
  ];

  // Downsample for rendering consistency
  const sampled = data.length <= 500 ? data : (() => {
    const step = Math.floor(data.length / 500);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  })();

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
            BTC Price vs 200-Week MA
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 12px' }}>
            The Bitcoin Investor Tool · No weekly close has ever broken below the 200W MA
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 0' }}>{dateStr}</p>
          <span style={{
            display: 'inline-block', marginTop: 4,
            padding: '2px 8px', borderRadius: 4,
            backgroundColor: '#21262D', fontSize: 10, color: '#8B949E',
          }}>
            {period}
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
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <ComposedChart
          data={sampled}
          width={CHART_W}
          height={CHART_H}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.6} />

          <XAxis
            dataKey="time"
            tickFormatter={fmtX}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            minTickGap={80}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={fmtY}
            tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={58}
          />

          {/* 200W MA — drawn first so BTC sits on top */}
          <Line type="monotone" dataKey="realized" stroke={secondaryColor} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />

          {/* BTC price */}
          <Line type="monotone" dataKey="price" stroke="#F7931A" strokeWidth={1.5} dot={false} isAnimationActive={false} />

          {/* Reference line at current 200W MA */}
          {sampled.at(-1)?.realized != null && (
            <ReferenceLine
              y={sampled.at(-1)!.realized!}
              stroke={secondaryColor}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
          )}
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 2, backgroundColor: '#F7931A', display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: '#F7931A' }}>BTC Price</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 16, height: 2, backgroundColor: secondaryColor, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: secondaryColor }}>{secondaryLabel}</span>
            </span>
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Not financial advice
        </span>
      </div>
    </div>
  );
}
