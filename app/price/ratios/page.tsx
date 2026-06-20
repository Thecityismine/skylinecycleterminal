"use client";

import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import type { RatioKey, RatioData, RatioSeries } from '@/lib/api/ratios';
import { RatioChart } from '@/components/charts/RatioChart';
import { PageHeader } from '@/components/dashboard/PageHeader';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const RATIOS: { key: RatioKey; label: string; crypto: string; index: string; color: string; desc: string }[] = [
  { key: 'btc_ixic', label: 'BTC / IXIC', crypto: 'Bitcoin',  index: 'Nasdaq',  color: '#F7931A', desc: 'How many Nasdaq index points 1 BTC is worth' },
  { key: 'btc_spx',  label: 'BTC / SPX',  crypto: 'Bitcoin',  index: 'S&P 500', color: '#53A7FF', desc: 'How many S&P 500 index points 1 BTC is worth' },
  { key: 'eth_ixic', label: 'ETH / IXIC', crypto: 'Ethereum', index: 'Nasdaq',  color: '#9B8CFF', desc: 'How many Nasdaq index points 1 ETH is worth' },
];

const RANGES = ['1Y', '2Y', '4Y', 'All'] as const;
type Range = typeof RANGES[number];

function getStartTs(range: Range): number {
  const now = Date.now();
  if (range === '1Y') return now - 365   * 86400_000;
  if (range === '2Y') return now - 730   * 86400_000;
  if (range === '4Y') return now - 1461  * 86400_000;
  return 0;
}

function fmtRatio(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toFixed(6);
}

function pctStr(v: number | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

export default function RatiosPage() {
  const [active, setActive]   = useState<RatioKey>('btc_ixic');
  const [range, setRange]     = useState<Range>('All');
  const [logScale, setLog]    = useState(true);

  const { data, loading: isLoading } = useApiData<RatioData>('/api/markets/ratios');

  const cfg = RATIOS.find((r) => r.key === active)!;
  const series: RatioSeries | null = data ? data[active] : null;

  const filtered = useMemo(() => {
    if (!series) return [];
    const startTs = getStartTs(range);
    return series.points.filter((p) => p.ts >= startTs);
  }, [series, range]);

  // 1Y change for the current ratio
  const oneYearChange = useMemo(() => {
    if (!series || series.points.length < 2) return null;
    const startTs = Date.now() - 365 * 86400_000;
    const base = series.points.find((p) => p.ts >= startTs);
    if (!base || !series.current) return null;
    return ((series.current - base.value) / base.value) * 100;
  }, [series]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Crypto / Market Ratios"
        subtitle="Bitcoin and Ethereum relative strength vs. the Nasdaq (IXIC) and S&P 500 (SPX)"
      />

      {/* Ratio selector */}
      <div className="flex flex-wrap gap-2">
        {RATIOS.map((r) => (
          <button
            key={r.key}
            onClick={() => setActive(r.key)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
            style={{
              backgroundColor: active === r.key ? r.color : 'transparent',
              borderColor:     active === r.key ? r.color : 'var(--sct-border)',
              color:           active === r.key ? '#000'  : 'var(--sct-muted)',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Current Ratio',
            value: fmtRatio(series?.current ?? null),
            sub: `1 ${cfg.crypto} = ${fmtRatio(series?.current ?? null)} ${cfg.index} pts`,
            color: cfg.color,
          },
          {
            label: 'All-Time High',
            value: fmtRatio(series?.ath ?? null),
            sub: 'Ratio peak since 2014',
            color: 'var(--sct-text)',
          },
          {
            label: '% from ATH',
            value: pctStr(series?.pctFromAth ?? null),
            sub: 'vs. historical peak ratio',
            color: (series?.pctFromAth ?? 0) < -30 ? 'var(--sct-green)' : 'var(--sct-red)',
          },
          {
            label: '1Y Change',
            value: pctStr(oneYearChange),
            sub: 'Ratio change past 12 months',
            color: (oneYearChange ?? 0) >= 0 ? 'var(--sct-green)' : 'var(--sct-red)',
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border p-4 space-y-1"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>{c.label}</p>
            <p className="text-xl font-mono font-bold tracking-tight" style={{ color: c.color }}>
              {isLoading ? '…' : c.value}
            </p>
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart card */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              {cfg.label} — Relative Strength
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              {cfg.desc} · dashed verticals = Bitcoin halvings
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Range pills */}
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: range === r ? 'var(--sct-secondary)' : 'transparent',
                    borderColor:     range === r ? 'var(--sct-secondary)' : 'var(--sct-border)',
                    color:           range === r ? '#000' : 'var(--sct-muted)',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Log scale */}
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
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 420 }}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading ratio data…</p>
            </div>
          ) : filtered.length > 0 ? (
            <RatioChart data={filtered} ratioKey={active} logScale={logScale} />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Interpretation */}
      <div
        className="rounded-xl border p-5 space-y-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          How to Read This
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: 'Rising Ratio',
              body: 'Crypto is outperforming the index. Bull runs in BTC/IXIC historically coincide with Bitcoin cycle peaks — the ratio expands sharply then collapses.',
              color: 'var(--sct-green)',
            },
            {
              title: 'Falling Ratio',
              body: 'The index is outperforming crypto. Ratio drawdowns of 60–85% have historically marked Bitcoin bear markets and multi-year accumulation floors.',
              color: 'var(--sct-red)',
            },
            {
              title: 'Halving Cycles',
              body: 'Dashed yellow lines mark Bitcoin halvings. Each halving has historically been followed by a ratio expansion phase lasting 12–18 months into the next bull peak.',
              color: '#E6B450',
            },
          ].map((item) => (
            <div key={item.title} className="space-y-1.5">
              <p className="text-xs font-semibold" style={{ color: item.color }}>{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
