"use client";

import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import {
  CrossAssetChart,
  ASSET_CONFIG,
  type AssetKey,
  type NormalizedPoint,
} from '@/components/charts/CrossAssetChart';
import type { CrossAssetPoint, CrossAssetLatest } from '@/lib/api/crossAsset';
import type { RegimeZone } from '@/lib/indicators/regimeHelpers';

type CrossAssetResponse = {
  points: CrossAssetPoint[];
  latest: CrossAssetLatest;
  zones:  RegimeZone[];
};

type Range = '1Y' | '2Y' | '4Y' | 'All';

const ALL_ASSETS: AssetKey[] = ['btc', 'gold', 'sp500', 'nasdaq', 'dxy'];

const RANGE_LABELS: Range[] = ['1Y', '2Y', '4Y', 'All'];

function getStartDate(range: Range): string {
  if (range === 'All') return '2015-01-01';
  const d = new Date();
  const years = range === '1Y' ? 1 : range === '2Y' ? 2 : 4;
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function normalizeWindow(points: CrossAssetPoint[], startDate: string): NormalizedPoint[] {
  const window = points.filter((p) => p.time >= startDate);
  if (!window.length) return [];

  const bases: Partial<Record<AssetKey, number>> = {};
  for (const key of ALL_ASSETS) {
    const first = window.find((p) => p[key] != null);
    if (first?.[key] != null) bases[key] = first[key]!;
  }

  return window.map((p) => ({
    time:   p.time,
    ts:     p.ts,
    btc:    bases.btc    != null && p.btc    != null ? +(p.btc    / bases.btc    * 100).toFixed(2) : null,
    gold:   bases.gold   != null && p.gold   != null ? +(p.gold   / bases.gold   * 100).toFixed(2) : null,
    sp500:  bases.sp500  != null && p.sp500  != null ? +(p.sp500  / bases.sp500  * 100).toFixed(2) : null,
    nasdaq: bases.nasdaq != null && p.nasdaq != null ? +(p.nasdaq / bases.nasdaq * 100).toFixed(2) : null,
    dxy:    bases.dxy    != null && p.dxy    != null ? +(p.dxy    / bases.dxy    * 100).toFixed(2) : null,
  }));
}

function getLatestNorm(normalized: NormalizedPoint[], key: AssetKey): number | null {
  const reversed = [...normalized].reverse();
  const pt = reversed.find((p) => p[key] != null);
  return pt?.[key] ?? null;
}

function getTrend(normalized: NormalizedPoint[], key: AssetKey): 'up' | 'down' | 'neutral' {
  if (normalized.length < 12) return 'neutral';
  const last   = getLatestNorm(normalized, key);
  const anchor = normalized[Math.max(0, normalized.length - 9)]?.[key] ?? null;
  if (last == null || anchor == null) return 'neutral';
  const chg = ((last - anchor) / anchor) * 100;
  if (chg > 4)  return 'up';
  if (chg < -4) return 'down';
  return 'neutral';
}

function fmtReturn(norm: number | null): string {
  if (norm == null) return '—';
  const ret = norm - 100;
  return `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%`;
}

function fmtPrice(latest: CrossAssetLatest, key: AssetKey): string {
  const v = latest[key];
  if (v == null) return '—';
  if (key === 'btc')
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  if (key === 'gold')
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
  if (key === 'dxy')
    return v.toFixed(1);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v);
}

function trendLabel(t: 'up' | 'down' | 'neutral'): string {
  if (t === 'up')   return 'Rising';
  if (t === 'down') return 'Falling';
  return 'Neutral';
}

function trendColor(t: 'up' | 'down' | 'neutral'): string {
  if (t === 'up')   return 'var(--sct-green)';
  if (t === 'down') return 'var(--sct-red)';
  return 'var(--sct-muted)';
}

function buildInterpretation(
  returns: Partial<Record<AssetKey, number | null>>,
  dxyTrend: 'up' | 'down' | 'neutral',
): string[] {
  const lines: string[] = [];
  const btc = returns.btc;
  const gold = returns.gold;
  const sp   = returns.sp500;
  const ndq  = returns.nasdaq;

  if (btc != null && gold != null) {
    const alpha = (btc - 100) - (gold - 100);
    if (alpha > 0)
      lines.push(`Bitcoin is outperforming Gold by ${alpha.toFixed(1)} percentage points — BTC strength versus hard money suggests risk-on behavior.`);
    else
      lines.push(`Gold is outperforming Bitcoin by ${Math.abs(alpha).toFixed(1)} percentage points — this may signal a flight to safety or Bitcoin underperformance.`);
  }

  if (btc != null && sp != null) {
    const alpha = (btc - 100) - (sp - 100);
    if (alpha > 0)
      lines.push(`Bitcoin is ahead of the S&P 500 by ${alpha.toFixed(1)}pp — BTC is currently acting as the lead risk asset.`);
    else
      lines.push(`The S&P 500 is outperforming Bitcoin by ${Math.abs(alpha).toFixed(1)}pp — equities are the stronger performer in this window.`);
  }

  if (ndq != null && sp != null) {
    const alpha = (ndq - 100) - (sp - 100);
    if (Math.abs(alpha) > 5)
      lines.push(`Nasdaq is ${alpha > 0 ? 'leading' : 'lagging'} the S&P 500 by ${Math.abs(alpha).toFixed(1)}pp — ${alpha > 0 ? 'tech is driving risk appetite' : 'broad equities are outpacing tech'}.`);
  }

  if (dxyTrend === 'up')
    lines.push('A strengthening U.S. Dollar typically creates liquidity headwinds for Bitcoin and risk assets globally.');
  else if (dxyTrend === 'down')
    lines.push('A weakening U.S. Dollar tends to support Bitcoin and global risk assets by improving global liquidity conditions.');

  return lines;
}

export default function CrossAssetPage() {
  const [range, setRange]           = useState<Range>('2Y');
  const [activeAssets, setAssets]   = useState<Set<AssetKey>>(new Set(ALL_ASSETS));
  const [logScale, setLogScale]     = useState(false);
  const [showZones, setShowZones]   = useState(true);

  const { data, loading } = useApiData<CrossAssetResponse>('/api/markets/cross-asset');

  const normalized = useMemo<NormalizedPoint[]>(() => {
    if (!data) return [];
    return normalizeWindow(data.points, getStartDate(range));
  }, [data, range]);

  const returns = useMemo(() => {
    const result: Partial<Record<AssetKey, number | null>> = {};
    for (const key of ALL_ASSETS) result[key] = getLatestNorm(normalized, key);
    return result;
  }, [normalized]);

  const trends = useMemo(() => {
    const result: Partial<Record<AssetKey, 'up' | 'down' | 'neutral'>> = {};
    for (const key of ALL_ASSETS) result[key] = getTrend(normalized, key);
    return result;
  }, [normalized]);

  const interpretation = useMemo(
    () => buildInterpretation(returns, trends.dxy ?? 'neutral'),
    [returns, trends],
  );

  // Performance table: sorted by return descending
  const tableRows = useMemo(() => {
    return ALL_ASSETS
      .map((key) => ({ key, norm: returns[key] ?? null, trend: trends[key] ?? 'neutral' }))
      .sort((a, b) => {
        if (a.norm == null) return 1;
        if (b.norm == null) return -1;
        return b.norm - a.norm;
      });
  }, [returns, trends]);

  function toggleAsset(key: AssetKey) {
    setAssets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC Cross-Asset Cycle Map"
        subtitle="Bitcoin versus Gold, equities, and the U.S. Dollar across market cycles"
      />

      {/* Stat cards — one per asset */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {ALL_ASSETS.map((key) => {
          const norm  = returns[key];
          const trend = trends[key] ?? 'neutral';
          const cfg   = ASSET_CONFIG[key];
          const ret   = fmtReturn(norm);
          const price = data ? fmtPrice(data.latest, key) : '—';
          return (
            <StatCard
              key={key}
              label={cfg.label}
              value={ret}
              sub={price}
              trend={norm == null ? undefined : norm >= 100 ? 'up' : 'down'}
              accent={cfg.color}
              freshness="daily"
            />
          );
        })}
      </div>

      {/* Main chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {/* Header + controls */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Normalized Performance — All Assets Rebased to 100
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Higher = greater outperformance from selected start date
            </p>
          </div>

          {/* Time range + view toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Range buttons */}
            <div className="flex items-center gap-1">
              {RANGE_LABELS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="text-xs px-2.5 py-1 rounded border transition-colors"
                  style={{
                    borderColor:     range === r ? 'var(--sct-blue)' : 'var(--sct-border)',
                    color:           range === r ? 'var(--sct-blue)' : 'var(--sct-muted)',
                    backgroundColor: range === r ? 'rgba(83,167,255,0.1)' : 'transparent',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* View toggles */}
            <button
              onClick={() => setShowZones((v) => !v)}
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={{
                borderColor:     showZones ? '#35D07F' : 'var(--sct-border)',
                color:           showZones ? '#35D07F' : 'var(--sct-muted)',
                backgroundColor: showZones ? 'rgba(53,208,127,0.08)' : 'transparent',
              }}
            >
              Bull/Bear
            </button>
            <button
              onClick={() => setLogScale((v) => !v)}
              className="text-xs px-2.5 py-1 rounded border transition-colors"
              style={{
                borderColor:     logScale ? 'var(--sct-amber)' : 'var(--sct-border)',
                color:           logScale ? 'var(--sct-amber)' : 'var(--sct-muted)',
                backgroundColor: logScale ? 'rgba(251,191,36,0.08)' : 'transparent',
              }}
            >
              Log Scale
            </button>
          </div>
        </div>

        {/* Asset pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {ALL_ASSETS.map((key) => {
            const cfg    = ASSET_CONFIG[key];
            const active = activeAssets.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleAsset(key)}
                className="text-xs px-3 py-1 rounded-full border transition-all"
                style={{
                  borderColor:     active ? cfg.color : 'var(--sct-border)',
                  color:           active ? cfg.color : 'var(--sct-muted)',
                  backgroundColor: active ? `${cfg.color}18` : 'transparent',
                  opacity:         active ? 1 : 0.5,
                }}
              >
                {key === 'btc' ? '₿ BTC' : key === 'sp500' ? 'S&P 500' : cfg.label}
              </button>
            );
          })}
        </div>

        <div className="h-[440px]">
          {loading || !data
            ? <ChartSkeleton height="h-[440px]" />
            : (
              <CrossAssetChart
                data={normalized}
                zones={data.zones}
                activeAssets={activeAssets}
                logScale={logScale}
                showZones={showZones}
              />
            )
          }
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 pt-4 border-t" style={{ borderColor: 'var(--sct-border)' }}>
          {ALL_ASSETS.map((key) => {
            const cfg    = ASSET_CONFIG[key];
            const active = activeAssets.has(key);
            return (
              <div key={key} className="flex items-center gap-1.5" style={{ opacity: active ? 1 : 0.35 }}>
                <span
                  className="shrink-0 rounded-full"
                  style={{ width: 24, height: key === 'btc' ? 3 : 2, backgroundColor: cfg.color }}
                />
                <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>{cfg.label}</span>
              </div>
            );
          })}
          {showZones && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(53,208,127,0.25)' }} />
                <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Bull</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255,92,92,0.25)' }} />
                <span className="text-xs" style={{ color: 'var(--sct-muted)' }}>BTC Bear</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Performance table + Interpretation (two-col on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Performance table */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Period Performance
          </p>

          {loading || !data ? (
            <div className="h-40 animate-pulse rounded-lg" style={{ backgroundColor: 'var(--sct-border)' }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--sct-border)' }}>
                    {['Asset', 'Return', 'Current', 'Trend'].map((h) => (
                      <th
                        key={h}
                        className="pb-2 pr-4 text-[11px] font-medium tracking-wider uppercase"
                        style={{ color: 'var(--sct-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(({ key, norm, trend }) => {
                    const cfg  = ASSET_CONFIG[key];
                    const ret  = norm != null ? norm - 100 : null;
                    return (
                      <tr
                        key={key}
                        className="border-b last:border-0"
                        style={{ borderColor: 'var(--sct-border)' }}
                      >
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-2 text-xs font-medium" style={{ color: cfg.color }}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                            {cfg.label}
                          </span>
                        </td>
                        <td
                          className="py-2.5 pr-4 text-xs font-mono font-semibold"
                          style={{ color: ret == null ? 'var(--sct-muted)' : ret >= 0 ? 'var(--sct-green)' : 'var(--sct-red)' }}
                        >
                          {fmtReturn(norm)}
                        </td>
                        <td className="py-2.5 pr-4 text-xs font-mono" style={{ color: 'var(--sct-secondary)' }}>
                          {fmtPrice(data.latest, key)}
                        </td>
                        <td className="py-2.5 text-xs font-medium" style={{ color: trendColor(trend) }}>
                          {trendLabel(trend)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Interpretation panel */}
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs font-medium tracking-wider uppercase mb-4" style={{ color: 'var(--sct-muted)' }}>
            Cross-Asset Read
          </p>

          {loading || !data ? (
            <div className="space-y-2.5">
              {[100, 85, 90, 75].map((w, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded"
                  style={{ width: `${w}%`, backgroundColor: 'var(--sct-border)' }}
                />
              ))}
            </div>
          ) : interpretation.length ? (
            <div className="space-y-3">
              {interpretation.map((line, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--sct-muted)' }}>
              Select a longer time window to generate cross-asset comparisons.
            </p>
          )}

          {/* BTC Alpha callout */}
          {!loading && data && returns.btc != null && returns.sp500 != null && (
            <div
              className="mt-5 pt-4 border-t"
              style={{ borderColor: 'var(--sct-border)' }}
            >
              <p className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--sct-muted)' }}>
                BTC vs S&P 500 Alpha
              </p>
              {(() => {
                const alpha = (returns.btc! - 100) - (returns.sp500! - 100);
                return (
                  <p
                    className="text-xl font-mono font-semibold"
                    style={{ color: alpha >= 0 ? 'var(--sct-green)' : 'var(--sct-red)' }}
                  >
                    {alpha >= 0 ? '+' : ''}{alpha.toFixed(1)}pp
                    <span className="text-sm font-normal ml-2" style={{ color: 'var(--sct-muted)' }}>
                      vs equities
                    </span>
                  </p>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
