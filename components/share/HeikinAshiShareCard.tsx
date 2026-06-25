"use client";

import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';
import type { HACandle } from '@/components/charts/HeikinAshiChart';

export type HeikinAshiSharePayload = {
  candles:    HACandle[];
  latest:     HACandle | null;
  lastSig:    HACandle | null;
  signalGain: number | null;
  generatedAt: string;
  logoSrc?:   never;
};

const PAD      = 32;
const HEADER_H = 72;
const STATS_H  = 52;
const GAP      = 10;
const STATS_GAP = 22;
const FOOTER_H = 24;
const CHART_H  = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W  = SHARE_CARD_WIDTH - PAD * 2;

export const HEIKIN_ASHI_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

// Chart layout constants (within the SVG)
const PL = 52;   // left padding (Y-axis label room)
const PR = 8;
const PT = 10;
const PB = 22;

const GREEN     = '#35D07F';
const RED       = '#FF5C5C';
const GREEN_DIM = '#35D07F70';
const RED_DIM   = '#FF5C5C70';

const Y_TICKS = [0.1, 1, 10, 100, 1_000, 10_000, 100_000];

function fmtTick(v: number): string {
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${Math.round(v).toLocaleString('en-US')}`;
  return `$${v.toFixed(2)}`;
}

export function HeikinAshiShareCard({ payload }: { payload: HeikinAshiSharePayload }) {
  const { candles, latest, lastSig, signalGain, generatedAt } = payload;

  const isGreen    = latest?.isGreen ?? false;
  const isSignal   = latest?.isBearEndSignal ?? false;
  const statusColor = isGreen ? GREEN : RED;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const stats = [
    {
      label: 'Monthly HA',
      value: isSignal ? 'â–² Signal' : isGreen ? 'â–² Green' : 'â–¼ Red',
      sub:   latest ? `${latest.month}${latest.partial ? ' · partial' : ''}` : 'â€”',
      color: statusColor,
    },
    {
      label: 'Real Close',
      value: latest ? fmtPrice(latest.realClose) : 'â€”',
      sub:   'Latest monthly close',
      color: '#F7F9FC',
    },
    {
      label: 'Last Signal',
      value: lastSig?.month ?? 'â€”',
      sub:   lastSig ? `After ${lastSig.redStreakBefore} red months` : 'No signal on record',
      color: GREEN,
    },
    {
      label: 'Since Signal',
      value: signalGain != null ? `${signalGain >= 0 ? '+' : ''}${signalGain.toFixed(0)}%` : 'â€”',
      sub:   'Return from last bear-end',
      color: signalGain != null ? (signalGain >= 0 ? GREEN : RED) : '#F7F9FC',
    },
  ];

  // â”€â”€â”€ SVG chart math â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const innerW = CHART_W - PL - PR;
  const innerH = CHART_H - PT - PB;
  const n      = candles.length;
  const step   = n > 0 ? innerW / n : 6;
  const cw     = Math.max(step - 1.5, 1);

  const allLows  = candles.filter(c => c.haLow > 0).map(c => c.haLow);
  const allHighs = candles.map(c => c.haHigh);
  const logMin   = allLows.length   ? Math.log10(Math.min(...allLows)  * 0.85) : 0;
  const logMax   = allHighs.length  ? Math.log10(Math.max(...allHighs) * 1.15) : 5;

  const ly = (v: number) =>
    PT + innerH * (1 - (Math.log10(Math.max(v, 0.001)) - logMin) / (logMax - logMin));

  const visibleTicks = Y_TICKS.filter(t => {
    const lv = Math.log10(t);
    return lv >= logMin && lv <= logMax;
  });

  const xLabels: { year: string; x: number }[] = [];
  candles.forEach((c, i) => {
    if (c.month.slice(5) === '01') {
      xLabels.push({ year: c.month.slice(0, 4), x: PL + i * step + cw / 2 });
    }
  });

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
            Monthly Heikin-Ashi
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 10px' }}>
            BTC monthly HA candles · Log scale · Bear market end signals
          </p>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#21262D', fontSize: 10, color: '#8B949E' }}>
            Log
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
            padding:         '4px 12px',
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

      {/* SVG Chart */}
      <div style={{ flex: '0 0 auto' }}>
        <svg width={CHART_W} height={CHART_H} style={{ display: 'block' }}>

          {/* Grid lines + Y-axis labels */}
          {visibleTicks.map(t => {
            const y = ly(t);
            return (
              <g key={t}>
                <line
                  x1={PL} y1={y} x2={CHART_W - PR} y2={y}
                  stroke="rgba(38,50,65,0.5)" strokeWidth={1}
                />
                <text
                  x={PL - 4} y={y}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize={9} fill="#6B7280" fontFamily="monospace"
                >
                  {fmtTick(t)}
                </text>
              </g>
            );
          })}

          {/* X-axis year labels */}
          {xLabels.map(({ year, x }) => (
            <text
              key={year} x={x} y={CHART_H - 4}
              textAnchor="middle" fontSize={9} fill="#6B7280" fontFamily="monospace"
            >
              {year}
            </text>
          ))}

          {/* Candles */}
          {candles.map((c, i) => {
            const cx      = PL + i * step + cw / 2;
            const x       = PL + i * step;
            const yHigh   = ly(c.haHigh);
            const yLow    = ly(c.haLow);
            const bodyTop = Math.min(ly(c.haOpen), ly(c.haClose));
            const bodyBot = Math.max(ly(c.haOpen), ly(c.haClose));
            const bodyH   = Math.max(bodyBot - bodyTop, 1);
            const color   = c.isGreen
              ? (c.partial ? GREEN_DIM : GREEN)
              : (c.partial ? RED_DIM   : RED);

            return (
              <g key={c.month}>
                <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth={1} />
                <rect x={x} y={bodyTop} width={cw} height={bodyH} fill={color} />
                {c.isBearEndSignal && (
                  <polygon
                    points={`${cx},${yHigh - 10} ${cx - 4},${yHigh - 2} ${cx + 4},${yHigh - 2}`}
                    fill={GREEN}
                  />
                )}
              </g>
            );
          })}

        </svg>
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
              { color: GREEN, label: 'Bullish HA'       },
              { color: RED,   label: 'Bearish HA'       },
              { color: GREEN, label: 'â–² Bear-End Signal', isTriangle: true },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {l.isTriangle ? (
                  <span style={{ fontSize: 12, color: l.color, lineHeight: 1 }}>â–²</span>
                ) : (
                  <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: l.color, display: 'inline-block' }} />
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
