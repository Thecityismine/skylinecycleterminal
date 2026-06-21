"use client";

import { ChartWatermark } from '@/components/charts/ChartWatermark';

// ─── Layout constants ──────────────────────────────────────────────────────
const START = 1920;
const END   = 2062;
const VW    = 1400;
const VH    = 340;
const PL    = 76;    // left padding for row labels
const PR    = 16;
const PT    = 36;
const PB    = 52;
const CW    = VW - PL - PR;
const CH    = VH - PT - PB;

const Y_A = PT + CH * 0.09;
const Y_B = PT + CH * 0.50;
const Y_C = PT + CH * 0.91;

function xp(year: number) {
  return PL + ((year - START) / (END - START)) * CW;
}

// ─── Cycle data ────────────────────────────────────────────────────────────
const PANIC = [1927, 1945, 1965, 1981, 1999, 2019, 2035, 2053];
const SELL  = [1926, 1935, 1945, 1953, 1962, 1972, 1980, 1989, 1999, 2007, 2016, 2026, 2034, 2043, 2053];
const BUY   = [1924, 1931, 1942, 1951, 1958, 1969, 1978, 1985, 1996, 2005, 2012, 2023, 2032, 2039, 2050, 2059];

// Each A year forms a triangle apex between two adjacent B years
const UPPER_TRIS: [number, number, number][] = [
  [1926, 1927, 1935],
  [1935, 1945, 1953],
  [1962, 1965, 1972],
  [1980, 1981, 1989],
  [1989, 1999, 2007],
  [2016, 2019, 2026],
  [2034, 2035, 2043],
  [2043, 2053, 2053],   // 2053 coincides A+B
];

// Lower zigzag: B and C years alternate chronologically
const LOWER: { year: number; band: 'B' | 'C' }[] = [
  { year: 1924, band: 'C' }, { year: 1926, band: 'B' },
  { year: 1931, band: 'C' }, { year: 1935, band: 'B' },
  { year: 1942, band: 'C' }, { year: 1945, band: 'B' },
  { year: 1951, band: 'C' }, { year: 1953, band: 'B' },
  { year: 1958, band: 'C' }, { year: 1962, band: 'B' },
  { year: 1969, band: 'C' }, { year: 1972, band: 'B' },
  { year: 1978, band: 'C' }, { year: 1980, band: 'B' },
  { year: 1985, band: 'C' }, { year: 1989, band: 'B' },
  { year: 1996, band: 'C' }, { year: 1999, band: 'B' },
  { year: 2005, band: 'C' }, { year: 2007, band: 'B' },
  { year: 2012, band: 'C' }, { year: 2016, band: 'B' },
  { year: 2023, band: 'C' }, { year: 2026, band: 'B' },
  { year: 2032, band: 'C' }, { year: 2034, band: 'B' },
  { year: 2039, band: 'C' }, { year: 2043, band: 'B' },
  { year: 2050, band: 'C' }, { year: 2053, band: 'B' },
  { year: 2059, band: 'C' },
];

const DECADES = [1930,1940,1950,1960,1970,1980,1990,2000,2010,2020,2030,2040,2050,2060];

// ─── Component ─────────────────────────────────────────────────────────────
export function BennerCycleChart() {
  const NOW = new Date().getFullYear();
  const nowX = xp(NOW);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full min-w-[900px]" style={{ display: 'block' }}>

        {/* Background */}
        <rect width={VW} height={VH} fill="#0C1117" rx={8} />

        {/* Past region subtle highlight */}
        <rect x={PL} y={PT} width={Math.max(0, nowX - PL)} height={CH} fill="#ffffff" fillOpacity={0.025} />

        {/* Horizontal band guide lines */}
        <line x1={PL} y1={Y_A} x2={VW - PR} y2={Y_A} stroke="#FF5C5C" strokeOpacity={0.12} />
        <line x1={PL} y1={Y_B} x2={VW - PR} y2={Y_B} stroke="#E6B450" strokeOpacity={0.14} />
        <line x1={PL} y1={Y_C} x2={VW - PR} y2={Y_C} stroke="#3B82F6" strokeOpacity={0.12} />

        {/* Row labels */}
        <text x={PL - 6} y={Y_A} textAnchor="end" fontSize={9} fill="#FF5C5C" dominantBaseline="middle" fontFamily="monospace">A · PANIC</text>
        <text x={PL - 6} y={Y_B} textAnchor="end" fontSize={9} fill="#E6B450" dominantBaseline="middle" fontFamily="monospace">B · SELL</text>
        <text x={PL - 6} y={Y_C} textAnchor="end" fontSize={9} fill="#3B82F6" dominantBaseline="middle" fontFamily="monospace">C · BUY</text>

        {/* ── Upper zigzag: B→A→B triangles ── */}
        {UPPER_TRIS.map(([lb, peak, rb], i) => (
          <g key={`ut-${i}`} opacity={peak <= NOW ? 1 : 0.55}>
            <line x1={xp(lb)} y1={Y_B} x2={xp(peak)} y2={Y_A} stroke="#FF5C5C" strokeWidth={1.2} />
            {rb !== peak && (
              <line x1={xp(peak)} y1={Y_A} x2={xp(rb)} y2={Y_B} stroke="#FF5C5C" strokeWidth={1.2} />
            )}
          </g>
        ))}

        {/* ── Lower zigzag: C↔B alternating ── */}
        {LOWER.slice(0, -1).map((pt, i) => {
          const next = LOWER[i + 1];
          const y1 = pt.band === 'C' ? Y_C : Y_B;
          const y2 = next.band === 'C' ? Y_C : Y_B;
          const past = pt.year <= NOW && next.year <= NOW;
          return (
            <line
              key={`lz-${i}`}
              x1={xp(pt.year)} y1={y1} x2={xp(next.year)} y2={y2}
              stroke="#3B82F6" strokeWidth={1.2} opacity={past ? 1 : 0.55}
            />
          );
        })}

        {/* ── NOW marker ── */}
        <line x1={nowX} y1={PT - 2} x2={nowX} y2={VH - PB} stroke="#F7931A" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={nowX} y={PT - 14} textAnchor="middle" fontSize={8} fill="#F7931A" fontFamily="monospace" fontWeight="bold">NOW</text>

        {/* ── Decade axis ticks ── */}
        {DECADES.map(d => (
          <g key={d}>
            <line x1={xp(d)} y1={VH - PB} x2={xp(d)} y2={VH - PB + 4} stroke="#1E293B" />
            <text x={xp(d)} y={VH - PB + 16} textAnchor="middle" fontSize={9} fill="#374151" fontFamily="monospace">{d}</text>
          </g>
        ))}

        {/* ── Panic year markers (A) ── */}
        {PANIC.map(y => {
          const past = y <= NOW;
          return (
            <g key={`a-${y}`} opacity={past ? 1 : 0.6}>
              <circle cx={xp(y)} cy={Y_A} r={5.5} fill="#FF5C5C" />
              <text x={xp(y)} y={Y_A - 13} textAnchor="middle" fontSize={9} fill="#FF5C5C" fontFamily="monospace">{y}</text>
            </g>
          );
        })}

        {/* ── Sell year markers (B) ── */}
        {SELL.map(y => {
          const past  = y <= NOW;
          const isNow = y === NOW;
          return (
            <g key={`b-${y}`} opacity={past ? 1 : 0.55}>
              {isNow && (
                <circle cx={xp(y)} cy={Y_B} r={10} fill="none" stroke="#E6B450" strokeWidth={1.5} strokeOpacity={0.5} />
              )}
              <circle cx={xp(y)} cy={Y_B} r={isNow ? 5 : 4} fill="#E6B450" />
              <text
                x={xp(y)} y={Y_B + 15}
                textAnchor="middle"
                fontSize={isNow ? 9 : 7.5}
                fill="#E6B450"
                fontFamily="monospace"
                fontWeight={isNow ? 'bold' : 'normal'}
              >{y}</text>
            </g>
          );
        })}

        {/* ── Buy year markers (C) ── */}
        {BUY.map(y => {
          const past = y <= NOW;
          return (
            <g key={`c-${y}`} opacity={past ? 1 : 0.6}>
              <circle cx={xp(y)} cy={Y_C} r={5.5} fill="#3B82F6" />
              <text x={xp(y)} y={Y_C + 15} textAnchor="middle" fontSize={9} fill="#3B82F6" fontFamily="monospace">{y}</text>
            </g>
          );
        })}

      </svg>
    </div>
    <ChartWatermark />
    </div>
  );
}
