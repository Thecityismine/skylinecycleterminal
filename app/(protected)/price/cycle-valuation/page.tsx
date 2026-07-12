"use client";

import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { ValuationDeviationChartSection } from '@/components/charts/ValuationDeviationChartSection';
import { ZONE_META, halvingColor } from '@/lib/indicators/valuationCycle';
import type { ValuationPoint, ValuationZone, CyclePosition } from '@/lib/indicators/valuationCycle';

type CurrentSnapshot = {
  time:                 string;
  close:                number;
  ma200:                number | null;
  priceToMa200:         number | null;
  deviation:            number | null;
  daysUntilNextHalving: number | null;
  zone:                 ValuationZone | null;
};

type ApiResponse = {
  points:  ValuationPoint[];
  cycle:   CyclePosition | null;
  current: CurrentSnapshot | null;
};

const ZONE_ORDER: ValuationZone[] = ['deep-value', 'value', 'neutral', 'extended', 'sell-risk'];

function fmtUSD(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
}

function fmtDate(iso: string): string {
  return new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export default function CycleValuationPage() {
  const { data, loading } = useApiData<ApiResponse>('/api/price/cycle-valuation');

  const current = data?.current ?? null;
  const cycle   = data?.cycle ?? null;
  const zone    = current?.zone ? ZONE_META[current.zone] : null;
  const dotColor = current ? halvingColor(current.daysUntilNextHalving) : 'var(--sct-muted)';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin Cycle Valuation Deviation"
        subtitle="Bitcoin price relative to its 200-day trend, colored by time remaining until the next halving"
      />

      {/* Status banner */}
      <div
        className="rounded-xl border px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: zone?.color ?? 'var(--sct-border)', borderLeftWidth: '4px' }}
      >
        <div className="space-y-0.5">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Current Read
          </p>
          <p className="text-xl font-bold" style={{ color: zone?.color ?? 'var(--sct-text)' }}>
            {loading ? 'Loading…' : zone?.label ?? 'No data'}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            {zone?.description ?? 'Insufficient data to compute the valuation signal.'}
          </p>
        </div>
        {current && (
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-mono font-semibold" style={{ backgroundColor: dotColor + '22', color: dotColor }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
            {current.daysUntilNextHalving ?? '—'} days to halving
          </div>
        )}
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="BTC Price"
          value={loading ? '…' : fmtUSD(current?.close)}
          sub="Latest daily close"
          accent="#F7931A"
          freshness="daily"
        />
        <StatCard
          label="200D Moving Average"
          value={loading ? '…' : fmtUSD(current?.ma200)}
          sub="Medium-term trend"
          accent="#5B84FF"
          freshness="daily"
        />
        <StatCard
          label="Price / 200D MA"
          value={loading ? '…' : current?.priceToMa200 != null ? `${current.priceToMa200.toFixed(2)}×` : '—'}
          sub={loading ? '' : fmtPct(current?.deviation) + ' deviation'}
          accent={zone?.color ?? 'var(--sct-text)'}
          freshness="daily"
        />
        <StatCard
          label="Days Until Halving"
          value={loading ? '…' : current?.daysUntilNextHalving != null ? String(current.daysUntilNextHalving) : '—'}
          sub={cycle ? `${cycle.nextHalvingLabel}${cycle.nextHalvingEstimated ? ' (est.)' : ''} · ${fmtDate(cycle.nextHalvingDate)}` : ''}
          accent={dotColor}
          freshness="daily"
        />
      </div>

      {/* Main chart */}
      <ValuationDeviationChartSection points={data?.points ?? []} />

      {/* Bottom row: cycle position + zone guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Cycle position */}
        <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Cycle Position
          </p>
          {cycle ? (
            <>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p style={{ color: 'var(--sct-muted)' }}>Last Halving</p>
                  <p className="font-mono font-semibold text-sm mt-0.5" style={{ color: 'var(--sct-text)' }}>{cycle.lastHalvingLabel}</p>
                  <p style={{ color: 'var(--sct-muted)' }}>{fmtDate(cycle.lastHalvingDate)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--sct-muted)' }}>Next Estimated Halving</p>
                  <p className="font-mono font-semibold text-sm mt-0.5" style={{ color: 'var(--sct-text)' }}>
                    {cycle.nextHalvingLabel}{cycle.nextHalvingEstimated ? ' (est.)' : ''}
                  </p>
                  <p style={{ color: 'var(--sct-muted)' }}>{fmtDate(cycle.nextHalvingDate)}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--sct-muted)' }}>Days Since Last Halving</p>
                  <p className="font-mono font-bold text-lg" style={{ color: '#5B84FF' }}>{cycle.daysSinceLastHalving}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--sct-muted)' }}>Days Until Next Halving</p>
                  <p className="font-mono font-bold text-lg" style={{ color: dotColor }}>{cycle.daysUntilNextHalving}</p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: 'var(--sct-muted)' }}>
                  <span>Cycle Progress</span>
                  <span>{cycle.cycleProgressPct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, cycle.cycleProgressPct).toFixed(1)}%`, backgroundColor: dotColor }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Loading cycle position…</p>
          )}
        </div>

        {/* Valuation zone guide */}
        <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Valuation Zones
          </p>
          <div className="space-y-2.5">
            {ZONE_ORDER.map((z) => {
              const meta = ZONE_META[z];
              const active = current?.zone === z;
              return (
                <div key={z} className="flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-sm mt-0.5 shrink-0" style={{ backgroundColor: meta.color + (active ? 'FF' : '55'), border: `1px solid ${meta.color}` }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: active ? meta.color : 'var(--sct-text)' }}>
                      {meta.label}{active ? ' — current' : ''}
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{meta.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interpretation + disclaimer */}
      <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          Valuation Read
        </p>
        <div className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          {current?.priceToMa200 != null && current.deviation != null ? (
            <p>
              Bitcoin is trading at <span className="font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>{current.priceToMa200.toFixed(2)}×</span> its
              200-day moving average — a deviation of <span className="font-mono font-semibold" style={{ color: zone?.color }}>{fmtPct(current.deviation)}</span>,
              placing BTC in the <span className="font-semibold" style={{ color: zone?.color }}>{zone?.label}</span>.
              This measures how stretched price is relative to its medium-term trend; it does not by itself mark an exact top or bottom.
            </p>
          ) : (
            <p>Loading current valuation read…</p>
          )}
          <p className="font-medium" style={{ color: 'var(--sct-secondary)' }}>
            The halving color is context, not a signal on its own — the moving-average deviation is the primary read. Combine with the Skyline Cycle Score, MVRV, and NUPL before acting.
          </p>
          <p>
            Zone thresholds are a starting model, not calibrated guarantees. Halving dates beyond H4 (Apr 19, 2024) are estimated from ~10-minute average block time and will shift as actual block production runs ahead of or behind schedule.
          </p>
        </div>
      </div>
    </div>
  );
}
