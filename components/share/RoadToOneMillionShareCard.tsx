"use client";

import {
  PROJECTION_HALVINGS,
  MILESTONES,
  SCENARIO_META,
  SCENARIOS,
  Y_DOMAIN_MIN,
  Y_DOMAIN_MAX,
  estimateCrossingDate,
  fmtCrossingLabel,
  type Scenario,
  type ProjectionPoint,
} from '@/lib/indicators/roadToOneMillion';
import { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from '@/lib/share/exportShareCard';

export type RoadToOneMillionSharePayload = {
  historical:       ProjectionPoint[];
  scenarios:        Record<Scenario, ProjectionPoint[]>;
  visibleScenarios: Set<Scenario>;
  showHalvings:     boolean;
  showMilestones:   boolean;
  zoomLabel:        string;
  xMinOverride?:    number;
  lastPrice:        number | null;
  roadStatusLabel:  string;
  roadStatusColor:  string;
  generatedAt:      string;
  logoSrc?:         never;
};

const PAD       = 32;
const HEADER_H  = 70;
const STATS_H   = 52;
const GAP       = 10;
const STATS_GAP = 20;
const FOOTER_H  = 24;
const CHART_H   = SHARE_CARD_HEIGHT - PAD - HEADER_H - GAP - STATS_H - STATS_GAP - FOOTER_H - PAD;
const CHART_W   = SHARE_CARD_WIDTH - PAD * 2;

export const ROAD_TO_1M_CARD_CHART_RECT = {
  x: PAD, y: PAD + HEADER_H + GAP + STATS_H + STATS_GAP, w: CHART_W, h: CHART_H,
};

const LOG_MIN = Math.log10(Y_DOMAIN_MIN);
const LOG_MAX = Math.log10(Y_DOMAIN_MAX);

const DECADE_TICKS = [1, 100, 10_000, 1_000_000];

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

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

export function RoadToOneMillionShareCard({ payload }: { payload: RoadToOneMillionSharePayload }) {
  const {
    historical, scenarios, visibleScenarios, showHalvings, showMilestones,
    zoomLabel, xMinOverride, lastPrice, roadStatusLabel, roadStatusColor, generatedAt,
  } = payload;

  const dateStr = new Date(generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const hasData = historical.length > 0;

  const xMin = hasData
    ? (xMinOverride != null ? Math.min(xMinOverride, historical[0].ts) : historical[0].ts)
    : 0;
  const xMax = hasData
    ? Math.max(
        ...SCENARIOS.flatMap((s) => scenarios[s]?.length ? [scenarios[s][scenarios[s].length - 1].ts] : []),
        historical[historical.length - 1].ts,
      )
    : 1;

  function xp(ts: number): number {
    return ((ts - xMin) / (xMax - xMin)) * CHART_W;
  }

  function yp(price: number): number {
    const clamped = Math.min(Y_DOMAIN_MAX, Math.max(Y_DOMAIN_MIN, price));
    const logP = Math.log10(clamped);
    return CHART_H * (1 - (logP - LOG_MIN) / (LOG_MAX - LOG_MIN));
  }

  function pathFor(points: ProjectionPoint[]): string {
    if (!points.length) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xp(p.ts).toFixed(1)},${yp(p.price).toFixed(1)}`).join(' ');
  }

  const last = hasData ? historical[historical.length - 1] : null;
  const startYear = hasData ? new Date(xMin).getUTCFullYear() : 2012;
  const endYear   = hasData ? new Date(xMax).getUTCFullYear() : 2012;
  const yearTicks: number[] = [];
  for (let y = Math.ceil(startYear / 2) * 2; y <= endYear; y += 2) yearTicks.push(y);

  const visibleHalvings = hasData ? PROJECTION_HALVINGS.filter((h) => h.ts >= xMin && h.ts <= xMax) : [];

  const stats = SCENARIOS.map((s) => ({
    label: SCENARIO_META[s].label,
    color: SCENARIO_META[s].color,
    value: fmtCrossingLabel(estimateCrossingDate(scenarios[s] ?? [], 1_000_000)),
  }));

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
        height: HEADER_H, flex: `0 0 ${HEADER_H}px`,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#F7F9FC', margin: 0 }}>
            Road to $1M — Bitcoin Halving Projection
          </p>
          <p style={{ fontSize: 12, color: '#8B949E', margin: '4px 0 0' }}>
            Log scale · {zoomLabel} · Base / Moderate / Optimistic paths through future halvings
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#35D07F', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#35D07F', letterSpacing: '0.1em' }}>LIVE DATA</span>
          </div>
          <p style={{ fontSize: 11, color: '#8B949E', margin: '3px 0 4px' }}>{dateStr}</p>
          <span style={{
            padding: '2px 8px', borderRadius: 4,
            backgroundColor: roadStatusColor + '20',
            fontSize: 10, color: roadStatusColor,
          }}>
            {roadStatusLabel}
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        height: STATS_H, flex: `0 0 ${STATS_H}px`,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
        marginTop: GAP, marginBottom: STATS_GAP,
      }}>
        <div style={{
          backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8,
          padding: '4px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>Current Price</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#F7931A', margin: '3px 0 2px' }}>{fmtUSD(lastPrice)}</p>
          <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>Weekly close</p>
        </div>
        {stats.map((s) => (
          <div key={s.label} style={{
            backgroundColor: '#161B22', border: '1px solid #21262D', borderRadius: 8,
            padding: '4px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <p style={{ fontSize: 10, color: '#8B949E', margin: 0 }}>{s.label} · $1M ETA</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: s.color, margin: '3px 0 2px' }}>{s.value}</p>
            <p style={{ fontSize: 9, color: '#484F58', margin: 0 }}>Scenario crossing</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ width: CHART_W, height: CHART_H, flex: '0 0 auto', position: 'relative' }}>
        <svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
          {DECADE_TICKS.map((v) => (
            <g key={v}>
              <line x1={0} y1={yp(v)} x2={CHART_W} y2={yp(v)} stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={1} />
              <text x={-6} y={yp(v) + 3} textAnchor="end" fontSize={9.5} fill="#4B5563" fontFamily="monospace">
                {fmtDecade(v)}
              </text>
            </g>
          ))}

          {yearTicks.map((y) => {
            const x = xp(new Date(`${y}-01-01T00:00:00Z`).getTime());
            return (
              <g key={y}>
                <line x1={x} y1={0} x2={x} y2={CHART_H} stroke="#FFFFFF" strokeOpacity={0.03} strokeWidth={1} />
                <text x={x} y={CHART_H + 16} textAnchor="middle" fontSize={9.5} fill="#374151" fontFamily="monospace">{y}</text>
              </g>
            );
          })}

          {showMilestones && MILESTONES.map((m) => {
            const y = yp(m.price);
            return (
              <g key={m.label}>
                <line
                  x1={0} y1={y} x2={CHART_W} y2={y}
                  stroke={m.emphasize ? '#F97316' : '#F5F7FA'}
                  strokeOpacity={m.emphasize ? 0.65 : 0.18}
                  strokeWidth={m.emphasize ? 1.8 : 1}
                  strokeDasharray={m.emphasize ? undefined : '4 5'}
                />
                <text
                  x={CHART_W + 6} y={y + 3.5} fontSize={m.emphasize ? 11 : 9.5}
                  fontWeight={m.emphasize ? 'bold' : 'normal'}
                  fill={m.emphasize ? '#F97316' : '#8B949E'} fontFamily="monospace"
                >
                  {m.label}
                </text>
              </g>
            );
          })}

          {showHalvings && visibleHalvings.map((h) => {
            const x = xp(h.ts);
            return (
              <g key={h.label}>
                <line
                  x1={x} y1={0} x2={x} y2={CHART_H}
                  stroke="#A78BFA"
                  strokeOpacity={h.estimated ? 0.35 : 0.55}
                  strokeWidth={h.estimated ? 1.2 : 1.5}
                  strokeDasharray={h.estimated ? '5 4' : '2 3'}
                />
                <text
                  x={x} y={-8} textAnchor="middle" fontSize={9.5} fontWeight="bold"
                  fill="#A78BFA" fillOpacity={h.estimated ? 0.65 : 0.95} fontFamily="monospace"
                >
                  {h.label.replace(' (est.)', '')}
                </text>
              </g>
            );
          })}

          <path d={pathFor(historical)} fill="none" stroke="#F5F7FA" strokeWidth={2} strokeOpacity={0.92} />

          {SCENARIOS.filter((s) => visibleScenarios.has(s)).map((s) => {
            const meta = SCENARIO_META[s];
            const points = scenarios[s];
            if (!points?.length) return null;
            const endPoint = points[points.length - 1];
            return (
              <g key={s}>
                <path d={pathFor(points)} fill="none" stroke={meta.color} strokeWidth={2.4} strokeOpacity={0.95} />
                <circle cx={xp(endPoint.ts)} cy={yp(endPoint.price)} r={3.5} fill={meta.color} />
                <text
                  x={xp(endPoint.ts) - 9} y={yp(endPoint.price) - 8} textAnchor="end"
                  fontSize={9.5} fontWeight="bold" fill={meta.color} fontFamily="monospace"
                >
                  {meta.label} {fmtCompact(endPoint.price)}
                </text>
              </g>
            );
          })}

          {last && (
            <>
              <line x1={xp(last.ts)} y1={0} x2={xp(last.ts)} y2={CHART_H} stroke="#E6B450" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 4" />
              <circle cx={xp(last.ts)} cy={yp(last.price)} r={5} fill="#E6B450" />
              <circle cx={xp(last.ts)} cy={yp(last.price)} r={2} fill="#FFF3D0" />
            </>
          )}
        </svg>
      </div>

      {/* Footer */}
      <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {SCENARIOS.map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 16, height: 2, backgroundColor: SCENARIO_META[s].color, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ fontSize: 10, color: '#8B949E' }}>{SCENARIO_META[s].label}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 10, color: '#6B7280', letterSpacing: '0.06em' }}>
          Generated from Skyline Cycle Terminal · Illustrative scenarios, not financial advice
        </span>
      </div>
    </div>
  );
}
