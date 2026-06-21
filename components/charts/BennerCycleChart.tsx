"use client";

import { ChartWatermark } from '@/components/charts/ChartWatermark';

// ─── Layout ────────────────────────────────────────────────────────────────
const START = 1920;
const END   = 2064;
const VW    = 1400;
const VH    = 420;
const PL    = 162;   // wide enough for two-line left labels
const PR    = 24;
const PT    = 58;
const PB    = 58;
const CW    = VW - PL - PR;
const CH    = VH - PT - PB;

const Y_A = PT + CH * 0.12;
const Y_B = PT + CH * 0.50;
const Y_C = PT + CH * 0.88;

function xp(year: number) {
  return PL + ((year - START) / (END - START)) * CW;
}

// ─── Cycle data ─────────────────────────────────────────────────────────────
const PANIC = [1927, 1945, 1965, 1981, 1999, 2019, 2035, 2053];

// SELL includes 1922 as the visual start-of-chart B anchor
const SELL_DOTS = [1922, 1926, 1933, 1942, 1951, 1962, 1972, 1980, 1989, 1999, 2007, 2014, 2026, 2034, 2043, 2053];
const BUY       = [1924, 1931, 1941, 1951, 1958, 1969, 1978, 1985, 1996, 2005, 2012, 2023, 2032, 2039, 2050, 2059, 2062];

// Upper arcs: [leftB, aPeak, rightB]
const UPPER_TRIS: [number, number, number][] = [
  [1926, 1927, 1933],
  [1933, 1945, 1951],
  [1962, 1965, 1972],
  [1980, 1981, 1989],
  [1989, 1999, 2007],
  [2014, 2019, 2026],
  [2034, 2035, 2043],
  [2043, 2053, 2053],
];

// Lower arcs: [leftB, cTrough, rightB] — computed from SELL_DOTS pairs + BUY between
const LOWER_TRIS: [number, number, number][] = [];
for (let i = 0; i < SELL_DOTS.length - 1; i++) {
  const b1 = SELL_DOTS[i], b2 = SELL_DOTS[i + 1];
  const c = BUY.find(y => y > b1 && y < b2);
  if (c) LOWER_TRIS.push([b1, c, b2]);
}

const DECADES = [1930,1940,1950,1960,1970,1980,1990,2000,2010,2020,2030,2040,2050,2060];

// ─── Bezier arc helpers ──────────────────────────────────────────────────────
// Creates a smooth cubic-bezier arc from (xB1,Y_B) → peak at (xMid,yPeak) → (xB2,Y_B)
function arcPath(b1: number, mid: number, b2: number, yPeak: number): string {
  const x1 = xp(b1), xm = xp(mid), x2 = xp(b2);
  const t = 0.44;
  const c1x = x1 + t * (xm - x1);
  const c2x = xm - t * (x2 - xm) * 0.6;
  const c3x = xm + t * (x2 - xm) * 0.6;
  const c4x = x2 - t * (x2 - xm);
  return [
    `M ${x1},${Y_B}`,
    `C ${c1x},${yPeak} ${c2x},${yPeak} ${xm},${yPeak}`,
    `C ${c3x},${yPeak} ${c4x},${Y_B} ${x2},${Y_B}`,
  ].join(' ');
}

// ─── Component ──────────────────────────────────────────────────────────────
export function BennerCycleChart() {
  const NOW = new Date().getFullYear();
  const nowX = xp(NOW);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full min-w-[900px]" style={{ display: 'block' }}>
          <defs>
            {/* Neon glow — red/orange (A panic) */}
            <filter id="bc-ga" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="s"/>
              <feGaussianBlur in="SourceGraphic" stdDeviation="7"   result="m"/>
              <feMerge>
                <feMergeNode in="m"/>
                <feMergeNode in="s"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Neon glow — blue (C buy) */}
            <filter id="bc-gc" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="s"/>
              <feGaussianBlur in="SourceGraphic" stdDeviation="7"   result="m"/>
              <feMerge>
                <feMergeNode in="m"/>
                <feMergeNode in="s"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            {/* Subtle glow — gold (B sell) */}
            <filter id="bc-gb" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="s"/>
              <feMerge>
                <feMergeNode in="s"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Radial halo gradients */}
            <radialGradient id="halo-a" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#FF3333" stopOpacity="0.40"/>
              <stop offset="55%"  stopColor="#FF3333" stopOpacity="0.13"/>
              <stop offset="100%" stopColor="#FF3333" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="halo-c" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#2563EB" stopOpacity="0.35"/>
              <stop offset="55%"  stopColor="#2563EB" stopOpacity="0.10"/>
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* ── Background ── */}
          <rect width={VW} height={VH} fill="#070D14" rx={10}/>

          {/* Past region — very subtle lighter wash */}
          <rect x={PL} y={PT} width={Math.max(0, nowX - PL)} height={CH} fill="#FFFFFF" fillOpacity={0.016}/>

          {/* ── Radial halos behind peaks & troughs ── */}
          {PANIC.map(y => (
            <ellipse key={`ha-${y}`} cx={xp(y)} cy={Y_A} rx={78} ry={62} fill="url(#halo-a)"/>
          ))}
          {BUY.map(y => (
            <ellipse key={`hc-${y}`} cx={xp(y)} cy={Y_C} rx={62} ry={50} fill="url(#halo-c)"/>
          ))}

          {/* ── Horizontal band guides — very faint ── */}
          <line x1={PL} y1={Y_A} x2={VW-PR} y2={Y_A} stroke="#FF4444" strokeOpacity={0.07} strokeWidth={1}/>
          <line x1={PL} y1={Y_C} x2={VW-PR} y2={Y_C} stroke="#3B82F6" strokeOpacity={0.07} strokeWidth={1}/>

          {/* ── B midline — glowing gold ── */}
          <line x1={PL} y1={Y_B} x2={VW-PR} y2={Y_B}
            stroke="#D4A017" strokeOpacity={0.55} strokeWidth={1.2}
            filter="url(#bc-gb)"/>

          {/* ── Left labels (two-line) ── */}
          <text x={PL-14} y={Y_A-9}  textAnchor="end" fontSize={10} fontWeight="bold" fill="#FF5C5C" fontFamily="monospace">A · PANIC</text>
          <text x={PL-14} y={Y_A+7}  textAnchor="end" fontSize={8}  fill="#FF5C5C"   fontFamily="monospace" fillOpacity={0.52}>Hard Times</text>

          <text x={PL-14} y={Y_B-9}  textAnchor="end" fontSize={10} fontWeight="bold" fill="#E6B450" fontFamily="monospace">B · SELL / PEAK</text>
          <text x={PL-14} y={Y_B+7}  textAnchor="end" fontSize={8}  fill="#E6B450"   fontFamily="monospace" fillOpacity={0.52}>Good Times</text>

          <text x={PL-14} y={Y_C-9}  textAnchor="end" fontSize={10} fontWeight="bold" fill="#3B82F6" fontFamily="monospace">C · BUY / BOTTOM</text>
          <text x={PL-14} y={Y_C+7}  textAnchor="end" fontSize={8}  fill="#3B82F6"   fontFamily="monospace" fillOpacity={0.52}>Accumulation</text>

          {/* ── UPPER ARCS — red neon ── */}
          {UPPER_TRIS.map(([lb, peak, rb], i) => {
            const past = peak <= NOW;
            return (
              <path
                key={`ua-${i}`}
                d={arcPath(lb, peak, rb, Y_A)}
                fill="none"
                stroke="#FF5050"
                strokeWidth={past ? 2.4 : 1.8}
                strokeDasharray={past ? undefined : '7 5'}
                strokeOpacity={past ? 1 : 0.6}
                filter={past ? 'url(#bc-ga)' : undefined}
              />
            );
          })}

          {/* ── LOWER ARCS — blue neon ── */}
          {LOWER_TRIS.map(([lb, trough, rb], i) => {
            const past = trough <= NOW;
            return (
              <path
                key={`la-${i}`}
                d={arcPath(lb, trough, rb, Y_C)}
                fill="none"
                stroke="#4B8EF5"
                strokeWidth={past ? 2.4 : 1.8}
                strokeDasharray={past ? undefined : '7 5'}
                strokeOpacity={past ? 1 : 0.6}
                filter={past ? 'url(#bc-gc)' : undefined}
              />
            );
          })}

          {/* ── NOW marker ── */}
          <line x1={nowX} y1={PT-6} x2={nowX} y2={VH-PB+6}
            stroke="#E6B450" strokeWidth={1.5} strokeDasharray="5 4" strokeOpacity={0.85}/>
          <text x={nowX} y={PT-20} textAnchor="middle" fontSize={8.5}
            fill="#E6B450" fontFamily="monospace" fontWeight="bold" letterSpacing="1.5">NOW</text>

          {/* ── Decade X-axis ── */}
          {DECADES.map(d => (
            <g key={d}>
              <line x1={xp(d)} y1={VH-PB} x2={xp(d)} y2={VH-PB+5} stroke="#1E293B" strokeWidth={1}/>
              <text x={xp(d)} y={VH-PB+18} textAnchor="middle" fontSize={9.5}
                fill="#374151" fontFamily="monospace">{d}</text>
            </g>
          ))}

          {/* ── PANIC dots (A) — red glow ── */}
          {PANIC.map(y => {
            const past = y <= NOW;
            const cx = xp(y);
            return (
              <g key={`a-${y}`} opacity={past ? 1 : 0.65}>
                <circle cx={cx} cy={Y_A} r={14} fill="none" stroke="#FF5050" strokeWidth={1} strokeOpacity={0.30} filter="url(#bc-ga)"/>
                <circle cx={cx} cy={Y_A} r={6}  fill="#FF4040" filter="url(#bc-ga)"/>
                <circle cx={cx} cy={Y_A} r={3}  fill="#FFB0B0"/>
                <text x={cx} y={Y_A-19} textAnchor="middle" fontSize={9} fill="#FF7070" fontFamily="monospace">{y}</text>
              </g>
            );
          })}

          {/* ── SELL dots (B) — gold glow ── */}
          {SELL_DOTS.map((y, idx) => {
            const past  = y <= NOW;
            const isNow = y === NOW;
            const cx    = xp(y);
            // alternate label above/below to reduce overlap
            const labelBelow = idx % 2 === 0;
            return (
              <g key={`b-${y}`} opacity={past ? 1 : 0.58}>
                {isNow && <circle cx={cx} cy={Y_B} r={15} fill="none" stroke="#E6B450" strokeWidth={1.5} strokeOpacity={0.55} filter="url(#bc-gb)"/>}
                <circle cx={cx} cy={Y_B} r={9}  fill="none" stroke="#D4A017" strokeWidth={1} strokeOpacity={past ? 0.40 : 0.22}/>
                <circle cx={cx} cy={Y_B} r={4.5} fill="#E6B450" filter={past ? 'url(#bc-gb)' : undefined}/>
                <circle cx={cx} cy={Y_B} r={2}   fill="#FFF0A0"/>
                <text
                  x={cx}
                  y={labelBelow ? Y_B + 18 : Y_B - 13}
                  textAnchor="middle"
                  fontSize={isNow ? 9.5 : 8.5}
                  fill={isNow ? '#E6B450' : '#C49A30'}
                  fontFamily="monospace"
                  fontWeight={isNow ? 'bold' : 'normal'}
                >{y}</text>
              </g>
            );
          })}

          {/* ── BUY dots (C) — blue glow ── */}
          {BUY.map(y => {
            const past = y <= NOW;
            const cx   = xp(y);
            return (
              <g key={`c-${y}`} opacity={past ? 1 : 0.62}>
                <circle cx={cx} cy={Y_C} r={14} fill="none" stroke="#4B8EF5" strokeWidth={1} strokeOpacity={0.32} filter="url(#bc-gc)"/>
                <circle cx={cx} cy={Y_C} r={6}  fill="#2563EB" filter="url(#bc-gc)"/>
                <circle cx={cx} cy={Y_C} r={2.5} fill="#A0C8FF"/>
                <text x={cx} y={Y_C+19} textAnchor="middle" fontSize={9} fill="#6BA4F8" fontFamily="monospace">{y}</text>
              </g>
            );
          })}

        </svg>
      </div>
      <ChartWatermark />
    </div>
  );
}
