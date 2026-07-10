"use client";

import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { RoadToOneMillionChart } from '@/components/charts/RoadToOneMillionChart';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { HALVINGS, getCurrentPosition } from '@/lib/indicators/halvingCycles';
import {
  buildAllScenarios,
  SCENARIOS,
  SCENARIO_META,
  SCENARIO_TARGETS,
  estimateCrossingDate,
  fmtCrossingLabel,
  type Scenario,
} from '@/lib/indicators/roadToOneMillion';
import { RoadToOneMillionShareModal } from '@/components/share/RoadToOneMillionShareModal';

type PricePoint = { time: string; ts: number; price: number };
type ApiResponse = { points: PricePoint[] };

function fmtUSD(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function fmtCompactUSD(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

const h3Halving = HALVINGS.find((h) => h.number === 3)!;
const h4Halving = HALVINGS.find((h) => h.number === 4)!;

const ZOOM_OPTIONS = [
  { key: 'h3',  label: 'H3',  ts: h3Halving.ts },
  { key: 'h4',  label: 'H4',  ts: h4Halving.ts },
  { key: 'all', label: 'All', ts: null as number | null },
] as const;
type ZoomKey = (typeof ZOOM_OPTIONS)[number]['key'];

export default function RoadToOneMillionPage() {
  const { data, loading } = useApiData<ApiResponse>('/api/price/halving-cycles');

  const [visibleScenarios, setVisibleScenarios] = useState<Set<Scenario>>(new Set(SCENARIOS));
  const [showHalvings,     setShowHalvings]     = useState(true);
  const [showMilestones,   setShowMilestones]   = useState(true);
  const [zoom,              setZoom]            = useState<ZoomKey>('all');

  const pos = useMemo(() => getCurrentPosition(), []);

  const zoomTs = ZOOM_OPTIONS.find((z) => z.key === zoom)!.ts;

  const displayHistorical = useMemo(() => {
    if (!data?.points.length) return [];
    if (zoomTs == null) return data.points;
    const filtered = data.points.filter((p) => p.ts >= zoomTs);
    return filtered.length ? filtered : data.points;
  }, [data, zoomTs]);

  const scenarios = useMemo(() => {
    if (!data?.points.length) return null;
    const last = data.points[data.points.length - 1];
    return buildAllScenarios({ ts: last.ts, price: last.price });
  }, [data]);

  function toggleScenario(s: Scenario) {
    setVisibleScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  const lastPrice = data?.points.length ? data.points[data.points.length - 1].price : null;

  const h4 = HALVINGS.find((h) => h.number === 4)!;
  const h5 = HALVINGS.find((h) => h.number === 5)!;

  const roadStatus = (() => {
    const cycleWeeks = 208; // ~4-year halving cycle
    const pct = pos.weeksSinceH4 / cycleWeeks;
    if (pct < 0.25) return { label: 'Early Cycle', color: '#3B82F6' };
    if (pct < 0.75) return { label: 'Mid Cycle',   color: '#22C55E' };
    return { label: 'Late Cycle', color: '#E6B450' };
  })();

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Road to $1M — Bitcoin Halving Projection Model"
        subtitle="Historical halving cycles mapped forward into three illustrative scenarios — the roadmap for the next great wealth transfer"
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current BTC Price"
          value={lastPrice != null ? fmtUSD(lastPrice) : '—'}
          sub="Weekly close"
          accent="var(--sct-btc)"
          freshness="weekly"
        />
        <StatCard
          label="Current Cycle"
          value={`Post-${h4.date.slice(0, 4)} Halving`}
          sub={`${Math.round(pos.weeksSinceH4)} weeks since H4`}
          accent="var(--sct-text)"
        />
        <StatCard
          label="Next Halving"
          value={h5.label.replace(' (est.)', '')}
          sub={`~${Math.round(pos.weeksToH5)} weeks away · ${h5.date}`}
          accent="#A78BFA"
        />
        <StatCard
          label="Road Status"
          value={roadStatus.label}
          sub={pos.dominantPhase?.label ?? 'Between phases'}
          accent={roadStatus.color}
        />
      </div>

      {/* Chart card */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              BTC Price · Historical Cycles + Forward Scenario Map
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Log scale · {ZOOM_OPTIONS.find((z) => z.key === zoom)!.label} → 2034 · Base / Moderate / Optimistic paths through the 2028 &amp; 2032 halvings
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex gap-1">
              {ZOOM_OPTIONS.map((z) => (
                <button
                  key={z.key}
                  onClick={() => setZoom(z.key)}
                  className="px-2.5 py-1 rounded text-xs font-mono border transition-all duration-150"
                  style={{
                    backgroundColor: zoom === z.key ? 'var(--sct-secondary)' : 'transparent',
                    borderColor:     zoom === z.key ? 'var(--sct-secondary)' : 'var(--sct-border)',
                    color:           zoom === z.key ? '#000' : 'var(--sct-muted)',
                  }}
                >
                  {z.label}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 20, backgroundColor: 'var(--sct-border)' }} />

            {SCENARIOS.map((s) => {
              const meta = SCENARIO_META[s];
              const active = visibleScenarios.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleScenario(s)}
                  className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
                  style={{
                    backgroundColor: active ? meta.color + '20' : 'transparent',
                    borderColor:     active ? meta.color : 'var(--sct-border)',
                    color:           active ? meta.color : 'var(--sct-muted)',
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
            <button
              onClick={() => setShowHalvings((v) => !v)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: showHalvings ? '#A78BFA20' : 'transparent',
                borderColor:     showHalvings ? '#A78BFA' : 'var(--sct-border)',
                color:           showHalvings ? '#A78BFA' : 'var(--sct-muted)',
              }}
            >
              Halvings
            </button>
            <button
              onClick={() => setShowMilestones((v) => !v)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: showMilestones ? '#F9731620' : 'transparent',
                borderColor:     showMilestones ? '#F97316' : 'var(--sct-border)',
                color:           showMilestones ? '#F97316' : 'var(--sct-muted)',
              }}
            >
              Milestones
            </button>

            <div style={{ width: 1, height: 20, backgroundColor: 'var(--sct-border)' }} />

            <RoadToOneMillionShareModal
              disabled={!data?.points.length || !scenarios}
              payload={{
                historical:       displayHistorical,
                scenarios:        scenarios ?? { base: [], moderate: [], optimistic: [] },
                visibleScenarios,
                showHalvings,
                showMilestones,
                zoomLabel:        ZOOM_OPTIONS.find((z) => z.key === zoom)!.label,
                xMinOverride:     zoomTs ?? undefined,
                lastPrice,
                roadStatusLabel:  roadStatus.label,
                roadStatusColor:  roadStatus.color,
                generatedAt:      new Date().toISOString(),
              }}
            />
          </div>
        </div>

        <div style={{ height: 560 }}>
          {loading ? (
            <ChartSkeleton height="h-full" />
          ) : data?.points.length && scenarios ? (
            <RoadToOneMillionChart
              historical={displayHistorical}
              scenarios={scenarios}
              visibleScenarios={visibleScenarios}
              showHalvings={showHalvings}
              showMilestones={showMilestones}
              xMinOverride={zoomTs ?? undefined}
            />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Unable to load price data</p>
            </div>
          )}
        </div>
      </div>

      {/* Scenario summary table */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          Scenario Targets
        </p>
        <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
          <div className="grid grid-cols-4 gap-2 pb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
            <div>Cycle</div>
            {SCENARIOS.map((s) => (
              <div key={s} style={{ color: SCENARIO_META[s].color }}>{SCENARIO_META[s].label}</div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 py-2.5 text-xs font-mono" style={{ borderColor: 'var(--sct-border)' }}>
            <div style={{ color: 'var(--sct-muted)' }}>2028 Cycle Peak</div>
            {SCENARIOS.map((s) => (
              <div key={s} className="font-bold" style={{ color: SCENARIO_META[s].color }}>
                {fmtCompactUSD(SCENARIO_TARGETS[s].peak2028)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 py-2.5 text-xs font-mono" style={{ borderColor: 'var(--sct-border)' }}>
            <div style={{ color: 'var(--sct-muted)' }}>2032 Cycle Peak</div>
            {SCENARIOS.map((s) => (
              <div key={s} className="font-bold" style={{ color: SCENARIO_META[s].color }}>
                {fmtCompactUSD(SCENARIO_TARGETS[s].peak2032)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 py-2.5 text-xs font-mono" style={{ borderColor: 'var(--sct-border)' }}>
            <div style={{ color: 'var(--sct-muted)' }}>Time to $1M</div>
            {SCENARIOS.map((s) => (
              <div key={s} className="font-bold" style={{ color: SCENARIO_META[s].color }}>
                {scenarios ? fmtCrossingLabel(estimateCrossingDate(scenarios[s], 1_000_000)) : '—'}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Methodology */}
      <InsightPanel title="Methodology & Disclaimer">
        <InsightRow
          label="Halving Timing"
          value="Vertical markers use the real dates of BTC's first four halvings (2012, 2016, 2020, 2024) plus estimated future halvings in 2028 and 2032, spaced on the protocol's ~4-year block-reward schedule."
          stack
        />
        <InsightRow
          label="Cycle Peak / Trough Placement"
          value="Scenario peaks are placed ~14 months after each halving, matching the historical lag between H2/H3/H4 and their cycle tops. Pre-halving troughs sit ~65 weeks before the next halving, echoing the deep-accumulation timing seen in prior cycles."
          stack
        />
        <InsightRow
          label="Return Compression"
          value="Each future cycle's drawdown is modeled smaller than the last (~87% → 84% → 77% historically), continuing that compression forward rather than repeating early-cycle volatility."
          stack
        />
        <InsightRow
          label="Curve Shape"
          value="Paths are interpolated between the anchors above in log-price space using smoothstep easing, so cycles glide into and out of peaks and troughs rather than moving in straight lines."
          stack
        />
        <InsightRow
          label="Disclaimer"
          value="These are illustrative scenario anchors, not predictions or financial advice. Liquidity conditions, regulation, and adoption pace can all pull actual timing forward or push it back by years."
          valueColor="#E6B450"
          stack
        />
      </InsightPanel>
    </div>
  );
}
