"use client";

import { useState, useMemo } from 'react';
import { ImageDown } from 'lucide-react';
import { useApiData } from '@/lib/hooks/useApiData';
import { HalvingCycleChart } from '@/components/charts/HalvingCycleChart';
import { HalvingShareModal } from '@/components/share/HalvingShareModal';
import { PageHeader } from '@/components/dashboard/PageHeader';
import {
  HALVINGS, PHASES, computeHalvingZones, getCurrentPosition,
} from '@/lib/indicators/halvingCycles';

type PricePoint = { time: string; ts: number; price: number };
type ApiResponse = { points: PricePoint[] };

const RANGES = [
  { label: '1 Cycle', ms: 4 * 365 * 86400_000 },
  { label: '2 Cycles', ms: 8 * 365 * 86400_000 },
  { label: 'All',     ms: 0 },
] as const;

function fmtWeeks(w: number): string {
  const abs = Math.abs(w);
  if (abs < 4)  return `${Math.round(abs * 7)} days`;
  if (abs < 52) return `${Math.round(abs)} weeks`;
  return `${(abs / 52).toFixed(1)} years`;
}

function fmtDate(iso: string): string {
  return new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export default function HalvingCyclesPage() {
  const [rangeIdx,       setRangeIdx]       = useState(2);
  const [logScale,       setLog]            = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const { data, loading } = useApiData<ApiResponse>('/api/price/halving-cycles');
  const segments = useMemo(() => computeHalvingZones(), []);
  const pos      = useMemo(() => getCurrentPosition(), []);

  const startTs = useMemo(() => {
    const range = RANGES[rangeIdx];
    return range.ms === 0 ? 0 : Date.now() - range.ms;
  }, [rangeIdx]);

  const phase = pos.dominantPhase;

  // Historical table rows
  const historicalRows = HALVINGS.filter((h) => !h.estimated && h.weeksLow).map((h) => ({
    halving: h.label,
    date:    fmtDate(h.date),
    bearLow: h.bearLow ? fmtDate(h.bearLow) : '—',
    weeksLow: h.weeksLow ?? 0,
  }));

  return (
    <>
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Halving Accumulation Cycles"
        subtitle="Historically the best accumulation window is 52–80 weeks before the halving — not the final few months"
      />

      {/* Current position banner */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Where we are now */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor: phase?.color ?? 'var(--sct-border)',
            borderLeftWidth: '4px',
          }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Current Position
          </p>
          {phase ? (
            <>
              <p className="text-xl font-bold" style={{ color: phase.color }}>{phase.label}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{phase.description}</p>
              <div
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: phase.color + '18', color: phase.color }}
              >
                → {phase.posture}
              </div>
            </>
          ) : (
            <>
              <p className="text-xl font-bold" style={{ color: 'var(--sct-muted)' }}>
                Between Cycles
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
                Currently outside all defined H4 and H5 phase windows. The next defined phase begins when the H5 Deep Accumulation window opens.
              </p>
            </>
          )}
        </div>

        {/* Countdown to H5 */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            H5 Halving Countdown (est. Apr 20, 2028)
          </p>
          <p className="text-3xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
            {fmtWeeks(pos.weeksToH5)}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            {Math.round(pos.weeksToH5)} weeks away · {Math.round(pos.weeksSinceH4)} weeks since H4
          </p>

          {pos.nextTransitionDate && (
            <div
              className="rounded-lg border p-3 space-y-0.5"
              style={{ borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-panel)' }}
            >
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Next Phase</p>
              <p className="text-sm font-semibold" style={{ color: '#3B82F6' }}>{pos.nextTransitionLabel}</p>
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                ~{fmtWeeks(pos.weeksToNextTransition!)} · {fmtDate(pos.nextTransitionDate)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {/* Chart header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              BTC Price · Halving Accumulation Windows
            </p>
            {/* Phase legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {PHASES.map((p) => (
                <span key={p.key} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sct-muted)' }}>
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: p.color + '55', border: `1px solid ${p.color}` }} />
                  {p.shortLabel}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,200,50,0.8)' }}>
                <span className="w-5 h-px inline-block border-t-2 border-dashed" style={{ borderColor: 'rgba(255,200,50,0.6)' }} />
                Halving
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {RANGES.map((r, i) => (
                <button key={r.label} onClick={() => setRangeIdx(i)}
                  className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: rangeIdx === i ? 'var(--sct-secondary)' : 'transparent',
                    borderColor:     rangeIdx === i ? 'var(--sct-secondary)' : 'var(--sct-border)',
                    color:           rangeIdx === i ? '#000' : 'var(--sct-muted)',
                  }}>
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={() => setLog((p) => !p)}
              className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
              style={{
                backgroundColor: logScale ? 'var(--sct-secondary)' : 'transparent',
                borderColor:     logScale ? 'var(--sct-secondary)' : 'var(--sct-border)',
                color:           logScale ? '#000' : 'var(--sct-muted)',
              }}>
              Log
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              disabled={!data?.points.length}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all border"
              style={{
                backgroundColor: 'transparent',
                borderColor:     'var(--sct-border)',
                color:           'var(--sct-muted)',
                cursor:          !data?.points.length ? 'not-allowed' : 'pointer',
                opacity:         !data?.points.length ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!data?.points.length) return;
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#F7931A';
                (e.currentTarget as HTMLButtonElement).style.color = '#F7931A';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--sct-border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--sct-muted)';
              }}
            >
              <ImageDown size={12} />
              Share Card
            </button>
          </div>
        </div>

        <div style={{ height: 500 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading price data…</p>
            </div>
          ) : data?.points.length ? (
            <HalvingCycleChart
              points={data.points}
              segments={segments}
              logScale={logScale}
              startTs={startTs}
            />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">No data</p>
            </div>
          )}
        </div>
      </div>

      {/* Phase guide */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          Phase Guide
        </p>
        <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 pb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
            <div className="col-span-2">Window</div>
            <div className="col-span-3">Phase</div>
            <div className="col-span-3">Historical Tendency</div>
            <div className="col-span-4">Best Posture</div>
          </div>
          {[
            { window: '−80 to −52w', phase: PHASES[0] },
            { window: '−52 to −26w', phase: PHASES[1] },
            { window: '−26w to Halving', phase: PHASES[2] },
            { window: '0 to +12w', phase: PHASES[3] },
            { window: '+12 to +78w', phase: PHASES[4] },
          ].map(({ window, phase: p }) => (
            <div
              key={p.key}
              className="grid grid-cols-12 gap-2 py-2.5 items-start"
              style={{ borderColor: 'var(--sct-border)' }}
            >
              <div className="col-span-2 text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>{window}</div>
              <div className="col-span-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: p.color }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  {p.shortLabel}
                </span>
              </div>
              <div className="col-span-3 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{p.description.split('.')[0]}.</div>
              <div className="col-span-4 text-xs font-medium" style={{ color: p.color }}>{p.posture}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical context */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bear low timing */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Historical Bear-Low Timing
          </p>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
            <div className="grid grid-cols-3 gap-2 pb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
              <div>Halving</div>
              <div>Bear-Low Date</div>
              <div>Weeks Before</div>
            </div>
            {historicalRows.map((r) => (
              <div key={r.halving} className="grid grid-cols-3 gap-2 py-2.5 text-xs" style={{ borderColor: 'var(--sct-border)' }}>
                <div className="font-semibold" style={{ color: 'rgba(255,200,50,0.85)' }}>{r.halving}</div>
                <div style={{ color: 'var(--sct-muted)' }}>{r.bearLow}</div>
                <div className="font-mono font-bold" style={{ color: '#3B82F6' }}>~{r.weeksLow}w</div>
              </div>
            ))}
            <div className="pt-2.5 text-xs" style={{ color: 'var(--sct-muted)' }}>
              Average: ~{Math.round(historicalRows.reduce((s, r) => s + r.weeksLow, 0) / historicalRows.length)} weeks before halving
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Important Context
          </p>
          <div className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            <p>The halving is one recurring supply event. It does not guarantee price appreciation on any fixed schedule.</p>
            <p>Liquidity conditions, spot ETF inflows, macro rates, leverage levels, and sentiment can all pull timing forward or push it back by many months.</p>
            <p>The good buying window is usually when nobody cares — price feels broken, fear is elevated, and the market has not yet started pricing in the next halving narrative.</p>
            <p className="font-medium" style={{ color: 'var(--sct-secondary)' }}>
              Use these windows for risk framing, not prediction. Combine with MVRV, NUPL, and the Skyline Cycle Score before acting.
            </p>
          </div>
        </div>
      </div>
    </div>

    {showShareModal && data?.points.length && (
      <HalvingShareModal
        payload={{
          points:      data.points,
          segments,
          logScale,
          rangeLabel:  RANGES[rangeIdx].label,
          startTs,
          generatedAt: new Date().toISOString(),
        }}
        onClose={() => setShowShareModal(false)}
      />
    )}
    </>
  );
}
