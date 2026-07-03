"use client";

import { ChartWatermark } from '@/components/charts/ChartWatermark';
import {
  PROJECTION_HALVINGS,
  MILESTONES,
  SCENARIO_META,
  SCENARIOS,
  Y_DOMAIN_MIN,
  Y_DOMAIN_MAX,
  type Scenario,
  type ProjectionPoint,
} from '@/lib/indicators/roadToOneMillion';

// ─── Layout ────────────────────────────────────────────────────────────────
const VW = 1400;
const VH = 560;
const PL = 68;
const PR = 130;
const PT = 36;
const PB = 44;
const CW = VW - PL - PR;
const CH = VH - PT - PB;

const LOG_MIN = Math.log10(Y_DOMAIN_MIN);
const LOG_MAX = Math.log10(Y_DOMAIN_MAX);

const DECADE_TICKS = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

function fmtDecade(v: number): string {
  if (v >= 1_000_000) return `$${v / 1_000_000}M`;
  if (v >= 1_000)     return `$${v / 1_000}K`;
  return `$${v}`;
}

function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 2)}M`;
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

type Props = {
  historical:       ProjectionPoint[];
  scenarios:        Record<Scenario, ProjectionPoint[]>;
  visibleScenarios: Set<Scenario>;
  showHalvings:     boolean;
  showMilestones:   boolean;
};

export function RoadToOneMillionChart({
  historical, scenarios, visibleScenarios, showHalvings, showMilestones,
}: Props) {
  if (!historical.length) return null;

  const xMin = historical[0].ts;
  const xMax = Math.max(
    ...SCENARIOS.flatMap((s) => scenarios[s]?.length ? [scenarios[s][scenarios[s].length - 1].ts] : []),
    historical[historical.length - 1].ts,
  );

  function xp(ts: number): number {
    return PL + ((ts - xMin) / (xMax - xMin)) * CW;
  }

  function yp(price: number): number {
    const clamped = Math.min(Y_DOMAIN_MAX, Math.max(Y_DOMAIN_MIN, price));
    const logP = Math.log10(clamped);
    return PT + CH * (1 - (logP - LOG_MIN) / (LOG_MAX - LOG_MIN));
  }

  function pathFor(points: ProjectionPoint[]): string {
    if (!points.length) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xp(p.ts).toFixed(1)},${yp(p.price).toFixed(1)}`)
      .join(' ');
  }

  const last  = historical[historical.length - 1];
  const nowX  = xp(last.ts);

  const startYear = new Date(xMin).getUTCFullYear();
  const endYear   = new Date(xMax).getUTCFullYear();
  const yearTicks: number[] = [];
  for (let y = Math.ceil(startYear / 2) * 2; y <= endYear; y += 2) yearTicks.push(y);

  const visibleHalvings = PROJECTION_HALVINGS.filter((h) => h.ts >= xMin && h.ts <= xMax);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full min-w-[900px]" style={{ display: 'block' }}>
          <defs>
            {SCENARIOS.map((s) => (
              <filter key={s} id={SCENARIO_META[s].glowId} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="s" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="m" />
                <feMerge>
                  <feMergeNode in="m" />
                  <feMergeNode in="s" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
            <filter id="r1m-glow-violet" x="-100%" y="-20%" width="300%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="s" />
              <feMerge>
                <feMergeNode in="s" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="r1m-glow-orange" x="-40%" y="-200%" width="180%" height="500%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="s" />
              <feMerge>
                <feMergeNode in="s" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="r1m-glow-here" x="-150%" y="-150%" width="400%" height="400%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="s" />
              <feMerge>
                <feMergeNode in="s" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background */}
          <rect width={VW} height={VH} fill="#070B14" rx={10} />
          <rect x={PL} y={PT} width={Math.max(0, nowX - PL)} height={CH} fill="#FFFFFF" fillOpacity={0.014} />

          {/* Decade gridlines + labels */}
          {DECADE_TICKS.map((v) => (
            <g key={v}>
              <line x1={PL} y1={yp(v)} x2={VW - PR} y2={yp(v)} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={1} />
              <text x={PL - 10} y={yp(v) + 3} textAnchor="end" fontSize={9.5} fill="#4B5563" fontFamily="monospace">
                {fmtDecade(v)}
              </text>
            </g>
          ))}

          {/* Year ticks */}
          {yearTicks.map((y) => {
            const x = xp(new Date(`${y}-01-01T00:00:00Z`).getTime());
            return (
              <g key={y}>
                <line x1={x} y1={PT} x2={x} y2={VH - PB} stroke="#FFFFFF" strokeOpacity={0.03} strokeWidth={1} />
                <text x={x} y={VH - PB + 16} textAnchor="middle" fontSize={9.5} fill="#374151" fontFamily="monospace">{y}</text>
              </g>
            );
          })}

          {/* Milestone lines */}
          {showMilestones && MILESTONES.map((m) => {
            const y = yp(m.price);
            return (
              <g key={m.label}>
                <line
                  x1={PL} y1={y} x2={VW - PR} y2={y}
                  stroke={m.emphasize ? '#F97316' : '#F5F7FA'}
                  strokeOpacity={m.emphasize ? 0.65 : 0.18}
                  strokeWidth={m.emphasize ? 1.8 : 1}
                  strokeDasharray={m.emphasize ? undefined : '4 5'}
                  filter={m.emphasize ? 'url(#r1m-glow-orange)' : undefined}
                />
                <text
                  x={VW - PR + 8} y={y + 3.5} fontSize={m.emphasize ? 11.5 : 10}
                  fontWeight={m.emphasize ? 'bold' : 'normal'}
                  fill={m.emphasize ? '#F97316' : '#8B949E'}
                  fontFamily="monospace"
                >
                  {m.label}
                </text>
              </g>
            );
          })}

          {/* Halving markers */}
          {showHalvings && visibleHalvings.map((h) => {
            const x = xp(h.ts);
            return (
              <g key={h.label}>
                <line
                  x1={x} y1={PT} x2={x} y2={VH - PB}
                  stroke="#A78BFA"
                  strokeOpacity={h.estimated ? 0.35 : 0.55}
                  strokeWidth={h.estimated ? 1.2 : 1.5}
                  strokeDasharray={h.estimated ? '5 4' : '2 3'}
                  filter={h.estimated ? undefined : 'url(#r1m-glow-violet)'}
                />
                <text
                  x={x} y={PT - 8} textAnchor="middle" fontSize={9.5} fontWeight="bold"
                  fill="#A78BFA" fillOpacity={h.estimated ? 0.65 : 0.95} fontFamily="monospace"
                >
                  {h.label.replace(' (est.)', '')}
                </text>
              </g>
            );
          })}

          {/* Historical price */}
          <path d={pathFor(historical)} fill="none" stroke="#F5F7FA" strokeWidth={2} strokeOpacity={0.92} />

          {/* Scenario projections */}
          {SCENARIOS.filter((s) => visibleScenarios.has(s)).map((s) => {
            const meta = SCENARIO_META[s];
            const points = scenarios[s];
            if (!points?.length) return null;
            const endPoint = points[points.length - 1];
            return (
              <g key={s}>
                <path
                  d={pathFor(points)}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={2.4}
                  strokeOpacity={0.95}
                  filter={`url(#${meta.glowId})`}
                />
                <circle cx={xp(endPoint.ts)} cy={yp(endPoint.price)} r={3.5} fill={meta.color} filter={`url(#${meta.glowId})`} />
                <text
                  x={xp(endPoint.ts) - 9}
                  y={yp(endPoint.price) - 8}
                  textAnchor="end"
                  fontSize={9.5}
                  fontWeight="bold"
                  fill={meta.color}
                  fontFamily="monospace"
                >
                  {meta.label} {fmtCompact(endPoint.price)}
                </text>
              </g>
            );
          })}

          {/* You Are Here marker */}
          <line x1={nowX} y1={PT} x2={nowX} y2={VH - PB} stroke="#E6B450" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 4" />
          <circle cx={nowX} cy={yp(last.price)} r={5} fill="#E6B450" filter="url(#r1m-glow-here)" />
          <circle cx={nowX} cy={yp(last.price)} r={2} fill="#FFF3D0" />
          <text x={nowX} y={yp(last.price) - 14} textAnchor="middle" fontSize={9} fontWeight="bold" letterSpacing="0.5"
            fill="#E6B450" fontFamily="monospace">
            YOU ARE HERE
          </text>
        </svg>
      </div>
      <ChartWatermark />
    </div>
  );
}
