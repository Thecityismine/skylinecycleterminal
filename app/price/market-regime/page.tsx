"use client";

import { useState, useMemo } from 'react';
import { ImageDown } from 'lucide-react';

type Range = '4Y' | '8Y' | 'All';
const RANGES: Range[]          = ['4Y', '8Y', 'All'];
const RANGE_DAYS: Record<Range, number> = { '4Y': 4 * 365.25, '8Y': 8 * 365.25, 'All': Infinity };
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { RegimeChart } from '@/components/charts/RegimeChart';
import { RegimeShareModal } from '@/components/share/RegimeShareModal';
import type { RegimeResult, RegimeZone } from '@/lib/indicators/regimeHelpers';
import { REGIME_COLOR, REGIME_LABEL, fmtDate, fmtReturn } from '@/lib/indicators/regimeHelpers';

// Server-side computation is heavy (4 000+ rows); use a dedicated API route
// so the browser fetches cached data rather than blocking during SSR.

function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

function RegimeTableRow({ z, isOngoing }: { z: RegimeZone; isOngoing: boolean }) {
  const color  = REGIME_COLOR[z.regime];
  const retPos = z.returnPct >= 0;
  return (
    <tr className="border-b" style={{ borderColor: 'var(--sct-border)' }}>
      <td className="py-2.5 pr-4">
        <span className="flex items-center gap-2 text-xs font-medium" style={{ color }}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          {REGIME_LABEL[z.regime]}
        </span>
      </td>
      <td className="py-2.5 pr-4 text-xs font-mono" style={{ color: 'var(--sct-secondary)' }}>
        {fmtDate(z.start)}
      </td>
      <td className="py-2.5 pr-4 text-xs font-mono" style={{ color: 'var(--sct-secondary)' }}>
        {isOngoing ? <span style={{ color: 'var(--sct-green)' }}>Ongoing</span> : fmtDate(z.end)}
      </td>
      <td className="py-2.5 pr-4 text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
        {z.durationDays}d
      </td>
      <td className="py-2.5 text-xs font-mono font-medium" style={{
        color: retPos ? 'var(--sct-green)' : 'var(--sct-red)',
      }}>
        {fmtReturn(z.returnPct)}
      </td>
    </tr>
  );
}

export default function MarketRegimePage() {
  const { data, loading } = useApiData<RegimeResult>('/api/price/regime');
  const [showMA,         setShowMA]         = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [range,          setRange]          = useState<Range>('All');

  const cur   = data?.current;

  const cutoff = useMemo(() => {
    const days = RANGE_DAYS[range];
    return days === Infinity ? 0 : Date.now() - days * 86_400_000;
  }, [range]);

  const filteredPoints = useMemo(
    () => cutoff ? (data?.points ?? []).filter((p) => p.ts >= cutoff) : (data?.points ?? []),
    [data, cutoff],
  );

  const filteredZones = useMemo(
    () => cutoff ? (data?.zones ?? []).filter((z) => z.endTs >= cutoff) : (data?.zones ?? []),
    [data, cutoff],
  );

  const zones = data?.zones ?? [];

  const regimeColor = cur ? REGIME_COLOR[cur.regime] : 'var(--sct-muted)';
  const regimeLabel = cur ? REGIME_LABEL[cur.regime] : '—';

  const ma200Pct    = cur?.priceVsMA200 ?? null;
  const ma200PctStr = ma200Pct != null
    ? `${ma200Pct >= 0 ? '+' : ''}${ma200Pct.toFixed(1)}%`
    : '—';

  // Show only bull and bear zones in the table (skip neutral/transition)
  const tableZones = [...zones]
    .filter((z) => z.regime !== 'neutral')
    .reverse();

  return (
    <>
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC Market Regime"
        subtitle="Trend-based bull and bear market classification using price vs. 200-day moving average"
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current Regime"
          value={regimeLabel}
          sub={cur ? `${cur.ma200Direction === 'rising' ? '200DMA rising' : cur.ma200Direction === 'falling' ? '200DMA falling' : '200DMA flat'}` : 'Loading…'}
          accent={regimeColor}
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="Days in Regime"
          value={cur ? `${cur.daysInRegime}` : '—'}
          sub={cur ? `Since ${data?.zones[data.zones.length - 1]?.start ?? '—'}` : 'Loading…'}
          accent={regimeColor}
          freshness="daily"
        />
        <StatCard
          label="Price vs 200 DMA"
          value={ma200PctStr}
          sub={cur?.ma200 ? `200DMA: ${fmtUSD(cur.ma200)}` : 'Loading…'}
          accent={ma200Pct != null ? (ma200Pct >= 0 ? 'var(--sct-green)' : 'var(--sct-red)') : 'var(--sct-muted)'}
          freshness="daily"
        />
        <StatCard
          label="Regime Confidence"
          value={cur ? `${cur.confidencePct}%` : '—'}
          sub={cur
            ? cur.confidencePct >= 70 ? 'Strong trend signal'
            : cur.confidencePct >= 40 ? 'Moderate signal'
            : 'Weak / transitioning'
            : 'Loading…'}
          accent={cur ? (cur.confidencePct >= 70 ? regimeColor : 'var(--sct-amber)') : 'var(--sct-muted)'}
          freshness="daily"
        />
      </div>

      {/* Main chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              BTC / USD — Log Scale · Bull & Bear Regime Map
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Bull = price above rising 200DMA · Bear = price below falling 200DMA · Neutral = crossover transition
            </p>
          </div>

          {/* Controls + Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Range tabs */}
            <div className="flex items-center gap-1.5">
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
              <span className="hidden md:inline text-[10px] font-mono ml-1" style={{ color: 'var(--sct-muted)', opacity: 0.5 }}>
                drag to zoom
              </span>
            </div>
            <div className="w-px h-4" style={{ backgroundColor: 'var(--sct-border)' }} />
            <button
              onClick={() => setShowMA(!showMA)}
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={{
                borderColor: showMA ? '#F7931A' : 'var(--sct-border)',
                color:       showMA ? '#F7931A' : 'var(--sct-muted)',
                backgroundColor: showMA ? 'rgba(247,147,26,0.08)' : 'transparent',
              }}
            >
              200 DMA
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              disabled={!data}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all border"
              style={{
                backgroundColor: 'transparent',
                borderColor:     'var(--sct-border)',
                color:           'var(--sct-muted)',
                cursor:          !data ? 'not-allowed' : 'pointer',
                opacity:         !data ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!data) return;
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
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--sct-muted)' }}>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(53,208,127,0.35)' }} />
                Bull
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,92,92,0.35)' }} />
                Bear
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(139,148,158,0.25)' }} />
                Neutral
              </span>
            </div>
          </div>
        </div>

        <div className="h-[480px]">
          {loading || !data
            ? <ChartSkeleton height="h-[480px]" />
            : <RegimeChart points={filteredPoints} zones={filteredZones} showMA={showMA} />
          }
        </div>
      </div>

      {/* Regime history table */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
          Regime History
        </p>

        {loading || !data ? (
          <div className="h-32 animate-pulse rounded-lg" style={{ backgroundColor: 'var(--sct-border)' }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--sct-border)' }}>
                  {['Regime', 'Start', 'End', 'Duration', 'BTC Return'].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-[11px] font-medium tracking-wider uppercase"
                      style={{ color: 'var(--sct-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableZones.map((z, i) => (
                  <RegimeTableRow
                    key={`${z.start}-${z.regime}`}
                    z={z}
                    isOngoing={i === 0 && z.ongoing}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    {showShareModal && data && (
      <RegimeShareModal
        payload={{
          points:      filteredPoints,
          zones:       filteredZones,
          current:     data.current,
          showMA,
          generatedAt: new Date().toISOString(),
        }}
        onClose={() => setShowShareModal(false)}
      />
    )}
    </>
  );
}
