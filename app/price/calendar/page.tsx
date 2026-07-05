"use client";

import { useMemo, useState } from 'react';
import { ImageDown } from 'lucide-react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { AssetTabs } from '@/components/calendar/AssetTabs';
import type { CalendarAsset } from '@/components/calendar/AssetTabs';
import { CalendarSummaryPanel } from '@/components/calendar/CalendarSummaryPanel';
import { MonthlyReturnHeatmap } from '@/components/calendar/MonthlyReturnHeatmap';
import { CyclePhaseFilters } from '@/components/calendar/CyclePhaseFilters';
import { YearComparisonChart } from '@/components/calendar/YearComparisonChart';
import { FourYearCyclePanel } from '@/components/calendar/FourYearCyclePanel';
import { MonthOutlookPanel } from '@/components/calendar/MonthOutlookPanel';
import { CalendarShareModal } from '@/components/share/CalendarShareModal';
import { median } from '@/lib/indicators/seasonality';
import type { CyclePhase, MonthSummary } from '@/lib/indicators/seasonality';
import type { HeatmapRow } from '@/app/api/calendar/route';

type ApiResponse = {
  asset:             CalendarAsset;
  currentYear:       number;
  currentMonth:      number;
  currentCyclePhase: CyclePhase;
  nextCyclePhase:    CyclePhase;
  years:             number[];
  monthNames:        string[];
  heatmap:           HeatmapRow[];
  monthSummaries:    MonthSummary[];
  ytd:               { yearOpenPrice: number; currentPrice: number; ytdReturnPct: number } | null;
  latestPrice:       number;
  lastUpdated:       string;
};

const ASSET_LABEL: Record<CalendarAsset, string> = { btc: 'BTC', eth: 'ETH' };

function cumulativeThroughMonth(monthly: (number | null)[], monthCount: number): number | null {
  const slice = monthly.slice(0, monthCount);
  if (slice.length === 0 || slice.some((v) => v === null)) return null;
  return (slice.reduce((acc: number, r) => acc * (1 + (r as number) / 100), 1) - 1) * 100;
}

export default function CalendarPage() {
  const [asset, setAsset] = useState<CalendarAsset>('btc');
  const [useMedian, setUseMedian] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<CyclePhase | null>(null);
  const [showVolatility, setShowVolatility] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const { data, loading, error } = useApiData<ApiResponse>(`/api/calendar?asset=${asset}`);

  // Default the phase filter to the current cycle phase once data loads
  const effectivePhase = selectedPhase ?? data?.currentCyclePhase ?? null;

  const filteredRows = useMemo(() => {
    if (!data || !effectivePhase) return [];
    return data.heatmap.filter((r) => r.cyclePhase === effectivePhase);
  }, [data, effectivePhase]);

  const analog = useMemo(() => {
    if (!data) return null;
    const currentRow = data.heatmap.find((r) => r.year === data.currentYear);
    if (!currentRow) return null;
    const currentCum = cumulativeThroughMonth(currentRow.monthly, data.currentMonth);
    if (currentCum === null) return null;

    const peers = data.heatmap.filter((r) => r.cyclePhase === data.currentCyclePhase && r.year !== data.currentYear);
    const peerCums = peers
      .map((r) => ({ year: r.year, cum: cumulativeThroughMonth(r.monthly, data.currentMonth) }))
      .filter((p): p is { year: number; cum: number } => p.cum !== null);

    if (peerCums.length === 0) return { currentCum, closestYear: null, groupMedian: null, position: null as string | null };

    const closest = peerCums.reduce((best, p) =>
      Math.abs(p.cum - currentCum) < Math.abs(best.cum - currentCum) ? p : best
    );
    const groupMedian = median(peerCums.map((p) => p.cum));
    const diff = currentCum - groupMedian;
    const position = Math.abs(diff) < 5 ? 'Near historical median' : diff > 0 ? 'Above historical median' : 'Below historical median';

    return { currentCum, closestYear: closest.year, groupMedian, position };
  }, [data]);

  const currentMonthSummary = data?.monthSummaries[data.currentMonth - 1] ?? null;

  return (
    <>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <PageHeader
          title="Skyline Crypto Calendar"
          subtitle="Historical monthly performance by asset, cycle phase, and market regime"
        />

        {/* Asset tabs + share */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AssetTabs active={asset} onChange={setAsset} />
          <button
            onClick={() => setShowShareModal(true)}
            disabled={!data}
            className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
            style={{
              backgroundColor: 'transparent',
              borderColor:     'var(--sct-border)',
              color:           'var(--sct-muted)',
              opacity:         !data ? 0.4 : 1,
              cursor:          !data ? 'not-allowed' : 'pointer',
            }}
          >
            <ImageDown size={13} />
            Share Card
          </button>
        </div>

        {error && (
          <div className="rounded-xl border p-5 text-sm" style={{ borderColor: 'var(--sct-red)', color: 'var(--sct-red)', backgroundColor: 'var(--sct-card)' }}>
            Unable to load calendar data — {error}
          </div>
        )}

        {loading && !data && (
          <div className="rounded-xl border p-8 text-center text-sm" style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)', backgroundColor: 'var(--sct-card)' }}>
            Loading {ASSET_LABEL[asset]} seasonality data…
          </div>
        )}

        {data && currentMonthSummary && (
          <>
            {/* Summary cards + historical read */}
            <CalendarSummaryPanel
              assetLabel={ASSET_LABEL[asset]}
              monthSummary={currentMonthSummary}
              currentPhase={data.currentCyclePhase}
              useMedian={useMedian}
            />

            {/* Heatmap card */}
            <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
                    {ASSET_LABEL[asset]} Monthly Returns Heatmap, {data.years[0]}–{data.currentYear}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                    Close-to-close monthly return · dot color marks each year&apos;s cycle phase
                  </p>
                </div>
                <div className="flex gap-1">
                  {(['Median', 'Average'] as const).map((label) => {
                    const isActive = (label === 'Median') === useMedian;
                    return (
                      <button
                        key={label}
                        onClick={() => setUseMedian(label === 'Median')}
                        className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
                        style={{
                          backgroundColor: isActive ? 'var(--sct-border)' : 'transparent',
                          borderColor:     'var(--sct-border)',
                          color:           isActive ? 'var(--sct-text)' : 'var(--sct-muted)',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <MonthlyReturnHeatmap
                heatmap={data.heatmap}
                monthSummaries={data.monthSummaries}
                useMedian={useMedian}
                currentYear={data.currentYear}
                currentMonth={data.currentMonth}
              />
            </div>

            {/* Year-over-year comparison */}
            <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
                  Year-over-Year Comparison
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                  Compare {ASSET_LABEL[asset]} months across years that share a cycle phase
                </p>
              </div>
              <CyclePhaseFilters
                selected={effectivePhase}
                onSelect={setSelectedPhase}
                showVolatility={showVolatility}
                onToggleVolatility={() => setShowVolatility((v) => !v)}
              />
              <YearComparisonChart
                rows={filteredRows}
                currentYear={data.currentYear}
                showVolatility={showVolatility}
              />
            </div>

            {/* Current-year vs cycle-phase history */}
            {analog && (
              <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
                  Current Year vs {data.currentCyclePhase[0].toUpperCase() + data.currentCyclePhase.slice(1)}-Year History
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p style={{ color: 'var(--sct-muted)' }}>Current Year</p>
                    <p className="font-mono font-semibold text-sm" style={{ color: 'var(--sct-text)' }}>{data.currentYear}</p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--sct-muted)' }}>YTD Return (through current month)</p>
                    <p className="font-mono font-semibold text-sm" style={{ color: analog.currentCum >= 0 ? 'var(--sct-green)' : 'var(--sct-red)' }}>
                      {analog.currentCum >= 0 ? '+' : ''}{analog.currentCum.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--sct-muted)' }}>Closest Historical Analog</p>
                    <p className="font-mono font-semibold text-sm" style={{ color: 'var(--sct-text)' }}>
                      {analog.closestYear ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: 'var(--sct-muted)' }}>Current Year Position</p>
                    <p className="font-mono font-semibold text-sm" style={{ color: 'var(--sct-secondary)' }}>
                      {analog.position ?? 'Insufficient sample'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Four-year cycle explainer + Month outlook */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <FourYearCyclePanel currentPhase={data.currentCyclePhase} nextPhase={data.nextCyclePhase} />
              <MonthOutlookPanel
                assetLabel={ASSET_LABEL[asset]}
                monthSummary={currentMonthSummary}
                currentPhase={data.currentCyclePhase}
              />
            </div>
          </>
        )}
      </div>

      {showShareModal && data && currentMonthSummary && (
        <CalendarShareModal
          payload={{
            asset:            ASSET_LABEL[asset],
            monthName:        currentMonthSummary.monthName,
            medianReturn:     currentMonthSummary.medianReturn,
            medianVolatility: currentMonthSummary.medianVolatility,
            positiveYears:    currentMonthSummary.positiveYears,
            sampleSize:       currentMonthSummary.sampleSize,
            currentPhase:     data.currentCyclePhase,
            heatmap:          data.heatmap.slice(-6),
            generatedAt:      new Date().toISOString(),
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
