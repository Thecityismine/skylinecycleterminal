"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

type DataPoint = {
  time:      string;
  price:     number;
  dma200:    number | null;
  ma2y:      number | null;
  logReg:    number | null;
  rsi:       number | null;
  macd:      number | null;
  signal:    number | null;
  histogram: number | null;
};

export type PriceSharePayload = {
  data:        DataPoint[];
  overlays:    string[];        // Array — Set not serialisable
  halvings:    string[];
  logScale:    boolean;
  asset:       'btc' | 'eth';
  timeframe:   string;
  priceChange: number | null;
  generatedAt: string;
  logoSrc?:    string;
};

const PAD           = 32;
const HEADER_H      = 78;
const PRICE_STRIP_H = 56;
const FOOTER_H      = 28;
const CHART_H       = SHARE_CARD_HEIGHT - PAD - HEADER_H - PRICE_STRIP_H - FOOTER_H - PAD;
const CHART_W       = SHARE_CARD_WIDTH  - PAD * 2;

function fmtY(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

function fmtX(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const OVERLAY_META: Record<string, { color: string; label: string; dashed?: boolean }> = {
  '200 DMA':        { color: '#3B82F6', label: '200 DMA' },
  '2Y MA':          { color: '#35D07F', label: '2Y MA' },
  'Log Regression': { color: '#A855F7', label: 'Fair Value', dashed: true },
  'Halvings':       { color: '#F97316', label: 'Halvings' },
};

export function PriceShareCard({ payload }: { payload: PriceSharePayload }) {
  const { data, overlays, halvings, logScale, asset, timeframe, priceChange, generatedAt, logoSrc } = payload;

  const PRICE_COLOR = asset === 'eth' ? '#627EEA' : '#F7931A';
  const latest      = data[data.length - 1];
  const overlaySet  = new Set(overlays);

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

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
            {asset === 'btc' ? 'BTC / USD' : 'ETH / USD'} · Price Structure · {timeframe}
          </div>
          {/* Overlay legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'nowrap', alignItems: 'center', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: PRICE_COLOR, display: 'inline-block' }} />
              <span style={{ fontSize: 9, color: PRICE_COLOR, letterSpacing: '0.05em' }}>{asset.toUpperCase()} Price</span>
            </div>
            {Object.entries(OVERLAY_META).map(([name, { color, label }]) => {
              if (!overlaySet.has(name)) return null;
              if (name === 'Halvings') return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10, color, letterSpacing: '0.05em' }}>│ {label}</span>
                </div>
              );
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: color, display: 'inline-block' }} />
                  <span style={{ fontSize: 9, color, letterSpacing: '0.05em' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.12em' }}>LIVE DATA</span>
          </div>
          <div style={{ fontSize: 11, color: '#8B949E', marginTop: 3 }}>{dateStr}</div>
        </div>
      </div>

      {/* ── Price strip ── */}
      <div style={{
        height:     PRICE_STRIP_H,
        flex:       `0 0 ${PRICE_STRIP_H}px`,
        display:    'flex',
        alignItems: 'center',
        gap:        16,
      }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: PRICE_COLOR, lineHeight: 1 }}>
          ${Math.round(latest?.price ?? 0).toLocaleString()}
        </div>
        {priceChange != null && (
          <div style={{
            fontSize:        11,
            fontWeight:      600,
            color:           priceChange >= 0 ? '#35D07F' : '#FF5C5C',
            backgroundColor: (priceChange >= 0 ? '#35D07F' : '#FF5C5C') + '18',
            borderRadius:    6,
            padding:         '3px 10px',
            border:          `1px solid ${priceChange >= 0 ? '#35D07F' : '#FF5C5C'}40`,
          }}>
            {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(1)}% ({timeframe})
          </div>
        )}
        <div style={{ marginLeft: 'auto', fontSize: 9, color: '#4B5563', letterSpacing: '0.08em' }}>
          {logScale ? 'LOG SCALE' : 'LINEAR SCALE'}
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ width: CHART_W, height: CHART_H, flex: '0 0 auto' }}>
        <ComposedChart
          width={CHART_W}
          height={CHART_H}
          data={data}
          margin={{ top: 4, right: 56, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="price-grad-share" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={PRICE_COLOR} stopOpacity={0.2} />
              <stop offset="100%" stopColor={PRICE_COLOR} stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.6} vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={fmtX}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: '#21262D' }}
            minTickGap={80}
            interval="preserveStartEnd"
          />
          <YAxis
            scale={logScale ? 'log' : 'auto'}
            domain={logScale ? ['auto', 'auto'] : [0, 'auto']}
            tickFormatter={fmtY}
            tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            width={60}
            allowDataOverflow={logScale}
          />
          {overlaySet.has('Halvings') && halvings.map((h) => (
            <ReferenceLine
              key={h}
              x={h}
              stroke="#F97316"
              strokeDasharray="3 4"
              strokeOpacity={0.6}
              label={{ value: 'H', position: 'insideTopLeft', fill: '#F97316', fontSize: 9 }}
            />
          ))}
          {overlaySet.has('Log Regression') && (
            <Line type="monotone" dataKey="logReg" stroke="#A855F7" strokeWidth={1.5}
              strokeDasharray="5 3" dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlaySet.has('2Y MA') && (
            <Line type="monotone" dataKey="ma2y" stroke="#35D07F" strokeWidth={1.5}
              dot={false} isAnimationActive={false} connectNulls />
          )}
          {overlaySet.has('200 DMA') && (
            <Line type="monotone" dataKey="dma200" stroke="#3B82F6" strokeWidth={1.5}
              dot={false} isAnimationActive={false} connectNulls />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke={PRICE_COLOR}
            strokeWidth={1.5}
            fill="url(#price-grad-share)"
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

      {/* ── Watermark — LAST in DOM so html-to-image always paints it on top ── */}
      <div style={{
        position:      'absolute',
        top:           '50%',
        left:          '50%',
        transform:     'translate(-50%, -50%)',
        pointerEvents: 'none',
        userSelect:    'none',
        textAlign:     'center',
        opacity:       logoSrc ? 0.13 : 0.09,
        zIndex:        20,
      }}>
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" style={{ display: 'block', width: 320, height: 'auto' }} />
        ) : (
          <>
            <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: '0.18em', color: '#FFFFFF', textTransform: 'uppercase', fontFamily: "'Orbitron', ui-monospace, monospace", lineHeight: 1 }}>
              SKYLINE
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.42em', color: '#FFFFFF', textTransform: 'uppercase', fontFamily: "'Orbitron', ui-monospace, monospace", marginTop: 10 }}>
              CYCLE TERMINAL
            </div>
          </>
        )}
      </div>
    </div>
  );
}
