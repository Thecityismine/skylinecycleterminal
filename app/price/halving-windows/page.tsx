"use client";

import { useState, useMemo } from 'react';
import { ImageDown } from 'lucide-react';
import { useApiData } from '@/lib/hooks/useApiData';
import { BTCHalvingWindowsChart, fmtSignalDate } from '@/components/charts/BTCHalvingWindowsChart';
import { HalvingWindowsShareModal } from '@/components/share/HalvingWindowsShareModal';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { getCurrentWindowPhase } from '@/lib/indicators/halvingWindows';
import type { HalvingWindowData } from '@/lib/indicators/halvingWindows';

type PricePoint = { time: string; ts: number; price: number };

type ApiResponse = {
  points:  PricePoint[];
  windows: HalvingWindowData[];
};

const RANGES = [
  { label: '1 Cycle',  ms: 4 * 365 * 86400_000 },
  { label: '2 Cycles', ms: 8 * 365 * 86400_000 },
  { label: 'All',      ms: 0 },
] as const;

const CYAN = '#45F3FF';
const PINK = '#FF5CA8';

function fmtTablePrice(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtDays(ms: number): string {
  const d = Math.round(Math.abs(ms) / 86400_000);
  return `${d} days`;
}

function fmtShortDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export default function HalvingWindowsPage() {
  const [rangeIdx,       setRangeIdx]       = useState(2);
  const [logScale,       setLog]            = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const { data, loading } = useApiData<ApiResponse>('/api/price/halving-windows');

  const startTs = useMemo(() => {
    const range = RANGES[rangeIdx];
    return range.ms === 0 ? 0 : Date.now() - range.ms;
  }, [rangeIdx]);

  const phase = useMemo(() => {
    if (!data?.windows) return { type: 'neutral' as const };
    return getCurrentWindowPhase(data.windows);
  }, [data]);

  // Current-cycle stats based on H4 (2024 halving)
  const h4 = data?.windows?.find((w) => w.year === 2024);
  const h5 = data?.windows?.find((w) => w.year === 2028);
  const now = Date.now();
  const daysSinceH4 = h4 ? Math.round((now - h4.halvingTs) / 86400_000) : null;
  const daysToH5    = h5 ? Math.round((h5.halvingTs - now) / 86400_000) : null;

  // Determine current status label + color
  const statusLabel =
    phase.type === 'accumulation'
      ? '500-Day Accumulation Window'
      : phase.type === 'derisk'
      ? '500-Day De-Risk Window'
      : 'Neutral — Between Windows';

  const statusColor =
    phase.type === 'accumulation'
      ? CYAN
      : phase.type === 'derisk'
      ? PINK
      : 'var(--sct-muted)';

  // Historical rows for the table
  const tableRows = (data?.windows ?? []).filter((w) => !w.projected);

  return (
    <>
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC Halving Cycle Windows"
        subtitle="500-day accumulation and de-risking windows around each Bitcoin halving"
      />

      {/* Status cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Current window status */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor:     statusColor,
            borderLeftWidth: '4px',
          }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Current Window Status
          </p>
          <p className="text-xl font-bold" style={{ color: statusColor }}>{statusLabel}</p>

          {phase.type === 'accumulation' && (
            <>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
                We are inside the 500-day pre-halving accumulation window for {phase.window.label}.
                Historically, this period has offered strong long-term risk-adjusted entries.
              </p>
              <div
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: CYAN + '18', color: CYAN }}
              >
                → Build position gradually. Prioritise accumulation on dips.
              </div>
            </>
          )}

          {phase.type === 'derisk' && (
            <>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
                We are inside the 500-day post-halving de-risk window for {phase.window.label}.
                Historically, major cycle highs have formed inside this window.
              </p>
              <div
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: PINK + '18', color: PINK }}
              >
                → Monitor for distribution signals. Manage upside risk.
              </div>
            </>
          )}

          {phase.type === 'neutral' && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              We are currently between defined windows. The next window opens when the
              H5 500-day accumulation period begins (approx. Dec 2026).
            </p>
          )}
        </div>

        {/* H4 / H5 stats */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Cycle Position
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>
                Days Since H4
              </p>
              <p className="text-2xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
                {daysSinceH4 !== null ? daysSinceH4 : '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>Apr 19, 2024</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>
                Days to H5 (est.)
              </p>
              <p className="text-2xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
                {daysToH5 !== null ? daysToH5 : '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>Apr 20, 2028 (est.)</p>
            </div>
          </div>

          {/* H4 window summary */}
          {h4 && (
            <div
              className="rounded-lg border p-3 space-y-1"
              style={{ borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-panel)' }}
            >
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
                H4 De-Risk Window
              </p>
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                {fmtShortDate(h4.halvingDate)} → {fmtDays(h4.deriskEndTs - h4.halvingTs)} window
                {now > h4.deriskEndTs ? ' (completed)' : ' (active)'}
              </p>
              {h4.deriskPoint && (
                <p className="text-xs font-semibold" style={{ color: PINK }}>
                  Peak so far: ${h4.deriskPoint.price.toLocaleString()} ({fmtShortDate(h4.deriskPoint.time)})
                </p>
              )}
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
              BTC Price · Halving Cycle Windows · Log Scale
            </p>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 items-center">
              <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: CYAN, boxShadow: `0 0 5px ${CYAN}` }}
                />
                Accumulation Signal
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: PINK, boxShadow: `0 0 5px ${PINK}` }}
                />
                De-Risk Signal
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
                <span
                  className="w-4 h-2.5 rounded-sm inline-block shrink-0"
                  style={{ backgroundColor: 'rgba(69,243,255,0.18)', border: '1px solid rgba(69,243,255,0.3)' }}
                />
                500-Day Accum. Window
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--sct-muted)' }}>
                <span
                  className="w-4 h-2.5 rounded-sm inline-block shrink-0"
                  style={{ backgroundColor: 'rgba(255,92,168,0.18)', border: '1px solid rgba(255,92,168,0.3)' }}
                />
                500-Day De-Risk Window
              </span>
              <span className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <span className="w-4 h-px border-t inline-block shrink-0" style={{ borderColor: 'rgba(255,255,255,0.5)' }} />
                Halving
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setRangeIdx(i)}
                  className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: rangeIdx === i ? 'var(--sct-secondary)' : 'transparent',
                    borderColor:     rangeIdx === i ? 'var(--sct-secondary)' : 'var(--sct-border)',
                    color:           rangeIdx === i ? '#000' : 'var(--sct-muted)',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLog((p) => !p)}
              className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
              style={{
                backgroundColor: logScale ? 'var(--sct-secondary)' : 'transparent',
                borderColor:     logScale ? 'var(--sct-secondary)' : 'var(--sct-border)',
                color:           logScale ? '#000' : 'var(--sct-muted)',
              }}
            >
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
            <BTCHalvingWindowsChart
              points={data.points}
              windows={data.windows}
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

      {/* Historical signal table */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          Historical Signal Windows
        </p>
        <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
          {/* Header */}
          <div
            className="grid gap-2 pb-2 text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--sct-muted)', gridTemplateColumns: '1fr 1.4fr 1fr 1.4fr 1fr' }}
          >
            <div>Halving</div>
            <div>Accum. Window</div>
            <div style={{ color: CYAN }}>Accum. Signal</div>
            <div style={{ color: PINK }}>De-Risk Signal</div>
            <div>Notes</div>
          </div>

          {tableRows.map((w) => {
            const isCurrentCycle = w.year === 2024;
            const deriskComplete = now > w.deriskEndTs;

            return (
              <div
                key={w.year}
                className="grid gap-2 py-2.5 items-center text-xs"
                style={{ borderColor: 'var(--sct-border)', gridTemplateColumns: '1fr 1.4fr 1fr 1.4fr 1fr' }}
              >
                <div
                  className="font-semibold"
                  style={{ color: isCurrentCycle ? '#F7931A' : 'var(--sct-text)' }}
                >
                  {w.label}
                </div>
                <div style={{ color: 'var(--sct-muted)' }}>
                  {fmtShortDate(new Date(w.accumulationStartTs).toISOString().slice(0, 10))}
                  {' → '}
                  {fmtShortDate(w.halvingDate)}
                </div>
                <div>
                  {w.accumulationPoint ? (
                    <span className="font-semibold" style={{ color: CYAN }}>
                      {fmtTablePrice(w.accumulationPoint.price)}
                      <br />
                      <span className="font-normal text-[10px]" style={{ color: 'var(--sct-muted)' }}>
                        {fmtSignalDate(w.accumulationPoint.time)}
                      </span>
                    </span>
                  ) : '—'}
                </div>
                <div>
                  {w.deriskPoint ? (
                    <span className="font-semibold" style={{ color: PINK }}>
                      {fmtTablePrice(w.deriskPoint.price)}
                      <br />
                      <span className="font-normal text-[10px]" style={{ color: 'var(--sct-muted)' }}>
                        {fmtSignalDate(w.deriskPoint.time)}
                      </span>
                    </span>
                  ) : '—'}
                </div>
                <div style={{ color: 'var(--sct-muted)' }}>
                  {isCurrentCycle
                    ? deriskComplete
                      ? 'Window closed'
                      : 'In progress'
                    : 'Completed'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Methodology */}
      <div className="grid md:grid-cols-2 gap-4">
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Methodology
          </p>
          <div className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            <p>Halving dates are fixed historical Bitcoin protocol events. The 2028 halving is a projected estimate based on block production rate.</p>
            <p>
              <span style={{ color: CYAN }}>Cyan windows</span> represent the 500 days before each halving.
              These periods have historically coincided with depressed prices relative to future cycle highs.
            </p>
            <p>
              <span style={{ color: PINK }}>Pink windows</span> represent the 500 days after each halving.
              Major cycle tops have historically formed inside this window.
            </p>
            <p>Signal dots mark the lowest (accumulation) and highest (de-risk) close price observed inside each window, computed from daily data.</p>
          </div>
        </div>

        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Important Context
          </p>
          <div className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            <p>The 500-day framework is an observational heuristic based on three completed cycles. It does not guarantee future performance on any fixed schedule.</p>
            <p>The accumulation signal does not mark the exact bottom. The de-risk signal does not mark the exact top. These are zone-based windows, not pinpoint predictions.</p>
            <p>Macro liquidity conditions, ETF inflows, leverage cycles, and regulatory events can shift timing significantly.</p>
            <p className="font-medium" style={{ color: 'var(--sct-secondary)' }}>
              Combine with MVRV, NUPL, and the Skyline Cycle Score before acting. This is one lens among many.
            </p>
          </div>
        </div>
      </div>
    </div>

    {showShareModal && data?.points.length && (
      <HalvingWindowsShareModal
        payload={{
          points:      data.points,
          windows:     data.windows,
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
