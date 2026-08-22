"use client";

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { EquityChart } from '@/components/charts/EquityChart';
import type { AltcoinData } from '@/lib/indicators/altcoinScore';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

type AltcoinResponse = AltcoinData & { snapshotAvailable?: boolean };

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtX(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}x`;
}
function fmtPctChange(v: number | null): string {
  if (v == null) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(2)}%`;
}
function fmtPrice(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (v >= 1)    return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}
function fmtBig(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
}
function fmtSupply(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border p-4 space-y-1"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>{label}</p>
      <p className="text-xl font-mono font-bold" style={{ color: color ?? 'var(--sct-text)' }}>{value}</p>
      {sub && <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>{sub}</p>}
    </div>
  );
}

function MetricRow({ label, value, sub, pct, color }: { label: string; value: string; sub?: string; pct?: number | null; color?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b last:border-0"
      style={{ borderColor: 'var(--sct-border)' }}>
      <div>
        <p className="text-xs" style={{ color: 'var(--sct-secondary)' }}>{label}</p>
        {sub && <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>{sub}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-mono font-semibold" style={{ color: color ?? 'var(--sct-text)' }}>{value}</p>
        {pct != null && (
          <div className="flex items-center gap-1 justify-end mt-0.5">
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
              <div className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: pct < 40 ? '#35D07F' : pct < 70 ? '#E6B450' : '#FF5C5C' }} />
            </div>
            <span className="text-[9px] font-mono" style={{ color: 'var(--sct-muted)' }}>{pct}th</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 28, circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-mono font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <p className="text-[10px] text-center leading-tight" style={{ color: 'var(--sct-muted)' }}>{label}</p>
    </div>
  );
}

// ── Ranges ────────────────────────────────────────────────────────────────────

const RANGES = [
  { label: '1Y',  ms: 365 * 86400_000 },
  { label: '3Y',  ms: 3 * 365 * 86400_000 },
  { label: '5Y',  ms: 5 * 365 * 86400_000 },
  { label: 'All', ms: 0 },
] as const;

function trendColor(score: number) {
  return score < 45 ? '#35D07F' : score < 70 ? '#E6B450' : '#FF5C5C';
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AltcoinDetailPage() {
  const params = useParams<{ id: string }>();
  const id     = params.id ?? '';
  const [rangeIdx, setRangeIdx] = useState(3);
  const [log, setLog] = useState(true);

  const { data, loading, error, status } = useApiData<AltcoinResponse>(`/api/altcoins/${id}`);
  const notFound = status === 404;
  const snapshotAvailable = data?.snapshotAvailable ?? true;

  const startTs = useMemo(() => {
    const r = RANGES[rangeIdx];
    return r.ms === 0 ? 0 : Date.now() - r.ms;
  }, [rangeIdx]);

  const color = data?.color ?? '#A9B4C0';
  const snap  = data?.snapshot;
  const trend = data?.trend;
  const scores = data?.scores;

  const change24hColor = (snap?.change24h ?? 0) >= 0 ? '#35D07F' : '#FF5C5C';

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <Link href="/altcoins" className="inline-flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: 'var(--sct-muted)' }}>
        <ArrowLeft size={12} />
        Altcoin Terminal
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: color + '20', color }}>
              {(data?.symbol ?? id).slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--sct-text)' }}>
                {loading ? '…' : (snap?.name ?? data?.name ?? id)}
              </h1>
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                {data?.symbol ?? id.toUpperCase()} · {data?.sector ?? '—'}
                {snap?.marketCapRank ? ` · Rank #${snap.marketCapRank}` : ''}
              </p>
            </div>
          </div>
        </div>
        {snap && (
          <div className="text-right">
            <p className="text-3xl font-mono font-bold" style={{ color }}>
              {fmtPrice(snap.price)}
            </p>
            <p className="text-sm font-mono" style={{ color: change24hColor }}>
              {fmtPctChange(snap.change24h)} today
            </p>
          </div>
        )}
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="50W SMA"  value={fmtPrice(trend?.ma50w ?? null)}
          sub={trend?.priceVs50w != null ? `${fmtX(trend.priceVs50w)} of trend` : undefined}
          color="#D4A853" />
        <StatCard label="200W SMA" value={fmtPrice(trend?.ma200w ?? null)}
          sub={trend?.priceVs200w != null ? `${fmtX(trend.priceVs200w)} of trend` : undefined}
          color="#5B7DD8" />
        <StatCard label="ATH" value={fmtPrice(trend?.ath ?? null)}
          sub={trend?.drawdownFromAth != null ? `${(trend.drawdownFromAth * 100).toFixed(1)}% from ATH` : undefined}
          color={trend?.drawdownFromAth != null && trend.drawdownFromAth > -0.05 ? '#35D07F' : '#FF5C5C'} />
        <StatCard label="52W High" value={fmtPrice(trend?.high52w ?? null)}
          sub={trend?.pctFrom52wHigh != null ? `${(trend.pctFrom52wHigh * 100).toFixed(1)}%` : undefined} />
        <StatCard label="52W Low" value={fmtPrice(trend?.low52w ?? null)}
          sub={trend?.pctFrom52wLow != null ? `+${(trend.pctFrom52wLow * 100).toFixed(1)}%` : undefined} />
        <StatCard label="Market Cap" value={fmtBig(snap?.marketCap ?? null)} />
      </div>

      {/* Main chart */}
      <div className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--sct-text)' }}>
              Weekly Price
            </p>
            {[
              { color, label: 'Price' },
              { color: '#D4A853', label: '50W SMA' },
              { color: '#5B7DD8', label: '200W SMA' },
            ].map(({ color: c, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: 'var(--sct-muted)' }}>
                <span className="w-4 h-0.5 inline-block shrink-0" style={{ backgroundColor: c }} />
                {label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {RANGES.map((r, i) => (
                <button key={r.label} onClick={() => setRangeIdx(i)}
                  className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: rangeIdx === i ? 'var(--sct-secondary)' : 'transparent',
                    borderColor:     rangeIdx === i ? 'var(--sct-secondary)' : 'var(--sct-border)',
                    color:           rangeIdx === i ? '#000' : 'var(--sct-muted)',
                  }}>
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={() => setLog((p) => !p)}
              className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
              style={{
                backgroundColor: log ? 'var(--sct-secondary)' : 'transparent',
                borderColor:     log ? 'var(--sct-secondary)' : 'var(--sct-border)',
                color:           log ? '#000' : 'var(--sct-muted)',
              }}>
              Log
            </button>
          </div>
        </div>
        <div style={{ height: 420 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading {id}…</p>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center flex-col gap-2" style={{ color: '#FF5C5C' }}>
              <p className="text-sm font-semibold">
                {notFound ? `No coin named "${id}"` : 'Price data unavailable'}
              </p>
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                {notFound
                  ? 'Check the spelling, or pick one from the altcoin list.'
                  : 'CoinGecko may be temporarily unavailable. Try again in a moment.'}
              </p>
              {notFound && (
                <Link href="/altcoins" className="text-xs underline" style={{ color: 'var(--sct-muted)' }}>
                  Back to altcoins
                </Link>
              )}
            </div>
          ) : data ? (
            <EquityChart
              points={data.points}
              segments={data.segments}
              ath={data.trend.ath}
              logScale={log}
              color={color}
              startTs={startTs}
            />
          ) : null}
        </div>
      </div>

      {/* Snapshot unavailable banner */}
      {data && !snapshotAvailable && (
        <div className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: '#E6B45012', borderColor: '#E6B45060' }}>
          <AlertTriangle size={14} className="shrink-0" style={{ color: '#E6B450' }} />
          <p className="text-xs" style={{ color: '#E6B450' }}>
            Live market data (price, market cap, supply) could not be retrieved from CoinGecko right now.
            The chart and trend metrics are still fully functional.
          </p>
        </div>
      )}

      {/* Trend panel + supply detail + terminal read */}
      <div className="grid lg:grid-cols-3 gap-5">

        <div className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
              Trend · Technical
            </p>
            {scores && (
              <ScoreRing score={scores.trend} label="Trend" color={trendColor(scores.trend)} />
            )}
          </div>
          <div>
            <MetricRow label="Price vs 200W MA"
              value={fmtX(trend?.priceVs200w ?? null)}
              sub="ratio to long-term trend"
              pct={trend?.vs200wPct ?? null}
            />
            <MetricRow label="Price vs 50W MA"
              value={fmtX(trend?.priceVs50w ?? null)}
              sub="ratio to mid-term trend"
              pct={trend?.vs50wPct ?? null}
            />
            <MetricRow label="Drawdown from ATH"
              value={trend?.drawdownFromAth != null ? `${(trend.drawdownFromAth * 100).toFixed(1)}%` : '—'}
              sub="current depth from all-time high"
              color={trend?.drawdownFromAth != null && trend.drawdownFromAth > -0.1 ? '#35D07F' : 'var(--sct-muted)'}
              pct={trend?.drawdownPct ?? null}
            />
            <MetricRow label="From 52W High"
              value={trend?.pctFrom52wHigh != null ? `${(trend.pctFrom52wHigh * 100).toFixed(1)}%` : '—'} />
            <MetricRow label="From 52W Low"
              value={trend?.pctFrom52wLow != null ? `+${(trend.pctFrom52wLow * 100).toFixed(1)}%` : '—'} />
          </div>
          <div className="rounded-lg p-3 text-xs space-y-1"
            style={{ backgroundColor: 'var(--sct-panel)' }}>
            <p className="font-semibold" style={{ color: scores ? trendColor(scores.trend) : 'var(--sct-muted)' }}>
              {scores?.trendLabel ?? '—'}
            </p>
            <p style={{ color: 'var(--sct-muted)' }}>
              {trend?.vs200wPct != null
                ? `Price is at the ${trend.vs200wPct}th percentile of its historical 200W MA ratio.`
                : 'Loading trend data…'}
            </p>
          </div>
        </div>

        {/* Supply / market data */}
        <div className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Supply &amp; Market Data
          </p>
          <div>
            <MetricRow label="Circulating Supply" value={fmtSupply(snap?.circulatingSupply ?? null)} />
            <MetricRow label="Total Supply"       value={fmtSupply(snap?.totalSupply ?? null)} />
            <MetricRow label="Max Supply"         value={snap?.maxSupply != null ? fmtSupply(snap.maxSupply) : 'Uncapped'} />
            <MetricRow label="24H Volume"         value={fmtBig(snap?.volume24h ?? null)} />
            <MetricRow label="All-Time High"      value={fmtPrice(snap?.athPrice ?? null)}
              sub={snap?.athDate ? new Date(snap.athDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined}
              color={snap?.athChangePct != null && snap.athChangePct > -20 ? '#35D07F' : 'var(--sct-muted)'}
            />
            <MetricRow label="From All-Time High" value={snap?.athChangePct != null ? `${snap.athChangePct.toFixed(1)}%` : '—'} />
          </div>
        </div>

        {/* Terminal read */}
        <div className="rounded-xl border p-5 space-y-4"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor:     scores ? trendColor(scores.trend) : 'var(--sct-border)',
            borderLeftWidth: 4,
          }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Terminal Read
          </p>
          {scores && trend ? (
            <div className="space-y-3">
              <p className="text-base font-bold" style={{ color: trendColor(scores.trend) }}>{scores.trendLabel}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
                {trend.priceVs200w != null
                  ? `Trading at ${fmtX(trend.priceVs200w)} its 200-week average (${trend.vs200wPct}th percentile of own history).`
                  : 'Not enough price history yet for a 200-week trend read.'}
                {' '}Valuation and business-quality scoring — used on the Equity Terminal — aren&apos;t applicable to tokens.
              </p>
              <div className="text-center pt-1">
                <p className="text-xl font-mono font-bold" style={{ color: trendColor(scores.trend) }}>{scores.trend}</p>
                <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>Trend Score</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--sct-border)' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disclosure */}
      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
        Data sourced from CoinGecko. Trend scores are informational tools based on historical price percentiles —
        not buy or sell recommendations. Always combine with your own research.
      </p>
    </div>
  );
}
