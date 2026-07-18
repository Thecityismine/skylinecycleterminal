"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ImageDown } from 'lucide-react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { RotationToolbar } from './RotationToolbar';
import type { RotationRange, RotationTimeframe, MAPeriod } from './RotationToolbar';
import { RotationChart, fmtRotationValue } from './RotationChart';
import type { RotationChartPoint } from './RotationChart';
import { RotationCurrentReading } from './RotationCurrentReading';
import { RotationTimeline } from './RotationTimeline';
import { RotationStatusBanner } from './RotationStatusBanner';
import { RotationHistoricalSimilarity } from './RotationHistoricalSimilarity';
import { RotationOverviewGrid } from './RotationOverviewGrid';
import { RotationShareModal } from '@/components/share/RotationShareModal';
import { ROTATION_TABS, getTabConfig } from '@/lib/rotation/tabConfig';
import { deriveTabStats } from '@/lib/rotation/deriveTabStats';
import { generateRotationSummary } from '@/lib/rotation/generateSummary';
import { getRegime } from '@/lib/indicators/marketRotation';
import type { CycleSegment, SimilarityMatch } from '@/lib/indicators/marketRotation';
import type { ZoomDomain } from '@/lib/hooks/useChartZoom';

type ApiTab = {
  key:         string;
  points:      RotationChartPoint[];
  score:       number;
  regimeKey:   string;
  regimeLabel: string;
  regimeColor: string;
  timeline:    CycleSegment[];
  similarity:  SimilarityMatch[];
};

type ApiResponse = {
  asOf:              string;
  resolution:        'weekly' | 'daily';
  current:           { totalMarketCap: number; btcDominance: number; ethDominance: number };
  largeCapCoinCount: number;
  tabs:              ApiTab[];
};

function riskLabel(distanceFromATH: number): { label: string; color: string } {
  if (distanceFromATH > -10) return { label: 'Elevated (near highs)', color: 'var(--sct-red)' };
  if (distanceFromATH > -35) return { label: 'Moderate', color: 'var(--sct-amber)' };
  return { label: 'Low (near lows)', color: 'var(--sct-green)' };
}

export function MarketRotationView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabKey = searchParams.get('tab') ?? 'overview';
  const isOverview = tabKey === 'overview';
  const cfg = getTabConfig(isOverview ? ROTATION_TABS[0].key : tabKey);

  const { data, loading } = useApiData<ApiResponse>('/api/market-rotation');

  const [range, setRange] = useState<RotationRange>(cfg.defaultRange);
  const [logScale, setLogScale] = useState(false);
  const [timeframe, setTimeframe] = useState<RotationTimeframe>('Weekly');
  const [ma, setMa] = useState<MAPeriod>(cfg.defaultMA);
  const [zoomDomain, setZoomDomain] = useState<ZoomDomain<number> | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const [dailyData, setDailyData] = useState<ApiResponse | null>(null);

  // Reset per-tab UI state during render (rather than in an effect) when the
  // active tab changes — the standard React pattern for adjusting state in
  // response to a prop/derived-value change without an extra render pass.
  const [prevTabKey, setPrevTabKey] = useState(tabKey);
  if (tabKey !== prevTabKey) {
    setPrevTabKey(tabKey);
    setMa(cfg.defaultMA);
    setRange(cfg.defaultRange);
    setZoomDomain(null);
  }

  useEffect(() => {
    if (timeframe !== 'Daily' || dailyData) return;
    let cancelled = false;
    fetch('/api/market-rotation?res=daily')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setDailyData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [timeframe, dailyData]);

  const activeData = timeframe === 'Daily' && dailyData ? dailyData : data;

  const setTab = useCallback((key: string) => {
    router.push(`${pathname}?tab=${key}`);
  }, [router, pathname]);

  const activeTab = useMemo(
    () => activeData?.tabs.find((t) => t.key === cfg.key),
    [activeData, cfg.key],
  );

  const stats = useMemo(
    () => (activeTab ? deriveTabStats(activeTab.points, ma) : null),
    [activeTab, ma],
  );

  const regime = activeTab ? getRegime(activeTab.score, cfg.regimeTable) : null;
  const latestPhase = activeTab?.timeline[activeTab.timeline.length - 1];
  const risk = stats ? riskLabel(stats.distanceFromATH) : null;

  const summary = useMemo(() => {
    if (!activeTab || !stats || !regime) return '';
    return generateRotationSummary(cfg.ticker, stats, ma, regime, latestPhase, activeTab.similarity);
  }, [activeTab, stats, regime, cfg.ticker, ma, latestPhase]);

  const asOfLabel = activeData
    ? new Date(activeData.asOf).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  return (
    <>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            title="Market Rotation"
            subtitle="Track capital as it moves between Bitcoin, Ethereum, and the broader crypto market."
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--sct-green)' }} />
              <span className="text-[10px] font-mono tracking-wider" style={{ color: 'var(--sct-green)' }}>LIVE</span>
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>Updated: {asOfLabel}</span>
            <button
              onClick={() => setShowShareModal(true)}
              disabled={!activeTab}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
              style={{ backgroundColor: 'transparent', borderColor: 'var(--sct-border)', color: 'var(--sct-muted)', opacity: activeTab ? 1 : 0.4 }}
            >
              <ImageDown size={13} />
              Share Card
            </button>
          </div>
        </div>

        {/* ── Sub-nav tabs ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 border-b pb-3" style={{ borderColor: 'var(--sct-border)' }}>
          <button
            onClick={() => setTab('overview')}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              backgroundColor: isOverview ? 'var(--sct-border)' : 'transparent',
              color:           isOverview ? 'var(--sct-text)' : 'var(--sct-muted)',
            }}
          >
            Overview
          </button>
          {ROTATION_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                backgroundColor: !isOverview && tabKey === t.key ? 'var(--sct-border)' : 'transparent',
                color:           !isOverview && tabKey === t.key ? 'var(--sct-text)' : 'var(--sct-muted)',
              }}
            >
              {t.navLabel}
            </button>
          ))}
        </div>

        {isOverview ? (
          <RotationOverviewGrid tabs={data?.tabs} loading={loading} pathname={pathname} />
        ) : activeTab && stats && regime ? (
          <>
            {/* ── Widgets row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <StatCard label={cfg.ticker} value={fmtRotationValue(stats.currentValue, cfg.isRatio)} sub="Current value" freshness="daily" />
              <StatCard
                label="Distance from ATH" value={`${stats.distanceFromATH.toFixed(1)}%`}
                trend={stats.distanceFromATH >= 0 ? 'up' : 'down'} freshness="daily"
              />
              <StatCard label="Cycle Phase" value={latestPhase ? latestPhase.phase[0].toUpperCase() + latestPhase.phase.slice(1) : '—'} freshness="weekly" />
              <StatCard label="Trend Status" value={stats.trend} accent={stats.trend === 'Bullish' ? 'var(--sct-green)' : stats.trend === 'Bearish' ? 'var(--sct-red)' : 'var(--sct-amber)'} freshness="daily" />
              <StatCard
                label={`${ma}W EMA Distance`}
                value={stats.distanceFromMA != null ? `${stats.distanceFromMA.toFixed(1)}%` : '—'}
                trend={stats.aboveMA == null ? 'neutral' : stats.aboveMA ? 'up' : 'down'} freshness="weekly"
              />
              <StatCard label="Rotation Score" value={`${activeTab.score}`} sub="/ 100" accent={regime.color} freshness="daily" />
            </div>

            {/* ── Chart card ──────────────────────────────────────────── */}
            <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>{cfg.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{cfg.description}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--sct-muted)' }}>MA: {cfg.maReason}</p>
                </div>
                <RotationToolbar
                  range={range} onRangeChange={(r) => { setRange(r); setZoomDomain(null); }}
                  logScale={logScale} onLogScaleChange={setLogScale}
                  timeframe={timeframe} onTimeframeChange={setTimeframe}
                  ma={ma} onMAChange={setMa}
                  isZoomed={zoomDomain != null} onResetZoom={() => setZoomDomain(null)}
                />
              </div>

              <div style={{ height: 440 }}>
                <RotationChart
                  points={activeTab.points}
                  ma={ma} logScale={logScale} range={range}
                  color={cfg.color} isRatio={cfg.isRatio}
                  onZoomChange={setZoomDomain}
                />
              </div>
            </div>

            {/* ── Current reading ─────────────────────────────────────── */}
            <RotationCurrentReading label={regime.label} color={regime.color} score={activeTab.score} description={cfg.description} />

            {/* ── Stats + Insights + Similarity ──────────────────────── */}
            <div className="grid md:grid-cols-3 gap-4">
              <InsightPanel title="Stats">
                <InsightRow label="Trend" value={stats.trend} valueColor={stats.trend === 'Bullish' ? 'var(--sct-green)' : stats.trend === 'Bearish' ? 'var(--sct-red)' : 'var(--sct-amber)'} />
                <InsightRow label="Cycle Position" value={latestPhase ? latestPhase.phase[0].toUpperCase() + latestPhase.phase.slice(1) : '—'} />
                <InsightRow label={`${ma}W EMA`} value={stats.aboveMA == null ? '—' : stats.aboveMA ? 'Above' : 'Below'} valueColor={stats.aboveMA ? 'var(--sct-green)' : 'var(--sct-red)'} />
                <InsightRow label="Momentum" value={stats.momentumLabel} />
                <InsightRow label="Rotation Score" value={`${activeTab.score} / 100`} valueColor={regime.color} />
              </InsightPanel>

              <InsightPanel title="Current Market Read">
                <InsightRow label="Current Trend" value={stats.trend} />
                <InsightRow label={`Above ${ma}W EMA`} value={stats.aboveMA == null ? '—' : stats.aboveMA ? 'Yes' : 'No'} />
                <InsightRow label="Weekly Momentum" value={stats.momentumLabel} />
                <InsightRow label="Cycle Phase" value={latestPhase ? latestPhase.phase[0].toUpperCase() + latestPhase.phase.slice(1) : '—'} />
                <InsightRow label="Current Risk" value={risk?.label ?? '—'} valueColor={risk?.color} />
                <InsightRow label="Historical Similarity" value={activeTab.similarity[0] ? `${activeTab.similarity[0].similarity}%` : '—'} />
              </InsightPanel>

              <RotationHistoricalSimilarity matches={activeTab.similarity} />
            </div>

            {/* ── Tracked metrics ─────────────────────────────────────── */}
            <InsightPanel title="Tracked Metrics">
              <div className="flex flex-wrap gap-2">
                {cfg.metrics.map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-full text-xs border"
                    style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-secondary)' }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </InsightPanel>

            {/* ── Bottom cycle timeline ───────────────────────────────── */}
            <RotationTimeline segments={activeTab.timeline} />

            {/* ── Bottom status banner ────────────────────────────────── */}
            <RotationStatusBanner summary={summary} rating={activeTab.score} ratingLabel={regime.label} color={regime.color} />
          </>
        ) : (
          <div className="rounded-xl border p-10 text-center" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
            <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>Loading rotation data…</p>
          </div>
        )}
      </div>

      {showShareModal && activeTab && stats && regime && (
        <RotationShareModal
          tabKey={cfg.key}
          payload={{
            ticker:      cfg.ticker,
            title:       cfg.title,
            subtitle:    cfg.shareSubtitle,
            color:       cfg.color,
            isRatio:     cfg.isRatio,
            points:      zoomDomain
              ? activeTab.points.filter((p) => p.ts >= zoomDomain.start && p.ts <= zoomDomain.end)
              : activeTab.points,
            ma,
            rangeLabel:  zoomDomain ? 'Zoomed' : range,
            logScale,
            score:       activeTab.score,
            regimeLabel: regime.label,
            regimeColor: regime.color,
            currentValue: stats.currentValue,
            distanceFromATH: stats.distanceFromATH,
            trend:       stats.trend,
            generatedAt: new Date().toISOString(),
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
