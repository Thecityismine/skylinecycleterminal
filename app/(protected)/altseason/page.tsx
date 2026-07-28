"use client";

import { useState, useMemo } from 'react';
import { ImageDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useApiData } from '@/lib/hooks/useApiData';
import { AltseasonIndexChart } from '@/components/charts/AltseasonIndexChart';
import { AltseasonShareModal } from '@/components/share/AltseasonShareModal';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { REGIMES } from '@/lib/indicators/altseasonIndex';
import type { AltseasonRegime, SectorSummary, SignalDot } from '@/lib/indicators/altseasonIndex';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type ChartPoint = { time: string; ts: number; score: number; btcPrice: number | null };

type SubScores = {
  altBreadth:   number;
  btcDominance: number;
  ethBtc:       number;
  total2:       number;
  total3:       number;
  stablecoin:   number;
};

type ApiResponse = {
  score:              number;
  regime:             AltseasonRegime;
  regimeLabel:        string;
  regimeColor:        string;
  btcDominance:       number;
  ethBtc:             number;
  ethBtc90dAgo:       number;
  stableDomPct:       number;
  altcoinsTracked:    number;
  altcoinsBeatingBtc: number;
  btcChg90d:          number;
  subScores:          SubScores;
  chartData:          ChartPoint[];
  signalDots:         SignalDot[];
  sectorSummaries:    SectorSummary[];
};

const RANGES = [
  { label: '3 Months', ms: 90  * 86400_000 },
  { label: '6 Months', ms: 180 * 86400_000 },
  { label: '1 Year',   ms: 365 * 86400_000 },
] as const;

function ScoreBar({ label, value, weight, color }: { label: string; value: number; weight: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--sct-muted)' }}>
        <span>{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{value}/100 <span style={{ color: 'var(--sct-muted)', fontWeight: 400 }}>({(weight * 100).toFixed(0)}%)</span></span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-panel)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: SectorSummary['status'] }) {
  if (status === 'strong' || status === 'improving') return <TrendingUp size={12} style={{ color: '#35D07F' }} />;
  if (status === 'weak') return <TrendingDown size={12} style={{ color: '#FF3B5C' }} />;
  return <Minus size={12} style={{ color: '#E6B450' }} />;
}

const STATUS_COLORS: Record<string, string> = {
  strong:    '#35D07F',
  improving: '#45F3FF',
  neutral:   '#E6B450',
  weak:      '#FF3B5C',
};

export default function AltseasonPage() {
  const [rangeIdx,       setRangeIdx]       = useState(2);
  const [showShareModal, setShowShareModal] = useState(false);
  const [zoomDomain,     setZoomDomain]     = useState<ZoomDomain<number> | null>(null);

  const { data, loading } = useApiData<ApiResponse>('/api/altseason');

  const startTs = useMemo(() => {
    return Date.now() - RANGES[rangeIdx].ms;
  }, [rangeIdx]);

  const regime = data ? REGIMES.find((r) => r.key === data.regime) : null;

  // ETH/BTC trend
  const ethBtcChg = data ? ((data.ethBtc - data.ethBtc90dAgo) / (data.ethBtc90dAgo || 1)) * 100 : 0;
  const ethBtcTrend =
    ethBtcChg > 5 ? 'Strengthening'
    : ethBtcChg < -5 ? 'Weakening'
    : 'Neutral';
  const ethBtcColor =
    ethBtcChg > 5 ? '#35D07F'
    : ethBtcChg < -5 ? '#FF5CA8'
    : '#E6B450';

  return (
    <>
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Altcoin Season Index"
        subtitle="Crypto market rotation, Bitcoin leadership, and altcoin breadth"
      />

      {/* ── Hero summary cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Score card */}
        <div
          className="rounded-xl border p-4 space-y-2 col-span-2 md:col-span-1"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor:     data ? data.regimeColor : 'var(--sct-border)',
            borderLeftWidth: '4px',
          }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Altseason Index
          </p>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-4xl font-mono font-bold"
              style={{ color: data ? data.regimeColor : 'var(--sct-muted)' }}
            >
              {loading ? '—' : (data?.score ?? '—')}
            </span>
            <span className="text-sm" style={{ color: 'var(--sct-muted)' }}>/100</span>
          </div>
          <p className="text-sm font-semibold" style={{ color: data ? data.regimeColor : 'var(--sct-muted)' }}>
            {loading ? 'Loading…' : (data?.regimeLabel ?? '—')}
          </p>
          {regime && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              {regime.posture}
            </p>
          )}
        </div>

        {/* Breadth */}
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Alts Beating BTC (90D)
          </p>
          <p className="text-3xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
            {loading ? '—' : (data ? `${data.altcoinsBeatingBtc}/${data.altcoinsTracked}` : '—')}
          </p>
          {data && (
            <>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-panel)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width:           `${(data.altcoinsBeatingBtc / data.altcoinsTracked) * 100}%`,
                    backgroundColor: data.regimeColor,
                  }}
                />
              </div>
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                {((data.altcoinsBeatingBtc / data.altcoinsTracked) * 100).toFixed(0)}% outperforming
              </p>
            </>
          )}
        </div>

        {/* BTC Dominance */}
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            BTC Dominance
          </p>
          <p className="text-3xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
            {loading ? '—' : (data ? `${data.btcDominance.toFixed(1)}%` : '—')}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            BTC.D score: {loading ? '—' : (data?.subScores.btcDominance ?? '—')}/100
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            Higher BTC.D = lower altseason score
          </p>
        </div>

        {/* ETH/BTC */}
        <div
          className="rounded-xl border p-4 space-y-2"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            ETH / BTC
          </p>
          <p className="text-3xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
            {loading ? '—' : (data ? data.ethBtc.toFixed(4) : '—')}
          </p>
          {data && (
            <p className="text-xs font-semibold" style={{ color: ethBtcColor }}>
              {ethBtcTrend} ({ethBtcChg > 0 ? '+' : ''}{ethBtcChg.toFixed(1)}% 90D)
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            ETH/BTC rising confirms alt rotation
          </p>
        </div>
      </div>

      {/* ── Main chart ───────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Altcoin Season Index · BTC Price (background)
            </p>
            {/* Zone legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {REGIMES.map((r) => (
                <span key={r.key} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sct-muted)' }}>
                  <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: r.color + '55', border: `1px solid ${r.color}` }} />
                  {r.range[0]}–{r.range[1]}: {r.shortLabel}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => { setRangeIdx(i); setZoomDomain(null); }}
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
              onClick={() => setShowShareModal(true)}
              disabled={!data?.chartData.length}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all border"
              style={{
                backgroundColor: 'transparent',
                borderColor:     'var(--sct-border)',
                color:           'var(--sct-muted)',
                cursor:          !data?.chartData.length ? 'not-allowed' : 'pointer',
                opacity:         !data?.chartData.length ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!data?.chartData.length) return;
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

        <div style={{ height: 440 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading index data…</p>
            </div>
          ) : data?.chartData.length ? (
            <AltseasonIndexChart
              data={data.chartData}
              signalDots={data.signalDots}
              startTs={startTs}
              onZoomChange={setZoomDomain}
            />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">No data</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Score breakdown + sector table ───────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Score breakdown */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Score Breakdown
          </p>
          {data ? (
            <div className="space-y-3">
              <ScoreBar label="Altcoin Breadth (90D)"    value={data.subScores.altBreadth}   weight={0.40} color="#45F3FF" />
              <ScoreBar label="BTC Dominance Trend"       value={data.subScores.btcDominance} weight={0.20} color="#F7931A" />
              <ScoreBar label="ETH / BTC Strength"        value={data.subScores.ethBtc}       weight={0.15} color="#35D07F" />
              <ScoreBar label="TOTAL2 Relative Strength"  value={data.subScores.total2}       weight={0.10} color="#3B82F6" />
              <ScoreBar label="TOTAL3 Relative Strength"  value={data.subScores.total3}       weight={0.10} color="#8B5CF6" />
              <ScoreBar label="Stablecoin Dom. Trend"     value={data.subScores.stablecoin}   weight={0.05} color="#E6B450" />
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Loading…</p>
          )}
        </div>

        {/* Sector breadth table */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Sector Breadth vs BTC (90D)
          </p>
          {data?.sectorSummaries.length ? (
            <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
              <div
                className="grid gap-2 pb-2 text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--sct-muted)', gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr' }}
              >
                <div>Category</div>
                <div>Avg vs BTC</div>
                <div>Beating</div>
                <div>Status</div>
              </div>
              {data.sectorSummaries.map((s) => (
                <div
                  key={s.sector}
                  className="grid gap-2 py-2 items-center text-xs"
                  style={{ borderColor: 'var(--sct-border)', gridTemplateColumns: '1.4fr 1fr 0.8fr 0.8fr' }}
                >
                  <div className="font-medium" style={{ color: 'var(--sct-text)' }}>{s.label}</div>
                  <div
                    className="font-mono font-semibold"
                    style={{ color: s.avgReturn !== null && s.avgReturn > 0 ? '#35D07F' : '#FF5CA8' }}
                  >
                    {s.avgReturn !== null ? `${s.avgReturn > 0 ? '+' : ''}${s.avgReturn}%` : '—'}
                  </div>
                  <div style={{ color: 'var(--sct-muted)' }}>
                    {s.beating}/{s.count}
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusIcon status={s.status} />
                    <span
                      className="text-[10px] capitalize"
                      style={{ color: STATUS_COLORS[s.status] ?? 'var(--sct-muted)' }}
                    >
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              {loading ? 'Loading…' : 'No sector data available.'}
            </p>
          )}
        </div>
      </div>

      {/* ── Signal rules + methodology ──────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Signal rules */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Regime Guide
          </p>
          <div className="space-y-0 divide-y" style={{ borderColor: 'var(--sct-border)' }}>
            {REGIMES.slice().reverse().map((r) => (
              <div
                key={r.key}
                className="py-2.5 space-y-0.5"
                style={{ borderColor: 'var(--sct-border)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color, boxShadow: `0 0 4px ${r.color}` }} />
                  <span className="text-xs font-semibold" style={{ color: r.color }}>
                    {r.range[0]}–{r.range[1]}: {r.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed pl-4" style={{ color: 'var(--sct-muted)' }}>
                  {r.posture}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Methodology
          </p>
          <div className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            <p>The Altcoin Season Index is a composite 0–100 score measuring how broadly altcoins are outperforming Bitcoin across six signals.</p>
            <p><span className="font-semibold" style={{ color: '#45F3FF' }}>Altcoin Breadth (40%)</span> — the percentage of the top non-stable alts outperforming BTC over 90 days. This is the primary signal.</p>
            <p><span className="font-semibold" style={{ color: '#F7931A' }}>BTC Dominance (20%)</span> — declining BTC.D means capital is rotating into altcoins.</p>
            <p><span className="font-semibold" style={{ color: '#35D07F' }}>ETH/BTC (15%)</span> — ETH/BTC rising confirms that risk appetite is expanding beyond Bitcoin.</p>
            <p><span className="font-semibold" style={{ color: '#3B82F6' }}>TOTAL2 + TOTAL3 (20%)</span> — relative growth of the altcoin market cap vs BTC. TOTAL3 captures small-cap breadth.</p>
            <p><span className="font-semibold" style={{ color: '#E6B450' }}>Stablecoin Dom. (5%)</span> — lower stablecoin share means capital is deployed into risk assets.</p>
            <p className="font-medium pt-1" style={{ color: 'var(--sct-secondary)' }}>
              Historical chart uses a simplified 3-signal model (BTC share, ETH/BTC, stablecoin dominance) built from available daily data. The current score uses all six signals.
            </p>
          </div>
        </div>
      </div>
    </div>

    {showShareModal && data && (
      <AltseasonShareModal
        payload={{
          score:              data.score,
          regimeLabel:        data.regimeLabel,
          regimeColor:        data.regimeColor,
          btcDominance:       data.btcDominance,
          ethBtc:             data.ethBtc,
          altcoinsTracked:    data.altcoinsTracked,
          altcoinsBeatingBtc: data.altcoinsBeatingBtc,
          chartData:          zoomDomain
            ? data.chartData.filter((d) => d.ts >= zoomDomain.start && d.ts <= zoomDomain.end)
            : data.chartData,
          signalDots:         data.signalDots,
          startTs:            zoomDomain ? zoomDomain.start : startTs,
          rangeLabel:         zoomDomain ? 'Zoomed' : RANGES[rangeIdx].label,
          generatedAt:        new Date().toISOString(),
        }}
        onClose={() => setShowShareModal(false)}
      />
    )}
    </>
  );
}
