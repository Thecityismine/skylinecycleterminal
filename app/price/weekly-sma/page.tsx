"use client";

import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { WeeklySMAChart } from '@/components/charts/WeeklySMAChart';
import { PageHeader } from '@/components/dashboard/PageHeader';
import type { WeeklySMAData, WeeklySMAResult, Zone } from '@/lib/api/weeklySMA';
import { ZONE_COLOR, ZONE_LABEL, ZONE_FILL } from '@/lib/api/weeklySMA';
import { WeeklySMAShareModal } from '@/components/share/WeeklySMAShareModal';
import type { WeeklySMASharePayload } from '@/components/share/WeeklySMAShareCard';

const ASSETS = [
  { key: 'btc' as const, label: 'Bitcoin',  ticker: 'BTC', color: '#F7931A' },
  { key: 'eth' as const, label: 'Ethereum', ticker: 'ETH', color: '#9B8CFF' },
];

const RANGES = [
  { label: '1Y',  ms: 365  * 86400_000 },
  { label: '3Y',  ms: 1095 * 86400_000 },
  { label: '5Y',  ms: 1825 * 86400_000 },
  { label: 'All', ms: 0 },
] as const;

function fmtUSD(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

function pctDiff(a: number | null, b: number | null): string {
  if (a == null || b == null || b === 0) return '—';
  const pct = ((a - b) / b) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

// Mini signal card for the asset grid
function AssetSignalCard({
  asset, result, active, onClick,
}: {
  asset: typeof ASSETS[number];
  result: WeeklySMAResult | null;
  active: boolean;
  onClick: () => void;
}) {
  const zone = (result?.current.zone ?? 'none') as Zone;
  const zColor = ZONE_COLOR[zone];
  const zLabel = zone === 'bull' ? 'Bull Market' : zone === 'bear' ? 'Bear Market' : zone === 'cheap' ? 'Accum.' : '—';

  return (
    <button
      onClick={onClick}
      className="rounded-xl border p-3 text-left transition-all space-y-1 w-full"
      style={{
        backgroundColor: active ? 'var(--sct-card)' : 'var(--sct-panel)',
        borderColor:     active ? asset.color        : 'var(--sct-border)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: asset.color }}>{asset.ticker}</span>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: zColor + '22', color: zColor }}
        >
          {zLabel}
        </span>
      </div>
      <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>{asset.label}</p>
      <p className="text-sm font-mono font-semibold" style={{ color: 'var(--sct-text)' }}>
        {fmtUSD(result?.current.price ?? null)}
      </p>
    </button>
  );
}

export default function WeeklySMAPage() {
  const [activeAsset, setActiveAsset] = useState<'btc' | 'eth'>('btc');
  const [rangeIdx,    setRangeIdx]    = useState(3); // 'All' default
  const [logScale,    setLog]         = useState(true);

  const { data, loading } = useApiData<WeeklySMAData>('/api/price/weekly-sma');

  const assetCfg = ASSETS.find((a) => a.key === activeAsset)!;
  const result   = data ? data[activeAsset] : null;

  const { filteredPoints, filteredSegments } = useMemo(() => {
    if (!result) return { filteredPoints: [], filteredSegments: [] };
    const range = RANGES[rangeIdx];
    const cutoff = range.ms === 0 ? 0 : Date.now() - range.ms;

    const filteredPoints = result.points.filter((p) => p.ts >= cutoff);
    const filteredSegments = result.segments
      .filter((s) => s.x2 >= cutoff)
      .map((s) => ({ ...s, x1: Math.max(s.x1, cutoff) }));

    return { filteredPoints, filteredSegments };
  }, [result, rangeIdx]);

  const cur  = result?.current;
  const zone = (cur?.zone ?? 'none') as Zone;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Weekly SMA — Bull / Bear Signal"
        subtitle="50-week & 200-week simple moving averages · one indicator · same logic for every asset"
      />

      {/* Asset selector grid */}
      <div className="grid grid-cols-2 gap-3">
        {ASSETS.map((a) => (
          <AssetSignalCard
            key={a.key}
            asset={a}
            result={data ? data[a.key] : null}
            active={activeAsset === a.key}
            onClick={() => setActiveAsset(a.key)}
          />
        ))}
      </div>

      {/* Zone signal banner */}
      <div
        className="rounded-xl border px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{
          backgroundColor: 'var(--sct-card)',
          borderColor:     ZONE_COLOR[zone],
          borderLeftWidth: '4px',
        }}
      >
        <div className="space-y-0.5">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            {assetCfg.ticker} — Weekly Close Signal
          </p>
          <p className="text-xl font-bold" style={{ color: ZONE_COLOR[zone] }}>
            {loading ? 'Loading…' : ZONE_LABEL[zone]}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            {zone === 'bull'  && 'Price above 50W SMA — uptrend intact'}
            {zone === 'bear'  && 'Price below 50W SMA — risk-off or reduced exposure'}
            {zone === 'cheap' && 'Price below 200W SMA — historically the best accumulation window'}
            {zone === 'none'  && 'Insufficient weekly data to compute signal'}
          </p>
        </div>
        <div
          className="text-xs px-3 py-1.5 rounded-lg font-mono font-semibold"
          style={{ backgroundColor: ZONE_COLOR[zone] + '20', color: ZONE_COLOR[zone] }}
        >
          {zone.toUpperCase()}
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Weekly Close',
            value: fmtUSD(cur?.price ?? null),
            sub:   `${assetCfg.ticker} current price`,
            color: assetCfg.color,
          },
          {
            label: '50W SMA · Bull/Bear Line',
            value: fmtUSD(cur?.ma50w ?? null),
            sub:   cur?.price && cur?.ma50w
              ? `Price ${pctDiff(cur.price, cur.ma50w)} vs 50W SMA`
              : 'Above = bull, below = bear',
            color: '#D4A853',
          },
          {
            label: '200W SMA · Cheap Line',
            value: fmtUSD(cur?.ma200w ?? null),
            sub:   cur?.price && cur?.ma200w
              ? `Price ${pctDiff(cur.price, cur.ma200w)} vs 200W SMA`
              : 'Below = historically cheap',
            color: '#5B7DD8',
          },
          {
            label: '50W vs 200W',
            value: cur?.ma50w && cur?.ma200w
              ? pctDiff(cur.ma50w, cur.ma200w)
              : '—',
            sub:   cur?.ma50w && cur?.ma200w
              ? cur.ma50w > cur.ma200w ? 'Golden cross — bullish structure' : 'Death cross — bearish structure'
              : 'MA spread',
            color: cur?.ma50w && cur?.ma200w
              ? cur.ma50w > cur.ma200w ? '#22C55E' : '#EF4444'
              : 'var(--sct-muted)',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border p-4 space-y-1"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>{s.label}</p>
            <p className="text-xl font-mono font-bold" style={{ color: s.color }}>
              {loading ? '…' : s.value}
            </p>
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {/* Chart header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              {assetCfg.ticker} — Weekly Close · Log Scale · Zone Shading
            </p>
            <div className="flex items-center gap-5 mt-1.5">
              {[
                { color: 'rgba(247,249,252,0.85)', label: 'Price' },
                { color: '#D4A853',                label: '50W SMA (Bull/Bear Line)' },
                { color: '#5B7DD8',                label: '200W SMA (Cheap Line)' },
              ].map((l) => (
                <span key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sct-muted)' }}>
                  <span className="w-5 h-0.5 inline-block rounded" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zone legend */}
            <div className="flex gap-3 text-xs mr-2">
              {(['bull','bear','cheap'] as Zone[]).map((z) => (
                <span key={z} className="flex items-center gap-1" style={{ color: ZONE_COLOR[z] }}>
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: ZONE_FILL[z] === 'transparent' ? 'transparent' : ZONE_COLOR[z] + '55' }} />
                  {ZONE_LABEL[z].split(' ')[0]}
                </span>
              ))}
            </div>

            {/* Range */}
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

            {/* Log toggle */}
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

            {/* Share card */}
            {!loading && filteredPoints.length > 0 && (
              <WeeklySMAShareModal payload={{
                points:       filteredPoints,
                segments:     filteredSegments,
                asset:        activeAsset,
                assetLabel:   assetCfg.label,
                assetColor:   assetCfg.color,
                logScale,
                rangeLabel:   RANGES[rangeIdx].label,
                currentPrice: cur?.price ?? null,
                ma50w:        cur?.ma50w ?? null,
                ma200w:       cur?.ma200w ?? null,
                zone,
                generatedAt:  new Date().toISOString(),
              } satisfies WeeklySMASharePayload} />
            )}
          </div>
        </div>

        <div style={{ height: 480 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading weekly data…</p>
            </div>
          ) : filteredPoints.length > 0 ? (
            <WeeklySMAChart
              points={filteredPoints}
              segments={filteredSegments}
              logScale={logScale}
              asset={activeAsset}
            />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">No data</p>
            </div>
          )}
        </div>
      </div>

      {/* Zone guide */}
      <div
        className="rounded-xl border p-5 grid md:grid-cols-3 gap-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {[
          {
            zone: 'bull' as Zone,
            title: 'Bull Market (Green)',
            body: 'Price above the 50W SMA. Trend is up. Historical bull runs in BTC (2013, 2017, 2020–21, 2024) all occurred entirely in this zone. Hold or add on pullbacks.',
          },
          {
            zone: 'bear' as Zone,
            title: 'Bear Market (Red)',
            body: 'Price below the 50W SMA but above the 200W SMA. Risk-off. Previous bear markets lasted 12–18 months in BTC. Reduce exposure, wait for 50W reclaim.',
          },
          {
            zone: 'cheap' as Zone,
            title: 'Accumulation Zone (Blue)',
            body: 'Price below the 200W SMA — the "cheap line." Has only occurred a handful of times in Bitcoin history. Every instance proved to be a generational accumulation window.',
          },
        ].map((g) => (
          <div key={g.zone} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ZONE_COLOR[g.zone] + '55', border: `1px solid ${ZONE_COLOR[g.zone]}` }} />
              <p className="text-xs font-semibold" style={{ color: ZONE_COLOR[g.zone] }}>{g.title}</p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{g.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
