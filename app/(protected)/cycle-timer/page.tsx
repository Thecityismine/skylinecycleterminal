"use client";

import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { BTCCycleDurationChart } from '@/components/charts/BTCCycleDurationChart';
import { CycleAlignmentChart } from '@/components/charts/CycleAlignmentChart';
import { CycleTimerShareModal } from '@/components/share/CycleTimerShareModal';
import type { CycleTimerSharePayload } from '@/components/share/CycleTimerShareCard';
import type {
  CycleAnchor,
  CompletedCycleStats,
  ValidationMetrics,
  ActiveCyclePosition,
} from '@/lib/indicators/cycleAnchors';
import { HALVINGS } from '@/lib/indicators/halvingCycles';

type PricePoint = { time: string; ts: number; price: number };

type ApiResponse = {
  prices:            PricePoint[];
  anchors:           CycleAnchor[];
  completedCycles:   CompletedCycleStats[];
  validationMetrics: ValidationMetrics;
  activeCycle:       ActiveCyclePosition;
};

const PHASE_CONFIG = {
  'expansion':    { label: 'Late Expansion',        color: '#35D07F', border: 'rgba(53,208,127,0.35)'  },
  'peak-risk':    { label: 'Peak Risk Window',      color: '#E6B450', border: 'rgba(230,180,80,0.35)'  },
  'distribution': { label: 'Distribution / Drawdown', color: '#FF5C5C', border: 'rgba(255,92,92,0.35)' },
  'accumulation': { label: 'Accumulation Window',   color: '#3B82F6', border: 'rgba(59,130,246,0.35)'  },
  'beyond-model': { label: 'Beyond Model Range',    color: '#6F7A86', border: 'rgba(111,122,134,0.35)' },
} as const;

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function signedDays(n: number): string {
  if (n === 0) return '0 days';
  return `${n > 0 ? '+' : ''}${fmt(n)} days`;
}

type Range = '4Y' | '8Y' | 'All';
const RANGES: Range[] = ['4Y', '8Y', 'All'];
const RANGE_MS: Record<Range, number> = { '4Y': 4 * 365.25 * 86_400_000, '8Y': 8 * 365.25 * 86_400_000, 'All': Infinity };

export default function CycleTimerPage() {
  const [logScale,     setLogScale]     = useState(true);
  const [timingModel,  setTimingModel]  = useState<'fixed' | 'median'>('fixed');
  const [range,        setRange]        = useState<Range>('All');

  const { data, loading } = useApiData<ApiResponse>('/api/cycle-timer');

  const rangeCutoffTs = useMemo(() => {
    const ms = RANGE_MS[range];
    return ms === Infinity ? -Infinity : Date.now() - ms;
  }, [range]);

  const filteredPrices = useMemo(() => {
    if (!data?.prices.length) return [];
    if (rangeCutoffTs === -Infinity) return data.prices;
    return data.prices.filter((p) => p.ts >= rangeCutoffTs);
  }, [data?.prices, rangeCutoffTs]);

  const activeCycle  = data?.activeCycle;
  const phase        = activeCycle ? PHASE_CONFIG[activeCycle.currentPhase] : null;
  const metrics      = data?.validationMetrics;
  const completed    = data?.completedCycles ?? [];

  // Which projected dates to display based on timing model toggle
  const projectedHigh = activeCycle
    ? (timingModel === 'fixed' ? activeCycle.projectedHighDateFmt : activeCycle.projectedHighDateMedianFmt)
    : '—';
  const projectedLow = activeCycle
    ? (timingModel === 'fixed' ? activeCycle.projectedLowDateFmt : activeCycle.projectedLowDateMedianFmt)
    : '—';

  const shareWeeklyPoints = useMemo(
    () => filteredPrices
      .filter((_, i, arr) => i % 7 === 0 || i === arr.length - 1)
      .map((p) => ({ ts: p.ts, price: p.price })),
    [filteredPrices],
  );

  const shareHalvings = useMemo(() => HALVINGS.map((h) => ({ ts: h.ts, label: h.label })), []);

  const shareCycleMarkers = useMemo(() => {
    const out: { ts: number; price: number; kind: 'low' | 'high' }[] = [];
    for (const a of data?.anchors ?? []) {
      const lowTs = new Date(a.lowDate + 'T00:00:00Z').getTime();
      if (lowTs >= rangeCutoffTs) out.push({ ts: lowTs, price: a.lowPrice, kind: 'low' });
      if (a.highDate && a.highPrice) {
        const highTs = new Date(a.highDate + 'T00:00:00Z').getTime();
        if (highTs >= rangeCutoffTs) out.push({ ts: highTs, price: a.highPrice, kind: 'high' });
      }
    }
    return out;
  }, [data?.anchors, rangeCutoffTs]);

  const sharePayload: CycleTimerSharePayload | null = (activeCycle && phase && metrics) ? {
    daysSinceLow:           activeCycle.daysSinceLow,
    lowDateFmt:             activeCycle.lowDateFmt,
    lowPrice:               activeCycle.lowPrice,
    phaseLabel:             phase.label,
    phaseColor:             phase.color,
    timingDeviation:        activeCycle.timingDeviation,
    medianLowToHigh:        metrics.lowToHigh.median,
    medianHighToLow:        metrics.highToLow.median,
    completedCycles:        metrics.completedCycles,
    peakWindowStartDate:    activeCycle.peakWindowStartDate,
    peakWindowEndDate:      activeCycle.peakWindowEndDate,
    bottomWindowStartDate:  activeCycle.bottomWindowStartDate,
    bottomWindowEndDate:    activeCycle.bottomWindowEndDate,
    projectedHighDate:      activeCycle.projectedHighDate,
    projectedLowDate:       activeCycle.projectedLowDate,
    timingModelLabel:       timingModel === 'fixed' ? 'Fixed 1,064 / 364' : 'Historical Median',
    points:                 shareWeeklyPoints,
    halvings:               shareHalvings,
    cycleMarkers:           shareCycleMarkers,
    generatedAt:            new Date().toISOString(),
  } : null;

  const completedWithCurrent = useMemo(() => {
    if (!activeCycle) return completed;
    return [
      ...completed,
      {
        cycleId:        activeCycle.cycleId,
        label:          activeCycle.label,
        lowDate:        activeCycle.lowDate,
        lowDateFmt:     activeCycle.lowDateFmt,
        lowPrice:       activeCycle.lowPrice,
        daysLowToHigh:  null,
        daysHighToLow:  null,
        daysTotal:      null,
        inProgress:     true,
        daysSinceLow:   activeCycle.daysSinceLow,
      } as any,
    ];
  }, [completed, activeCycle]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Cycle Duration Timer"
        subtitle="Historical low → high → low timing model · Observed pattern, not a forecast"
        regime={
          activeCycle?.currentPhase === 'expansion'    ? 'hold'
          : activeCycle?.currentPhase === 'peak-risk'  ? 'caution'
          : activeCycle?.currentPhase === 'distribution' ? 'distribution'
          : activeCycle?.currentPhase === 'accumulation' ? 'accumulate'
          : 'neutral'
        }
      />

      {/* Model toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>Timing Model</span>
        {(['fixed', 'median'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setTimingModel(m)}
            className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: timingModel === m ? 'var(--sct-border)' : 'transparent',
              borderColor:     'var(--sct-border)',
              color:           timingModel === m ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            {m === 'fixed' ? 'Fixed 1,064 / 364' : 'Historical Median'}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          label="Days Since Cycle Low"
          value={activeCycle ? fmt(activeCycle.daysSinceLow) : '—'}
          sub={activeCycle ? `Low: ${activeCycle.lowDateFmt}` : '—'}
          accent="var(--sct-text)"
          freshness="daily"
        />
        <StatCard
          label="Model Peak Window"
          value={`Day ${1000}–${1125}`}
          sub={activeCycle ? `${activeCycle.peakWindowStartDate} → ${activeCycle.peakWindowEndDate}` : '—'}
          accent="#E6B450"
          freshness="daily"
        />
        <StatCard
          label="Model Bottom Window"
          value={`Day ${1350}–${1500}`}
          sub={activeCycle ? `${activeCycle.bottomWindowStartDate} → ${activeCycle.bottomWindowEndDate}` : '—'}
          accent="#5B84FF"
          freshness="daily"
        />
        <StatCard
          label="Current Phase"
          value={phase?.label ?? '—'}
          sub={activeCycle ? signedDays(activeCycle.timingDeviation) + ' vs median' : '—'}
          accent={phase?.color ?? 'var(--sct-muted)'}
          freshness="daily"
        />
      </div>

      {/* Current cycle position panel */}
      {activeCycle && phase && (
        <div
          className="rounded-xl border p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: phase.border, borderLeftWidth: '3px' }}
        >
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
              Cycle Low
            </p>
            <p className="text-sm font-mono font-semibold" style={{ color: '#35D07F' }}>{activeCycle.lowDateFmt}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>${fmt(activeCycle.lowPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
              {timingModel === 'fixed' ? 'Fixed Model Peak (Day 1,064)' : 'Median Model Peak'}
            </p>
            <p className="text-sm font-mono font-semibold" style={{ color: '#E6B450' }}>{projectedHigh}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              {timingModel === 'fixed' ? `${1064} days` : `${metrics?.lowToHigh.median} days`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
              {timingModel === 'fixed' ? 'Fixed Model Bottom (Day 1,428)' : 'Median Model Bottom'}
            </p>
            <p className="text-sm font-mono font-semibold" style={{ color: '#5B84FF' }}>{projectedLow}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              {timingModel === 'fixed' ? `${1064 + 364} days` : `${(metrics?.lowToHigh.median ?? 0) + (metrics?.highToLow.median ?? 0)} days`}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
              Timing Deviation vs Median
            </p>
            <p
              className="text-sm font-mono font-semibold"
              style={{ color: Math.abs(activeCycle.timingDeviation) < 60 ? '#35D07F' : Math.abs(activeCycle.timingDeviation) < 150 ? '#E6B450' : '#FF5C5C' }}
            >
              {signedDays(activeCycle.timingDeviation)}
            </p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              vs {metrics?.lowToHigh.median}-day median
            </p>
          </div>
        </div>
      )}

      {/* Main BTC price chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              BTC Price · Cycle Low &amp; High Markers · Timing Windows
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {[
                { dot: true,  color: '#35D07F', label: 'Confirmed Cycle Low' },
                { dot: false, color: '#F7931A', label: 'Cycle High ▲' },
                { dot: true,  color: 'rgba(234,184,77,0.6)',  label: 'Peak Window (Day 1,000–1,125)' },
                { dot: true,  color: 'rgba(91,132,255,0.6)',  label: 'Bottom Window (Day 1,350–1,500)' },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--sct-muted)' }}>
                  {l.dot
                    ? <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: l.color }} />
                    : <span className="text-base leading-none" style={{ color: l.color }}>{l.label.slice(-1)}</span>
                  }
                  {l.dot ? l.label : l.label.slice(0, -2)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogScale((v) => !v)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{
                backgroundColor: logScale ? 'rgba(168,85,247,0.15)' : 'transparent',
                borderColor:     logScale ? '#A855F7' : 'var(--sct-border)',
                color:           logScale ? '#A855F7' : 'var(--sct-muted)',
              }}
            >
              LOG
            </button>
            {sharePayload && <CycleTimerShareModal payload={sharePayload} />}
          </div>
        </div>

        {/* Range tabs */}
        <div className="flex items-center gap-1.5 mb-4">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all"
              style={{
                backgroundColor: range === r ? 'var(--sct-border)' : 'transparent',
                borderColor:     'var(--sct-border)',
                color:           range === r ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {r}
            </button>
          ))}
        </div>

        <div style={{ height: 500 }}>
          {loading || !data ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading price data…</p>
            </div>
          ) : (
            <BTCCycleDurationChart
              prices={filteredPrices}
              anchors={data.anchors}
              activeCycle={data.activeCycle}
              logScale={logScale}
            />
          )}
        </div>
      </div>

      {/* Cycle alignment chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Cycle Alignment · Indexed Return from Cycle Low (100 = break-even)
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {[
                { color: 'rgba(139,148,158,0.6)',  label: '2015 Cycle' },
                { color: 'rgba(169,180,192,0.7)',  label: '2018 Cycle' },
                { color: '#E6B450',                label: 'Historical Median', dashed: true },
                { color: '#F5F7FA',                label: '2022 Cycle (Current)' },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--sct-muted)' }}>
                  <span
                    className="inline-block"
                    style={{
                      width: 18, height: 2,
                      backgroundColor: l.color,
                      borderTop: l.dashed ? `2px dashed ${l.color}` : undefined,
                      background: l.dashed ? 'none' : l.color,
                    }}
                  />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11px] font-mono italic" style={{ color: 'var(--sct-muted)', maxWidth: 260 }}>
            Tracks whether the current cycle is ahead of, at, or behind historical timing
          </p>
        </div>

        <div style={{ height: 400 }}>
          {loading || !data ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading…</p>
            </div>
          ) : (
            <CycleAlignmentChart
              prices={data.prices}
              anchors={data.anchors}
            />
          )}
        </div>
      </div>

      {/* Historical timing table + validation metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

        {/* Historical timing table */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Historical Timing Table
          </p>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
            <div className="grid grid-cols-5 gap-2 pb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
              <div className="col-span-2">Cycle</div>
              <div className="text-right">Low → High</div>
              <div className="text-right">High → Low</div>
              <div className="text-right">Total</div>
            </div>
            {completedWithCurrent.map((c: any) => (
              <div
                key={c.cycleId}
                className="grid grid-cols-5 gap-2 py-2.5 text-xs items-center"
                style={{ borderColor: 'var(--sct-border)' }}
              >
                <div className="col-span-2">
                  <p className="font-semibold" style={{ color: 'var(--sct-text)' }}>{c.label}</p>
                  <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>{c.lowDateFmt}</p>
                </div>
                <div className="text-right font-mono" style={{ color: '#E6B450' }}>
                  {c.daysLowToHigh != null ? `${fmt(c.daysLowToHigh)}d` : (
                    <span style={{ color: 'var(--sct-muted)' }}>
                      {c.inProgress ? `${fmt(c.daysSinceLow)}d↑` : '—'}
                    </span>
                  )}
                </div>
                <div className="text-right font-mono" style={{ color: '#5B84FF' }}>
                  {c.daysHighToLow != null ? `${fmt(c.daysHighToLow)}d` : (
                    <span style={{ color: 'var(--sct-muted)' }}>—</span>
                  )}
                </div>
                <div className="text-right font-mono" style={{ color: 'var(--sct-text)' }}>
                  {c.daysTotal != null ? `${fmt(c.daysTotal)}d` : (
                    <span style={{ color: 'var(--sct-muted)' }}>—</span>
                  )}
                </div>
              </div>
            ))}
            {/* Median row */}
            {metrics && (
              <div
                className="grid grid-cols-5 gap-2 pt-3 mt-1 text-xs items-center border-t-2"
                style={{ borderColor: 'var(--sct-border)' }}
              >
                <div className="col-span-2">
                  <p className="font-semibold" style={{ color: '#E6B450' }}>Historical Median</p>
                  <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>{metrics.completedCycles} completed cycles</p>
                </div>
                <div className="text-right font-mono font-bold" style={{ color: '#E6B450' }}>
                  {fmt(metrics.lowToHigh.median)}d
                </div>
                <div className="text-right font-mono font-bold" style={{ color: '#E6B450' }}>
                  {fmt(metrics.highToLow.median)}d
                </div>
                <div className="text-right font-mono font-bold" style={{ color: '#E6B450' }}>
                  {fmt(metrics.total.median)}d
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Model validation metrics */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Model Validation
          </p>
          {metrics ? (
            <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
              {[
                { label: 'Completed Cycles Tested',       value: `${metrics.completedCycles}`,                 note: 'statistically limited' },
                { label: 'Avg Low → High Duration',       value: `${fmt(metrics.lowToHigh.avg)} days`,         note: `± ${fmt(metrics.lowToHigh.stddev)} std dev` },
                { label: 'Median Low → High Duration',    value: `${fmt(metrics.lowToHigh.median)} days`,      note: `range: ${fmt(metrics.lowToHigh.min)}–${fmt(metrics.lowToHigh.max)}` },
                { label: 'Avg High → Low Duration',       value: `${fmt(metrics.highToLow.avg)} days`,         note: `± ${fmt(metrics.highToLow.stddev)} std dev` },
                { label: 'Median High → Low Duration',    value: `${fmt(metrics.highToLow.median)} days`,      note: `range: ${fmt(metrics.highToLow.min)}–${fmt(metrics.highToLow.max)}` },
                { label: 'Median Full Cycle (Low → Low)', value: `${fmt(metrics.total.median)} days`,          note: `≈ ${(metrics.total.median / 365).toFixed(1)} years` },
              ].map(({ label, value, note }) => (
                <div key={label} className="flex flex-col gap-0.5 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--sct-border)' }}>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>{label}</span>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>{value}</span>
                  </div>
                  {note && (
                    <p className="text-[11px]" style={{ color: 'var(--sct-muted)', opacity: 0.7 }}>{note}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <ChartSkeleton height="h-48" />
          )}
        </div>
      </div>

      {/* Scenario bands */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
          Timing Scenarios
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label:  'Base Case',
              color:  '#35D07F',
              desc:   'Cycle stays within historical median timing. Peak forms near day 1,065, bottom near day 1,435.',
            },
            {
              label:  'Early Cycle',
              color:  '#E6B450',
              desc:   'Peak forms before historical median (< day 1,000). Price may plateau early — watch for distribution signals.',
            },
            {
              label:  'Extended Cycle',
              color:  '#5B84FF',
              desc:   'Peak forms after historical median (> day 1,125). Cycle runs long — timing model becomes less reliable.',
            },
            {
              label:  'Structural Break',
              color:  '#FF5C5C',
              desc:   'Cycle timing does not match historical range. Requires re-anchoring. Do not force the 1,064-day model.',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border p-4 space-y-2"
              style={{ borderColor: s.color + '40', backgroundColor: s.color + '08' }}
            >
              <p className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Honest framing */}
      <div
        className="rounded-xl border p-5 space-y-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          How to Use This Model
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          <div className="space-y-2">
            <p>
              The 1,064-day and 364-day figures are the observed averages of two completed cycles — not a law of physics.
              With only two data points, the standard deviation is wide and any single cycle can deviate materially.
            </p>
            <p>
              The edge is not trusting these numbers blindly. The edge is tracking whether the current cycle is behaving
              inside or outside prior timing ranges, and adjusting conviction accordingly.
            </p>
          </div>
          <div className="space-y-2">
            <p>
              Use the timing model to identify when cycle risk may be increasing, then confirm with price structure,
              on-chain valuation (MVRV, NUPL), liquidity, and the Skyline Cycle Score.
            </p>
            <p className="font-medium" style={{ color: 'var(--sct-secondary)' }}>
              Historical Cycle Timing Model · Observed pattern, not a forecast · Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
