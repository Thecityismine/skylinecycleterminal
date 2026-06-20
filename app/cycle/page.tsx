"use client";

import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { InsightPanel } from '@/components/dashboard/InsightPanel';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { ScoreHistoryChart } from '@/components/charts/ScoreHistoryChart';
import type { CycleScoreResult, ScoreZone } from '@/lib/indicators/skylineScore';
import type { HistoricalScorePoint } from '@/lib/indicators/historicalScore';

const ZONE_REGIME: Record<ScoreZone, 'accumulate' | 'hold' | 'caution' | 'distribution'> = {
  accumulate:   'accumulate',
  build:        'hold',
  caution:      'caution',
  distribution: 'distribution',
};

type HistoryResponse = { points: HistoricalScorePoint[] };

const BANDS = [
  { range: '0–25',   label: 'Accumulate',   color: '#3B82F6' },
  { range: '25–50',  label: 'Hold / Build',  color: '#35D07F' },
  { range: '50–75',  label: 'Caution',       color: '#E6B450' },
  { range: '75–100', label: 'Distribution',  color: '#FF5C5C' },
];

function scoreColor(score: number): string {
  if (score < 25) return '#3B82F6';
  if (score < 50) return '#35D07F';
  if (score < 75) return '#E6B450';
  return '#FF5C5C';
}

export default function CyclePage() {
  const { data: cycle, loading, error } = useApiData<CycleScoreResult>('/api/cycle');
  const { data: history }               = useApiData<HistoryResponse>('/api/cycle/history');

  const regime = cycle ? ZONE_REGIME[cycle.zone] : 'neutral';

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Skyline Cycle Score"
        subtitle="Composite 0–100 cycle position — 8 indicators equally weighted"
        regime={regime}
      />

      {/* Main gauge */}
      <div
        className="rounded-xl border p-10 flex flex-col items-center justify-center gap-5"
        style={{
          backgroundColor: 'var(--sct-card)',
          borderColor: cycle ? cycle.zoneColor + '40' : 'var(--sct-border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          transition: 'border-color 0.6s ease',
        }}
      >
        <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          Skyline Cycle Score
        </p>

        <div
          className="text-8xl font-mono font-bold transition-all duration-700"
          style={{ color: cycle ? cycle.zoneColor : 'var(--sct-muted)' }}
        >
          {loading ? '…' : error ? '!' : cycle?.score ?? '—'}
        </div>

        {cycle && (
          <p className="text-sm tracking-wider font-medium uppercase" style={{ color: cycle.zoneColor }}>
            SIGNAL: {cycle.zoneLabel}
          </p>
        )}

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: cycle ? `${cycle.score}%` : '0%',
                backgroundColor: cycle?.zoneColor ?? '#3B82F6',
              }}
            />
          </div>
          <div className="hidden sm:flex justify-between mt-2 text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
            <span style={{ color: '#3B82F6' }}>0 — Accumulate</span>
            <span style={{ color: '#35D07F' }}>25 — Build</span>
            <span style={{ color: '#E6B450' }}>50 — Caution</span>
            <span style={{ color: '#FF5C5C' }}>75 — Distribute</span>
            <span>100</span>
          </div>
        </div>

        {/* Band legend */}
        <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-6 mt-1">
          {BANDS.map((b) => (
            <div key={b.range} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
              <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
                {b.range} {b.label}
              </span>
            </div>
          ))}
        </div>

        {cycle && (
          <p className="text-xs mt-2" style={{ color: 'var(--sct-muted)' }}>
            Computed: {new Date(cycle.computedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Indicator breakdown + historical chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Breakdown panel */}
        <div
          className="lg:col-span-2 rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p
            className="text-xs font-medium tracking-wider uppercase mb-4"
            style={{ color: 'var(--sct-muted)' }}
          >
            Indicator Breakdown
          </p>
          <div className="space-y-4">
            {loading || !cycle
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-1.5">
                    <div className="h-3 rounded w-2/3" style={{ backgroundColor: 'var(--sct-border)' }} />
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--sct-border)' }} />
                  </div>
                ))
              : cycle.indicators.map((ind) => {
                  const color = scoreColor(ind.score);
                  return (
                    <div key={ind.name}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-xs font-medium" style={{ color: 'var(--sct-secondary)' }}>
                          {ind.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono" style={{ color }}>
                            {ind.signal}
                          </span>
                          <span className="text-xs font-mono font-bold" style={{ color }}>
                            {Math.round(ind.score)}
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${ind.score}%`, backgroundColor: color }}
                        />
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                        {ind.rawLabel} · {ind.source}
                      </p>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Historical score chart + methodology */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium tracking-wider uppercase mb-3" style={{ color: 'var(--sct-muted)' }}>
              Skyline Score History — Price-Based Proxy
            </p>
            <div
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--sct-border)', height: 256 }}
            >
              {!history?.points?.length
                ? <ChartSkeleton height="h-64" />
                : <ScoreHistoryChart points={history.points} />
              }
            </div>
            {/* Zone legend */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 mt-2">
              {[
                { color: '#3B82F6', label: '0–25 Accumulate' },
                { color: '#35D07F', label: '25–50 Hold / Build' },
                { color: '#E6B450', label: '50–75 Caution' },
                { color: '#FF5C5C', label: '75–100 Distribution' },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  <span className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>{b.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--sct-muted)' }}>
              Uses 4 price-derived indicators: Pi Cycle Top, 200DMA ratio, 2Y MA Multiplier, Power Law deviation. Dashed lines mark Bitcoin halvings.
            </p>
          </div>

          <InsightPanel title="Score Methodology">
            <p className="text-xs leading-relaxed">
              Eight indicators are each normalized to 0–100 based on their historical range.
              A higher score = higher cycle risk. A lower score = stronger accumulation conditions.
              All indicators are equally weighted (12.5% each) in v1.
            </p>
            <div className="mt-3 space-y-1.5">
              {cycle?.indicators.map((ind) => (
                <div key={ind.name} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--sct-muted)' }}>{ind.name}</span>
                  <span className="font-mono" style={{ color: scoreColor(ind.score) }}>
                    {ind.rawLabel}
                  </span>
                </div>
              ))}
            </div>
          </InsightPanel>
        </div>
      </div>
    </div>
  );
}
