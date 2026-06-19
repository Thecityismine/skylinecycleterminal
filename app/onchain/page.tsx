"use client";

import { useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { MacroLineChart, type MacroDataPoint } from '@/components/charts/MacroLineChart';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

type OnChainPoint = {
  time:      string;
  mvrvProxy: number | null;
  puell:     number | null;
  nvt:       number | null;
  addresses: number | null;
};

type OnChainResponse = {
  points:  OnChainPoint[];
  current: {
    mvrvProxy:  number | null;
    puell:      number | null;
    nvt:        number | null;
    addresses:  number | null;
    price:      number | null;
  };
};

function mvrvSignal(v: number | null): { label: string; color: string } {
  if (v == null)  return { label: '—',                        color: 'var(--sct-muted)' };
  if (v < 0.8)    return { label: 'Extreme Undervalue',       color: '#3B82F6' };
  if (v < 1.0)    return { label: 'Accumulate',               color: '#60A5FA' };
  if (v < 1.5)    return { label: 'Fair Value — Hold',        color: '#35D07F' };
  if (v < 2.5)    return { label: 'Moderate Premium',         color: '#E6B450' };
  if (v < 3.5)    return { label: 'High Premium — Caution',   color: '#F97316' };
  return                  { label: 'Extreme Premium — Top',   color: '#FF5C5C' };
}

function puellSignal(v: number | null): { label: string; color: string } {
  if (v == null)  return { label: '—',                        color: 'var(--sct-muted)' };
  if (v < 0.5)    return { label: 'Miner Stress — Accumulate',color: '#3B82F6' };
  if (v < 1.0)    return { label: 'Below Average',            color: '#35D07F' };
  if (v < 2.0)    return { label: 'Average — Neutral',        color: '#E6B450' };
  if (v < 4.0)    return { label: 'Elevated — Caution',       color: '#F97316' };
  return                  { label: 'Extreme — Top Signal',    color: '#FF5C5C' };
}

function nvtSignal(v: number | null): { label: string; color: string } {
  if (v == null)  return { label: '—',                        color: 'var(--sct-muted)' };
  if (v < 300)    return { label: 'Undervalued Network',      color: '#3B82F6' };
  if (v < 600)    return { label: 'Fair Value',               color: '#35D07F' };
  if (v < 1200)   return { label: 'Moderately High',          color: '#E6B450' };
  return                  { label: 'Overvalued Network',      color: '#FF5C5C' };
}

function addrSignal(v: number | null, data: OnChainPoint[]): { label: string; color: string } {
  if (v == null || data.length < 30) return { label: '—', color: 'var(--sct-muted)' };
  const hist = data.filter(d => d.addresses != null).map(d => d.addresses!);
  const avg  = hist.reduce((a, b) => a + b, 0) / hist.length;
  const ratio = v / avg;
  if (ratio < 0.7)   return { label: 'Well Below Average',   color: '#3B82F6' };
  if (ratio < 0.9)   return { label: 'Below Average',        color: '#60A5FA' };
  if (ratio < 1.1)   return { label: 'At Historical Average',color: '#35D07F' };
  if (ratio < 1.3)   return { label: 'Above Average — Active', color: '#E6B450' };
  return                     { label: 'High Activity',        color: '#FF5C5C' };
}

function toSeries(points: OnChainPoint[], key: keyof OnChainPoint): MacroDataPoint[] {
  return points
    .filter(p => p[key] != null)
    .map(p => ({ date: p.time, value: p[key] as number }));
}

export default function OnChainPage() {
  const { data, loading } = useApiData<OnChainResponse>('/api/onchain');
  const { data: cycle }   = useApiData<CycleScoreResult>('/api/cycle');

  const mvrvInd = cycle?.indicators.find(i => i.name === 'MVRV Ratio');
  const puellInd = cycle?.indicators.find(i => i.name === 'Puell Multiple');
  const nvtInd   = cycle?.indicators.find(i => i.name === 'NVT Signal');
  const addrInd  = cycle?.indicators.find(i => i.name === 'Active Addresses');

  const cur = data?.current;
  const pts = data?.points ?? [];

  const mvrvSig = mvrvSignal(cur?.mvrvProxy ?? null);
  const puellSig = puellSignal(cur?.puell ?? null);
  const nvtSig   = nvtSignal(cur?.nvt ?? null);
  const addrSig  = addrSignal(cur?.addresses ?? null, pts);

  const mvrvSeries   = useMemo(() => toSeries(pts, 'mvrvProxy'),  [pts]);
  const puellSeries  = useMemo(() => toSeries(pts, 'puell'),      [pts]);
  const nvtSeries    = useMemo(() => toSeries(pts, 'nvt'),        [pts]);
  const addrSeries   = useMemo(() => toSeries(pts, 'addresses'),  [pts]);

  const CHARTS = [
    {
      title:    'MVRV Ratio (Price / 200d MA)',
      series:   mvrvSeries,
      color:    mvrvSig.color === 'var(--sct-muted)' ? '#3B82F6' : mvrvSig.color,
      unit:     '×',
      decimals: 2,
      desc:     'Price relative to the 200-day moving average. Above 2.5× has historically marked cycle tops; below 1.0× is strong accumulation.',
      ind:      mvrvInd,
      id:       'mvrv',
    },
    {
      title:    'Puell Multiple',
      series:   puellSeries,
      color:    puellSig.color === 'var(--sct-muted)' ? '#35D07F' : puellSig.color,
      unit:     '×',
      decimals: 2,
      desc:     'Daily miner revenue vs 365-day average. Below 0.5 = miner stress (buy signal). Above 4.0 = extreme miner profitability (sell signal).',
      ind:      puellInd,
      id:       'puell',
    },
    {
      title:    'NVT Signal (Network Value / Tx Count)',
      series:   nvtSeries,
      color:    nvtSig.color === 'var(--sct-muted)' ? '#E6B450' : nvtSig.color,
      unit:     'K',
      decimals: 0,
      desc:     'Market cap relative to 90-day avg transaction count. High NVT = price growth outpacing network usage = potential overvaluation.',
      ind:      nvtInd,
      id:       'nvt',
    },
    {
      title:    'Active Addresses (30d MA)',
      series:   addrSeries,
      color:    addrSig.color === 'var(--sct-muted)' ? '#A855F7' : addrSig.color,
      unit:     'K',
      decimals: 0,
      desc:     '30-day moving average of unique addresses active per day. Rising = growing adoption and network use. Declining during price rises = divergence warning.',
      ind:      addrInd,
      id:       'addr',
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="On-Chain Metrics"
        subtitle="Network health and investor behavior signals from CoinMetrics"
      />

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          label="MVRV Ratio"
          value={cur?.mvrvProxy != null ? `${cur.mvrvProxy.toFixed(2)}×` : '—'}
          sub={mvrvSig.label}
          accent={mvrvSig.color}
          freshness="daily"
          source="CoinMetrics (proxy)"
        />
        <StatCard
          label="Puell Multiple"
          value={cur?.puell != null ? `${cur.puell.toFixed(2)}×` : '—'}
          sub={puellSig.label}
          accent={puellSig.color}
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="NVT Signal"
          value={cur?.nvt != null ? `$${cur.nvt.toFixed(0)}K/tx` : '—'}
          sub={nvtSig.label}
          accent={nvtSig.color}
          freshness="daily"
          source="CoinMetrics (proxy)"
        />
        <StatCard
          label="Active Addresses"
          value={cur?.addresses != null ? `${cur.addresses.toFixed(0)}K` : '—'}
          sub={addrSig.label}
          accent={addrSig.color}
          freshness="daily"
          source="CoinMetrics"
        />
      </div>

      {/* 2×2 chart grid */}
      <div className="grid grid-cols-2 gap-6">
        {CHARTS.map(c => (
          <div
            key={c.id}
            className="rounded-xl border p-5"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
          >
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
                {c.title}
              </p>
              {c.ind && (
                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
                  backgroundColor: c.color + '20',
                  color: c.color,
                }}>
                  Score {Math.round(c.ind.score)} · {c.ind.signal}
                </span>
              )}
            </div>
            <p className="text-[11px] mb-3" style={{ color: 'var(--sct-muted)' }}>{c.desc}</p>
            {loading
              ? <ChartSkeleton height="h-44" />
              : <MacroLineChart id={c.id} data={c.series} color={c.color} unit={c.unit} decimals={c.decimals} />
            }
          </div>
        ))}
      </div>

      {/* Insight panel */}
      <InsightPanel title="Combined On-Chain Signal">
        <InsightRow label="MVRV Ratio"        value={mvrvSig.label}  valueColor={mvrvSig.color} />
        <InsightRow label="Puell Multiple"    value={puellSig.label} valueColor={puellSig.color} />
        <InsightRow label="NVT Signal"        value={nvtSig.label}   valueColor={nvtSig.color} />
        <InsightRow label="Active Addresses"  value={addrSig.label}  valueColor={addrSig.color} />
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          MVRV and Puell both below 1.0 simultaneously have historically marked the strongest
          multi-year accumulation windows in Bitcoin. NVT above its long-run average combined
          with declining active addresses is an early divergence warning.
        </p>
      </InsightPanel>
    </div>
  );
}
