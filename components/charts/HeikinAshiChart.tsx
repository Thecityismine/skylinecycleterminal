"use client";

import { useState } from 'react';

export type HACandle = {
  month:            string;
  haOpen:           number;
  haClose:          number;
  haHigh:           number;
  haLow:            number;
  isGreen:          boolean;
  realClose:        number;
  isBearEndSignal:  boolean;
  redStreakBefore:  number;
  currentRedStreak: number;
  partial:          boolean;
};

// ─── Layout ────────────────────────────────────────────────────────────────
const CW   = 7;
const GAP  = 2;
const STEP = CW + GAP;
const PL   = 68;
const PR   = 20;
const PT   = 28;
const PB   = 44;
const CH   = 390;

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
  if (v >= 1_000) return `$${Math.round(v).toLocaleString('en-US')}`;
  if (v >= 1)     return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

export function HeikinAshiChart({ candles }: { candles: HACandle[] }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);

  if (!candles.length) return null;

  const allLows  = candles.map(c => c.haLow).filter(v => v > 0);
  const allHighs = candles.map(c => c.haHigh);
  const logMin   = Math.log10(Math.min(...allLows)  * 0.85);
  const logMax   = Math.log10(Math.max(...allHighs) * 1.15);

  const svgW = PL + candles.length * STEP + PR;
  const svgH = CH + PT + PB;

  function ly(v: number): number {
    return PT + CH * (1 - (Math.log10(Math.max(v, 0.001)) - logMin) / (logMax - logMin));
  }

  const visibleTicks = Y_TICKS.filter(t => {
    const lv = Math.log10(t);
    return lv >= logMin && lv <= logMax;
  });

  const xLabels: { year: string; x: number }[] = [];
  candles.forEach((c, i) => {
    if (c.month.slice(5) === '01') {
      xLabels.push({ year: c.month.slice(0, 4), x: PL + i * STEP + CW / 2 });
    }
  });

  const hov = hovIdx !== null ? candles[hovIdx] : null;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={svgW} height={svgH} style={{ display: 'block' }}>

        {/* Background */}
        <rect width={svgW} height={svgH} fill="#0C1117" />

        {/* Grid lines + Y labels */}
        {visibleTicks.map(t => {
          const y = ly(t);
          return (
            <g key={t}>
              <line x1={PL} y1={y} x2={svgW - PR} y2={y} stroke="#1E293B" strokeWidth={1} />
              <text x={PL - 5} y={y} textAnchor="end" fontSize={9} fill="#4B5563" dominantBaseline="middle" fontFamily="monospace">
                {fmtTick(t)}
              </text>
            </g>
          );
        })}

        {/* X axis year labels */}
        {xLabels.map(({ year, x }) => (
          <g key={year}>
            <line x1={x} y1={PT + CH} x2={x} y2={PT + CH + 4} stroke="#1E293B" />
            <text x={x} y={PT + CH + 16} textAnchor="middle" fontSize={9} fill="#374151" fontFamily="monospace">
              {year}
            </text>
          </g>
        ))}

        {/* Candles */}
        {candles.map((c, i) => {
          const cx      = PL + i * STEP + CW / 2;
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
              {/* Wick */}
              <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth={1} />
              {/* Body */}
              <rect
                x={PL + i * STEP}
                y={bodyTop}
                width={CW}
                height={bodyH}
                fill={color}
                opacity={hovIdx === i ? 1 : 0.88}
              />
              {/* Bear-end signal: green triangle above the candle */}
              {c.isBearEndSignal && (
                <polygon
                  points={`${cx},${yHigh - 14} ${cx - 5},${yHigh - 4} ${cx + 5},${yHigh - 4}`}
                  fill={GREEN}
                />
              )}
              {/* Invisible hit area for hover */}
              <rect
                x={PL + i * STEP - 1}
                y={PT}
                width={CW + 2}
                height={CH}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHovIdx(i)}
                onMouseLeave={() => setHovIdx(null)}
              />
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hov !== null && hovIdx !== null && (() => {
          const cx  = PL + hovIdx * STEP + CW / 2;
          const TW  = 162;
          const TH  = hov.isBearEndSignal ? 108 : 92;
          const TX  = cx > svgW * 0.62 ? cx - TW - 12 : cx + 12;
          const TY  = PT + 8;
          const col = hov.isGreen ? GREEN : RED;
          return (
            <g>
              {/* Crosshair */}
              <line x1={cx} y1={PT} x2={cx} y2={PT + CH} stroke="#ffffff" strokeWidth={0.5} strokeOpacity={0.12} />
              {/* Box */}
              <rect x={TX} y={TY} width={TW} height={TH} fill="#111827" stroke="#1E293B" rx={4} />
              <text x={TX + 8} y={TY + 14} fontSize={10} fill="#94A3B8" fontFamily="monospace" fontWeight="bold">
                {hov.month}{hov.partial ? ' (partial)' : ''}
              </text>
              <text x={TX + 8} y={TY + 29} fontSize={9} fill={col} fontFamily="monospace">
                HA O  {fmtPrice(hov.haOpen)}
              </text>
              <text x={TX + 8} y={TY + 41} fontSize={9} fill={col} fontFamily="monospace">
                HA C  {fmtPrice(hov.haClose)}
              </text>
              <text x={TX + 8} y={TY + 53} fontSize={9} fill="#6B7280" fontFamily="monospace">
                HA H  {fmtPrice(hov.haHigh)}
              </text>
              <text x={TX + 8} y={TY + 65} fontSize={9} fill="#6B7280" fontFamily="monospace">
                HA L  {fmtPrice(hov.haLow)}
              </text>
              <text x={TX + 8} y={TY + 79} fontSize={9} fill="#4B5563" fontFamily="monospace">
                Close {fmtPrice(hov.realClose)}
              </text>
              {hov.isBearEndSignal && (
                <text x={TX + 8} y={TY + 97} fontSize={9} fill={GREEN} fontFamily="monospace" fontWeight="bold">
                  ▲ BEAR-END SIGNAL (+{hov.redStreakBefore}m red)
                </text>
              )}
            </g>
          );
        })()}

      </svg>
    </div>
  );
}
