"use client";

import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { CycleDurationChart } from '@/components/cycle-duration/CycleDurationChart';
import { CycleSummaryCards } from '@/components/cycle-duration/CycleSummaryCards';
import { TimingValidationTable } from '@/components/cycle-duration/TimingValidationTable';
import { BottomConfirmationPanel } from '@/components/cycle-duration/BottomConfirmationPanel';
import { ScenarioAnchorPanel } from '@/components/cycle-duration/ScenarioAnchorPanel';
import { CycleDurationShareModal } from '@/components/share/CycleDurationShareModal';
import type { CycleDurationSharePayload } from '@/components/share/CycleDurationShareCard';
import { toTs, fmtDate, daysBetween, type CycleWindow, type CyclePhase } from '@/lib/cycles/durationModel';
import { detectConfirmedLow, applyAnchorOverride, type AnchorMode } from '@/lib/cycles/autoAnchor';
import type { ValidationRow } from '@/lib/cycles/timingValidation';
import type { ConfirmationSummary } from '@/lib/cycles/confirmationSignals';
import type { ConfidenceResult } from '@/lib/cycles/confidenceScore';

type PricePoint = { time: string; ts: number; price: number };

type ApiResponse = {
  prices: PricePoint[];
  currentPrice: number | null;
  cycles: CycleWindow[];
  validationRows: ValidationRow[];
  current: {
    cycleId: string;
    lowDate: string;
    lowDateFmt: string;
    lowPrice: number;
    daysSinceLow: number;
    phase: CyclePhase;
    projectedHighDate: string;
    projectedHighDateFmt: string;
    projectedLowDate: string;
    projectedLowDateFmt: string;
  };
  skyline: { score: number; zone: string; zoneLabel: string; zoneColor: string };
  confirmation: ConfirmationSummary;
  confidence: ConfidenceResult;
  generatedAt: string;
};

const PHASE_CONFIG: Record<CyclePhase, { label: string; color: string; border: string; regime: 'accumulate' | 'hold' | 'caution' | 'distribution' | 'neutral' }> = {
  expansion: { label: 'Expansion', color: '#35D07F', border: 'rgba(53,208,127,0.35)', regime: 'hold' },
  'peak-risk': { label: 'Peak Risk Window', color: '#E6B450', border: 'rgba(230,180,80,0.35)', regime: 'caution' },
  distribution: { label: 'Distribution / Bear', color: '#FF5C5C', border: 'rgba(255,92,92,0.35)', regime: 'distribution' },
  accumulation: { label: 'Bottom Formation', color: '#5B84FF', border: 'rgba(91,132,255,0.35)', regime: 'accumulate' },
  'beyond-model': { label: 'Beyond Model Range', color: '#6F7A86', border: 'rgba(111,122,134,0.35)', regime: 'neutral' },
};

type Range = '2Y' | '4Y' | '8Y' | 'All';
const RANGES: Range[] = ['2Y', '4Y', '8Y', 'All'];
const RANGE_MS: Record<Range, number> = {
  '2Y': 2 * 365.25 * 86_400_000,
  '4Y': 4 * 365.25 * 86_400_000,
  '8Y': 8 * 365.25 * 86_400_000,
  'All': Infinity,
};

function fmt(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function CycleDurationPage() {
  const [logScale, setLogScale] = useState(true);
  const [range, setRange] = useState<Range>('All');
  const [anchorMode, setAnchorMode] = useState<AnchorMode>('fixed');
  const [manualDate, setManualDate] = useState('');

  const { data, loading } = useApiData<ApiResponse>('/api/cycle-duration');

  const filteredPrices = useMemo(() => {
    if (!data?.prices.length) return [];
    const ms = RANGE_MS[range];
    if (ms === Infinity) return data.prices;
    const cutoff = Date.now() - ms;
    return data.prices.filter((p) => p.ts >= cutoff);
  }, [data?.prices, range]);

  const currentCycle = data?.cycles.find((c) => c.status === 'in-progress') ?? null;

  const confirmedLow = useMemo(() => {
    if (!data?.prices.length || !currentCycle) {
      return { confirmed: false, date: null, price: null, ruleDetail: 'Loading…' };
    }
    return detectConfirmedLow(data.prices, currentCycle.projectedHighDate);
  }, [data?.prices, currentCycle]);

  const effectiveCycles = useMemo(() => {
    if (!data?.cycles) return [];
    return applyAnchorOverride(data.cycles, anchorMode, confirmedLow, manualDate);
  }, [data?.cycles, anchorMode, confirmedLow, manualDate]);

  const nextCycle = effectiveCycles.find((c) => c.status === 'projected') ?? null;
  const phase = data ? PHASE_CONFIG[data.current.phase] : null;

  const daysToModeledLow = useMemo(() => {
    if (!currentCycle) return null;
    const today = new Date().toISOString().slice(0, 10);
    return daysBetween(today, currentCycle.projectedLowDate);
  }, [currentCycle]);

  const sharePayload: CycleDurationSharePayload | null = (data && phase && nextCycle) ? {
    phaseLabel: phase.label,
    phaseColor: phase.color,
    modeledLowDateFmt: currentCycle ? fmtDate(currentCycle.projectedLowDate) : '—',
    bullWindowLabel: `${fmtDate(nextCycle.lowDate)} → ${fmtDate(nextCycle.projectedHighDate)}`,
    bullDays: nextCycle.bullDays,
    skylineScore: data.skyline.score,
    skylineZoneLabel: data.skyline.zoneLabel,
    points: data.prices.filter((_, i, arr) => i % 7 === 0 || i === arr.length - 1).map((p) => ({ ts: p.ts, price: p.price })),
    boxes: effectiveCycles.flatMap((c) => {
      const confirmed = c.status === 'completed';
      return [
        {
          id: `${c.id}-bull`, kind: 'bull' as const, confirmed,
          x1: toTs(c.lowDate), x2: toTs(c.confirmedHighDate ?? c.projectedHighDate),
          y1: confirmed ? c.lowPrice ?? undefined : undefined,
          y2: confirmed ? c.confirmedHighPrice ?? undefined : undefined,
        },
        {
          id: `${c.id}-bear`, kind: 'bear' as const, confirmed,
          x1: toTs(c.confirmedHighDate ?? c.projectedHighDate), x2: toTs(c.nextConfirmedLowDate ?? c.projectedLowDate),
          y1: confirmed ? c.nextConfirmedLowPrice ?? undefined : undefined,
          y2: confirmed ? c.confirmedHighPrice ?? undefined : undefined,
        },
      ];
    }),
    generatedAt: new Date().toISOString(),
  } : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin 1,064 / 364 Cycle Model"
        subtitle="Historical bull and bear duration windows projected into the next Bitcoin cycle"
        regime={phase?.regime ?? 'neutral'}
      />

      {/* Current phase banner */}
      {data && phase && currentCycle && (
        <div
          className="rounded-xl border p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: phase.border, borderLeftWidth: '3px' }}
        >
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>Current Phase</p>
            <p className="text-sm font-mono font-semibold" style={{ color: phase.color }}>{phase.label}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>Day {fmt(data.current.daysSinceLow)} since {data.current.lowDateFmt}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>Model Bottom Date</p>
            <p className="text-sm font-mono font-semibold" style={{ color: '#5B84FF' }}>{currentCycle ? fmtDate(currentCycle.projectedLowDate) : '—'}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>End of current 364-day bear window</p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>Model Peak Date</p>
            <p className="text-sm font-mono font-semibold" style={{ color: '#E6B450' }}>{nextCycle ? fmtDate(nextCycle.projectedHighDate) : '—'}</p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>End of next 1,064-day bull window</p>
          </div>
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>Days To Next Phase</p>
            <p className="text-sm font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
              {daysToModeledLow != null ? (daysToModeledLow >= 0 ? `${fmt(daysToModeledLow)}d` : 'Model window passed') : '—'}
            </p>
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              {daysToModeledLow != null && daysToModeledLow < 0 ? 'Awaiting confirmed low' : 'Until modeled bottom'}
            </p>
          </div>
        </div>
      )}

      <CycleSummaryCards
        currentPrice={data?.currentPrice ?? null}
        phase={data?.current.phase ?? 'expansion'}
        daysSinceLow={data?.current.daysSinceLow ?? 0}
        cycles={effectiveCycles}
        confidenceScore={data?.confidence.score ?? 0}
        confidenceLabel={data?.confidence.label ?? 'Low'}
      />

      {/* Main chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              BTC Price, Log Scale · Bull / Bear Duration Boxes
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {[
                { color: 'rgba(53,208,127,0.6)', label: 'Confirmed Bull (1,064d)' },
                { color: 'rgba(248,81,73,0.6)',  label: 'Confirmed Bear (364d)' },
                { color: 'rgba(53,208,127,0.3)', label: 'Projected / Timing-Only', dashed: true },
                { color: '#F7931A',              label: 'You Are Here' },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--sct-muted)' }}>
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: l.color, border: l.dashed ? `1px dashed ${l.color}` : undefined }} />
                  {l.label}
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
                borderColor: logScale ? '#A855F7' : 'var(--sct-border)',
                color: logScale ? '#A855F7' : 'var(--sct-muted)',
              }}
            >
              LOG
            </button>
            {sharePayload && <CycleDurationShareModal payload={sharePayload} />}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1 rounded text-xs font-mono border transition-all"
              style={{
                backgroundColor: range === r ? 'var(--sct-border)' : 'transparent',
                borderColor: 'var(--sct-border)',
                color: range === r ? 'var(--sct-text)' : 'var(--sct-muted)',
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
            <CycleDurationChart prices={filteredPrices} cycles={effectiveCycles} logScale={logScale} />
          )}
        </div>
      </div>

      {/* Validation + confirmation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {data ? <TimingValidationTable rows={data.validationRows} /> : null}
        {data ? <BottomConfirmationPanel confirmation={data.confirmation} /> : null}
      </div>

      {/* Scenario framework + anchor mode */}
      {currentCycle && (
        <ScenarioAnchorPanel
          anchorMode={anchorMode}
          onAnchorModeChange={setAnchorMode}
          manualDate={manualDate}
          onManualDateChange={setManualDate}
          confirmedLow={confirmedLow}
          modeledLowDateFmt={fmtDate(currentCycle.projectedLowDate)}
        />
      )}

      {/* Honest framing */}
      <div
        className="rounded-xl border p-5 space-y-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          How To Read This Model
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          <div className="space-y-2">
            <p>
              The 1,064-day expansion and 364-day contraction windows have aligned closely with the two completed
              Bitcoin cycles on record. With only two data points, that fit is encouraging but not proof — the
              standard deviation on two samples is wide, and any single future cycle can deviate materially.
            </p>
            <p>
              The next modeled expansion window begins around {currentCycle ? fmtDate(currentCycle.projectedLowDate) : '—'} and
              extends into {nextCycle ? fmtDate(nextCycle.projectedHighDate) : '—'}. This is a timing hypothesis,
              not a guaranteed buy or sell signal.
            </p>
          </div>
          <div className="space-y-2">
            <p>
              Use the model to identify a potential window, then confirm with price structure, on-chain conditions,
              and the Skyline Cycle Score — the Bottom Confirmation panel above tracks exactly that. Macro liquidity
              is not yet modeled in this v1 and is treated as neutral in the confidence score.
            </p>
            <p className="font-medium" style={{ color: 'var(--sct-secondary)' }}>
              Historical Cycle Timing Model · Not financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
