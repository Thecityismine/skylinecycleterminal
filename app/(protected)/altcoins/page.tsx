"use client";

import Link from 'next/link';
import { useState } from 'react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ALTCOIN_WATCHLIST, ALTCOIN_GROUP_LABELS, ALTCOIN_GROUP_ORDER } from '@/lib/data/altcoinWatchlist';
import { useApiData } from '@/lib/hooks/useApiData';
import type { AltcoinData } from '@/lib/indicators/altcoinScore';

type AltcoinResponse = AltcoinData & { snapshotAvailable?: boolean };

function fmtPrice(v: number | null) {
  if (v == null) return '—';
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (v >= 1)    return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

function fmtPct(v: number | null) {
  if (v == null) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(2)}%`;
}

function trendColor(score: number) {
  return score < 45 ? '#35D07F' : score < 70 ? '#E6B450' : '#FF5C5C';
}

function AltcoinCard({ id, symbol, color }: { id: string; symbol: string; color: string }) {
  const { data, loading } = useApiData<AltcoinResponse>(`/api/altcoins/${id}`);

  const price     = data?.snapshot.price ?? null;
  const change24h = data?.snapshot.change24h ?? null;
  const scores    = data?.scores;
  const positive  = change24h != null && change24h >= 0;

  return (
    <Link href={`/altcoins/${id}`}
      className="block rounded-xl border p-4 space-y-3 transition-all duration-150 hover:border-opacity-80 hover:scale-[1.01]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ backgroundColor: color + '20', color }}>
            {symbol.slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--sct-text)' }}>{symbol}</p>
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
                {fmtPrice(price)}
              </p>
              <p className="text-[10px] font-mono" style={{ color: positive ? '#35D07F' : '#FF5C5C' }}>
                {fmtPct(change24h)}
              </p>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-4 w-24 rounded animate-pulse" style={{ backgroundColor: 'var(--sct-border)' }} />
      ) : scores ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{ backgroundColor: trendColor(scores.trend) + '20', color: trendColor(scores.trend) }}>
            Trend: {scores.trendLabel}
          </span>
        </div>
      ) : (
        <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>Error loading data</p>
      )}

      {data?.trend.ma200w && data?.trend.priceVs200w && (
        <div className="space-y-0.5">
          <div className="flex justify-between text-[9px]" style={{ color: 'var(--sct-muted)' }}>
            <span>vs 200W MA</span>
            <span className="font-mono">{data.trend.priceVs200w.toFixed(2)}x</span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, data.trend.vs200wPct ?? 50)}%`,
                backgroundColor: trendColor(data.trend.vs200wPct ?? 50),
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

export default function AltcoinsPage() {
  const [filter, setFilter] = useState<string>('all');
  const groups = ['all', ...ALTCOIN_GROUP_ORDER];
  const filtered = filter === 'all' ? ALTCOIN_WATCHLIST : ALTCOIN_WATCHLIST.filter((c) => c.group === filter);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Altcoin Terminal"
        subtitle="Weekly trend analysis for the largest altcoins by market cap"
      />

      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <button key={g} onClick={() => setFilter(g)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={{
              backgroundColor: filter === g ? 'var(--sct-secondary)' : 'transparent',
              borderColor:     filter === g ? 'var(--sct-secondary)' : 'var(--sct-border)',
              color:           filter === g ? '#000' : 'var(--sct-muted)',
            }}>
            {g === 'all' ? 'All' : ALTCOIN_GROUP_LABELS[g as keyof typeof ALTCOIN_GROUP_LABELS]}
          </button>
        ))}
      </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((c) => (
          <AltcoinCard key={c.id} id={c.id} symbol={c.symbol} color={c.color} />
        ))}
      </div>

      <div className="rounded-xl border p-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--sct-muted)' }}>
          Trend Score
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          Percentile of price vs 50W and 200W MAs vs the coin&apos;s own history, plus drawdown from all-time high.
          Higher = more extended above trend. Valuation and business-quality metrics (used on the Equity Terminal)
          don&apos;t apply to tokens and are not scored here.
        </p>
      </div>
    </div>
  );
}
