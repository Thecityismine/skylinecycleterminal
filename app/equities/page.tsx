"use client";

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { WATCHLIST, GROUP_LABELS, GROUP_ORDER } from '@/lib/data/watchlist';
import { useApiData } from '@/lib/hooks/useApiData';
import type { EquityData } from '@/lib/indicators/equityScore';

type EquityResponse = EquityData & { fundamentalsAvailable?: boolean };

type SignalFilter = 'all' | 'opportunity' | 'value_trap' | 'expensive_quality' | 'avoid';

const SIGNAL_FILTERS: { key: SignalFilter; label: string; color: string }[] = [
  { key: 'all',               label: 'All Signals',          color: 'var(--sct-muted)' },
  { key: 'opportunity',       label: 'Opportunity',          color: '#35D07F' },
  { key: 'value_trap',        label: 'Value Trap Risk',      color: '#E6B450' },
  { key: 'expensive_quality', label: 'Great Business · Wait', color: '#3B82F6' },
  { key: 'avoid',             label: 'Avoid',                color: '#FF5C5C' },
];

function fmtPrice(v: number | null, currency?: string | null) {
  if (v == null) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  if (v >= 1000) return `${sym}${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${sym}${v.toFixed(2)}`;
}

function fmtPct(v: number | null) {
  if (v == null) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(2)}%`;
}

function ScorePill({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
        style={{ backgroundColor: color + '20', color }}>
        {label}
      </span>
    </div>
  );
}

function StockCard({ ticker, color, signalFilter }: { ticker: string; color: string; signalFilter: SignalFilter }) {
  const { data, loading } = useApiData<EquityResponse>(`/api/equities/${ticker}`);

  if (!loading && signalFilter !== 'all') {
    const quadrant = data?.scores?.quadrant;
    if (!quadrant || quadrant === 'neutral' || quadrant !== signalFilter) return null;
  }

  const price    = data?.fundamentals.price ?? null;
  const change1d = data?.fundamentals.change1d ?? null;
  const currency = data?.fundamentals.currency;
  const scores   = data?.scores;
  const positive = change1d != null && change1d >= 0;

  return (
    <Link href={`/equities/${ticker}`}
      className="block rounded-xl border p-4 space-y-3 transition-all duration-150 hover:border-opacity-80 hover:scale-[1.01] group"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      {/* Ticker + price */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ backgroundColor: color + '20', color }}>
            {ticker.slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--sct-text)' }}>{ticker}</p>
            <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>
              {data?.sector ?? '…'}
            </p>
          </div>
        </div>
        <div className="text-right">
          {loading ? (
            <div className="h-5 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--sct-border)' }} />
          ) : (
            <>
              <p className="text-sm font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
                {fmtPrice(price, currency)}
              </p>
              <p className="text-[10px] font-mono" style={{ color: positive ? '#35D07F' : '#FF5C5C' }}>
                {fmtPct(change1d)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Score row */}
      {loading ? (
        <div className="flex gap-2">
          {[0,1,2].map((i) => (
            <div key={i} className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--sct-border)' }} />
          ))}
        </div>
      ) : scores ? (
        <div className="flex flex-wrap gap-1.5 items-center">
          <ScorePill
            score={scores.trend}
            label={`Trend: ${scores.trendLabel}`}
            color={scores.trend < 45 ? '#35D07F' : scores.trend < 70 ? '#E6B450' : '#FF5C5C'}
          />
          {data?.type !== 'etf' && (
            <>
              <ScorePill
                score={scores.valuation}
                label={scores.valuationLabel}
                color={scores.valuation < 45 ? '#35D07F' : scores.valuation < 70 ? '#E6B450' : '#FF5C5C'}
              />
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                style={{ color: scores.quadrantColor, borderColor: scores.quadrantColor + '40', backgroundColor: scores.quadrantColor + '12' }}
              >
                {scores.quadrantLabel}
              </span>
            </>
          )}
        </div>
      ) : (
        <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>Error loading data</p>
      )}

      {/* 50W/200W bar */}
      {data?.trend.ma200w && data?.trend.priceVs200w && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px]" style={{ color: 'var(--sct-muted)' }}>
            <span>vs 200W MA</span>
            <span className="font-mono">{(data.trend.priceVs200w).toFixed(2)}x</span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (data.trend.vs200wPct ?? 50))}%`,
                backgroundColor: (data.trend.vs200wPct ?? 50) < 40 ? '#35D07F' : (data.trend.vs200wPct ?? 50) < 70 ? '#E6B450' : '#FF5C5C',
              }}
            />
          </div>
          <div className="flex justify-between text-[9px]" style={{ color: 'var(--sct-muted)' }}>
            <span>Depressed</span>
            <span>{data.trend.vs200wPct ?? '—'}th pct.</span>
            <span>Extended</span>
          </div>
        </div>
      )}
    </Link>
  );
}

export default function EquitiesPage() {
  const [filter, setFilter] = useState<string>('all');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all');
  const groups = ['all', ...GROUP_ORDER];
  const filtered = filter === 'all' ? WATCHLIST : WATCHLIST.filter((s) => s.group === filter);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Equity Valuation Terminal"
        subtitle="Weekly trend analysis + fundamental scoring for high-signal equities across crypto, AI, and macro"
      />

      {/* Group filter */}
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <button key={g} onClick={() => setFilter(g)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={{
              backgroundColor: filter === g ? 'var(--sct-secondary)' : 'transparent',
              borderColor:     filter === g ? 'var(--sct-secondary)' : 'var(--sct-border)',
              color:           filter === g ? '#000' : 'var(--sct-muted)',
            }}>
            {g === 'all' ? 'All' : GROUP_LABELS[g as keyof typeof GROUP_LABELS]}
          </button>
        ))}
      </div>

      {/* Signal filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
          Signal:
        </span>
        {SIGNAL_FILTERS.map(({ key, label, color }) => {
          const active = signalFilter === key;
          return (
            <button key={key} onClick={() => setSignalFilter(key)}
              className="px-3 py-1 rounded-lg text-xs font-medium border transition-all"
              style={{
                backgroundColor: active ? color + '20' : 'transparent',
                borderColor:     active ? color : 'var(--sct-border)',
                color:           active ? color : 'var(--sct-muted)',
              }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Zone legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {[
          { color: '#35D07F', label: 'Green Zone — below 50W MA · potential discount entry' },
          { color: '#E6B450', label: 'Amber Zone — above 50W, normal trend' },
          { color: '#FF5C5C', label: 'Red Zone — price far above trend · elevated expectations' },
        ].map(({ color, label }) => (
          <span key={color} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--sct-muted)' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color + '40', border: `1px solid ${color}` }} />
            {label}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((s) => (
          <StockCard key={s.ticker} ticker={s.ticker} color={s.color} signalFilter={signalFilter} />
        ))}
      </div>

      {/* Key legend */}
      <div className="rounded-xl border p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--sct-muted)' }}>
            Trend Score
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            Percentile of price vs 50W and 200W MAs vs own history. Higher = more extended above trend.
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--sct-muted)' }}>
            Valuation Score
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            Derived from P/E, EV/EBITDA, FCF yield, and P/S. Higher = more expensive relative to earnings and cash flow.
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--sct-muted)' }}>
            Quality Score
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            Revenue growth, operating margin, and balance sheet strength. Higher = better business fundamentals.
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--sct-muted)' }}>
            Quadrant
          </p>
          <div className="space-y-1 text-xs" style={{ color: 'var(--sct-muted)' }}>
            <p><span style={{ color: '#35D07F' }}>Opportunity</span> — cheap + quality</p>
            <p><span style={{ color: '#E6B450' }}>Value Trap</span> — cheap + weak</p>
            <p><span style={{ color: '#3B82F6' }}>Great Business · Wait</span> — expensive + quality</p>
            <p><span style={{ color: '#FF5C5C' }}>Avoid</span> — expensive + weak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
