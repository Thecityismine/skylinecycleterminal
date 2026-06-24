"use client";

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EquityChart } from '@/components/charts/EquityChart';
import type { EquityData } from '@/lib/indicators/equityScore';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { EquityShareModal } from '@/components/share/EquityShareModal';
import type { EquitySharePayload } from '@/components/share/EquityShareCard';

type EquityResponse = EquityData & { fundamentalsAvailable?: boolean };

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmt(v: number | null, decimals = 2, suffix = ''): string {
  if (v == null) return '—';
  return `${v.toFixed(decimals)}${suffix}`;
}
function fmtX(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}x`;
}
function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${(v * 100).toFixed(1)}%`;
}
function fmtPctChange(v: number | null): string {
  if (v == null) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(2)}%`;
}
function fmtPrice(v: number | null, currency?: string | null): string {
  if (v == null) return '—';
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  if (v >= 1000) return `${sym}${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${sym}${v.toFixed(2)}`;
}
function fmtBig(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toFixed(0)}`;
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

function QuadrantMatrix({ quadrant, color }: { quadrant: string; color: string }) {
  const cells = [
    { key: 'value_trap',       label: 'Value Trap',          q: 'cheap / weak',     c: '#E6B450', qx: 0, qy: 1 },
    { key: 'opportunity',      label: 'Opportunity',         q: 'cheap / quality',  c: '#35D07F', qx: 1, qy: 1 },
    { key: 'avoid',            label: 'Avoid',               q: 'expensive / weak', c: '#FF5C5C', qx: 0, qy: 0 },
    { key: 'expensive_quality',label: 'Great Business · Wait', q: 'expensive / quality', c: '#3B82F6', qx: 1, qy: 0 },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>← Cheap · Expensive →</p>
        <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>Valuation</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {cells.map((c) => {
          const active = c.key === quadrant;
          return (
            <div key={c.key}
              className="rounded-lg border p-2.5 space-y-1 transition-all"
              style={{
                borderColor:       active ? c.c : 'var(--sct-border)',
                backgroundColor:   active ? c.c + '18' : 'var(--sct-panel)',
                borderWidth:       active ? 2 : 1,
              }}>
              <p className="text-xs font-semibold" style={{ color: active ? c.c : 'var(--sct-muted)' }}>{c.label}</p>
              <p className="text-[9px]" style={{ color: 'var(--sct-muted)' }}>{c.q}</p>
              {active && (
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.c }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-col items-start gap-0.5 mt-1">
        <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>↑ Quality ↓</p>
      </div>
    </div>
  );
}

// ── Ranges ────────────────────────────────────────────────────────────────────

const RANGES = [
  { label: '1Y',  ms: 365 * 86400_000 },
  { label: '3Y',  ms: 3 * 365 * 86400_000 },
  { label: '5Y',  ms: 5 * 365 * 86400_000 },
  { label: '10Y', ms: 10 * 365 * 86400_000 },
  { label: 'All', ms: 0 },
] as const;

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EquityDetailPage() {
  const params   = useParams<{ ticker: string }>();
  const ticker   = (params.ticker ?? '').toUpperCase();
  const [rangeIdx, setRangeIdx] = useState(4);
  const [log, setLog] = useState(true);

  const { data, loading, error } = useApiData<EquityResponse>(`/api/equities/${ticker}`);
  const fundamentalsAvailable = data?.fundamentalsAvailable ?? true;

  const startTs = useMemo(() => {
    const r = RANGES[rangeIdx];
    return r.ms === 0 ? 0 : Date.now() - r.ms;
  }, [rangeIdx]);

  const color    = data?.color ?? '#A9B4C0';
  const fund     = data?.fundamentals;
  const trend    = data?.trend;
  const val      = data?.valuation;
  const quality  = data?.quality;
  const scores   = data?.scores;
  const currency = fund?.currency;

  const change1dColor = (fund?.change1d ?? 0) >= 0 ? '#35D07F' : '#FF5C5C';

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Back link */}
      <Link href="/equities" className="inline-flex items-center gap-1.5 text-xs transition-colors"
        style={{ color: 'var(--sct-muted)' }}>
        <ArrowLeft size={12} />
        Equity Terminal
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: color + '20', color }}>
              {ticker.slice(0, 2)}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--sct-text)' }}>
                {loading ? '…' : (fund?.name ?? ticker)}
              </h1>
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                {ticker} · {data?.sector ?? '—'} · {data?.type === 'etf' ? 'ETF' : data?.type === 'preferred' ? 'Preferred Share' : data?.type === 'btc_proxy' ? 'BTC Proxy' : 'Equity'}
              </p>
            </div>
          </div>
        </div>
        {fund && (
          <div className="text-right">
            <p className="text-3xl font-mono font-bold" style={{ color }}>
              {fmtPrice(fund.price, currency)}
            </p>
            <p className="text-sm font-mono" style={{ color: change1dColor }}>
              {fmtPctChange(fund.change1d)} today
            </p>
          </div>
        )}
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="50W SMA"        value={fmtPrice(trend?.ma50w ?? null, currency)}
          sub={trend?.priceVs50w != null ? `${fmtX(trend.priceVs50w)} of trend` : undefined}
          color="#D4A853" />
        <StatCard label="200W SMA"       value={fmtPrice(trend?.ma200w ?? null, currency)}
          sub={trend?.priceVs200w != null ? `${fmtX(trend.priceVs200w)} of trend` : undefined}
          color="#5B7DD8" />
        <StatCard label="ATH"            value={fmtPrice(trend?.ath ?? null, currency)}
          sub={trend?.drawdownFromAth != null ? `${(trend.drawdownFromAth * 100).toFixed(1)}% from ATH` : undefined}
          color={trend?.drawdownFromAth != null && trend.drawdownFromAth > -0.05 ? '#35D07F' : '#FF5C5C'} />
        <StatCard label="52W High"       value={fmtPrice(trend?.high52w ?? null, currency)}
          sub={trend?.pctFrom52wHigh != null ? `${(trend.pctFrom52wHigh * 100).toFixed(1)}%` : undefined} />
        <StatCard label="52W Low"        value={fmtPrice(trend?.low52w ?? null, currency)}
          sub={trend?.pctFrom52wLow != null ? `+${(trend.pctFrom52wLow * 100).toFixed(1)}%` : undefined} />
        <StatCard label="Market Cap"     value={fmtBig(fund?.marketCap ?? null)} />
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
            {data && (
              <EquityShareModal payload={{
                ticker:     ticker,
                name:       data.fundamentals.name ?? ticker,
                sector:     data.sector,
                type:       data.type,
                color:      color,
                points:     data.points,
                segments:   data.segments,
                price:      data.fundamentals.price ?? null,
                change1d:   data.fundamentals.change1d ?? null,
                currency:   data.fundamentals.currency ?? null,
                trend:      data.trend,
                scores:     data.scores,
                logScale:   log,
                startTs:    startTs,
                generatedAt: new Date().toISOString(),
              } satisfies EquitySharePayload} />
            )}
          </div>
        </div>
        <div style={{ height: 420 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading {ticker}…</p>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center flex-col gap-2" style={{ color: '#FF5C5C' }}>
              <p className="text-sm font-semibold">Price data unavailable</p>
              <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
                Yahoo Finance may be temporarily unavailable. Try again in a moment.
              </p>
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

      {/* Fundamentals unavailable banner */}
      {data && !fundamentalsAvailable && (
        <div className="rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: '#E6B45012', borderColor: '#E6B45060' }}>
          <AlertTriangle size={14} className="shrink-0" style={{ color: '#E6B450' }} />
          <p className="text-xs" style={{ color: '#E6B450' }}>
            Fundamental data (P/E, margins, FCF) could not be retrieved from Yahoo Finance right now.
            The chart and trend metrics are still fully functional. Valuation and quality panels show estimated scores only.
          </p>
        </div>
      )}

      {/* Scores + detailed panels */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── Trend / Technical ── */}
        <div className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
              Trend · Technical
            </p>
            {scores && (
              <ScoreRing score={scores.trend} label="Trend" color={scores.trend < 45 ? '#35D07F' : scores.trend < 70 ? '#E6B450' : '#FF5C5C'} />
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
            style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}>
            <p className="font-semibold" style={{ color: scores?.trend != null && scores.trend < 45 ? '#35D07F' : scores?.trend != null && scores.trend < 70 ? '#E6B450' : '#FF5C5C' }}>
              {scores?.trendLabel ?? '—'}
            </p>
            <p style={{ color: 'var(--sct-muted)' }}>
              {trend?.vs200wPct != null
                ? `Price is at the ${trend.vs200wPct}th percentile of its historical 200W MA ratio.`
                : 'Loading trend data…'}
            </p>
          </div>
        </div>

        {/* ── Valuation ── */}
        <div className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
              Valuation
            </p>
            {scores && data?.type !== 'etf' && data?.type !== 'preferred' && (
              <ScoreRing score={scores.valuation} label="Valuation"
                color={scores.valuation < 45 ? '#35D07F' : scores.valuation < 70 ? '#E6B450' : '#FF5C5C'} />
            )}
          </div>

          {data?.type === 'etf' || data?.type === 'preferred' ? (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              {data?.type === 'preferred' ? 'Preferred share — income instrument; fundamental valuation metrics are not applicable.' : 'ETF — fundamental valuation metrics are not applicable.'}
            </p>
          ) : (
            <div>
              <MetricRow label="Forward P/E"
                value={fmt(val?.forwardPE ?? null)}
                sub="price ÷ next-year EPS"
                pct={val?.pePct ?? null}
              />
              <MetricRow label="Trailing P/E"
                value={fmt(val?.trailingPE ?? null)}
                sub="price ÷ last-12m EPS"
              />
              <MetricRow label="EV / EBITDA"
                value={fmtX(val?.evToEbitda ?? null)}
                sub="enterprise value to earnings"
                pct={val?.evEbitdaPct ?? null}
              />
              <MetricRow label="FCF Yield"
                value={val?.fcfYield != null ? `${val.fcfYield.toFixed(2)}%` : '—'}
                sub="free cash flow ÷ market cap"
                pct={val?.fcfYieldPct ?? null}
              />
              <MetricRow label="Price / Sales"
                value={fmtX(val?.priceToSales ?? null)}
                sub="trailing 12M revenue"
                pct={val?.psPct ?? null}
              />
              <MetricRow label="Price / Book"
                value={fmtX(val?.priceToBook ?? null)} />
              <MetricRow label="PEG Ratio"
                value={fmt(val?.pegRatio ?? null)}
                sub="P/E ÷ growth rate" />
            </div>
          )}

          {scores && data?.type !== 'etf' && data?.type !== 'preferred' && (
            <div className="rounded-lg p-3 text-xs space-y-1"
              style={{ backgroundColor: 'var(--sct-panel)' }}>
              <p className="font-semibold"
                style={{ color: scores.valuation < 45 ? '#35D07F' : scores.valuation < 70 ? '#E6B450' : '#FF5C5C' }}>
                {scores.valuationLabel}
              </p>
              <p style={{ color: 'var(--sct-muted)' }}>
                Percentile bars show expensiveness vs broad market. Lower bars = cheaper.
              </p>
            </div>
          )}
        </div>

        {/* ── Quality ── */}
        <div className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
              Business Quality
            </p>
            {scores && data?.type !== 'etf' && data?.type !== 'preferred' && (
              <ScoreRing score={scores.quality} label="Quality"
                color={scores.quality >= 65 ? '#35D07F' : scores.quality >= 45 ? '#E6B450' : '#FF5C5C'} />
            )}
          </div>

          {data?.type === 'etf' || data?.type === 'preferred' ? (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              {data?.type === 'preferred' ? 'Preferred share — business quality metrics are not applicable.' : 'ETF — business quality metrics are not applicable.'}
            </p>
          ) : (
            <div>
              <MetricRow label="Revenue Growth (YoY)"
                value={fmtPct(quality?.revenueGrowth ?? null)}
                color={quality?.revenueGrowth != null && quality.revenueGrowth > 0.10 ? '#35D07F' : 'var(--sct-muted)'}
              />
              <MetricRow label="Earnings Growth (YoY)"
                value={fmtPct(quality?.earningsGrowth ?? null)}
                color={quality?.earningsGrowth != null && quality.earningsGrowth > 0.10 ? '#35D07F' : 'var(--sct-muted)'}
              />
              <MetricRow label="Gross Margin"
                value={fmtPct(quality?.grossMargin ?? null)}
                color={quality?.grossMargin != null && quality.grossMargin > 0.40 ? '#35D07F' : 'var(--sct-muted)'}
              />
              <MetricRow label="Operating Margin"
                value={fmtPct(quality?.operatingMargin ?? null)}
                color={quality?.operatingMargin != null && quality.operatingMargin > 0.15 ? '#35D07F' : quality?.operatingMargin != null && quality.operatingMargin > 0 ? '#E6B450' : '#FF5C5C'}
              />
              <MetricRow label="Net Profit Margin"
                value={fmtPct(quality?.profitMargin ?? null)}
              />
              <MetricRow label="Return on Equity"
                value={fmtPct(quality?.returnOnEquity ?? null)}
                color={quality?.returnOnEquity != null && quality.returnOnEquity > 0.15 ? '#35D07F' : 'var(--sct-muted)'}
              />
              <MetricRow label="Net Debt / FCF"
                value={fmt(quality?.debtToFcf ?? null, 1, 'x')}
                sub={quality?.netDebt != null ? (quality.netDebt < 0 ? 'net cash position' : `${fmtBig(quality.netDebt)} net debt`) : undefined}
                color={quality?.netDebt != null && quality.netDebt < 0 ? '#35D07F' : 'var(--sct-muted)'}
              />
            </div>
          )}

          {scores && data?.type !== 'etf' && data?.type !== 'preferred' && (
            <div className="rounded-lg p-3 text-xs space-y-1"
              style={{ backgroundColor: 'var(--sct-panel)' }}>
              <p className="font-semibold"
                style={{ color: scores.quality >= 65 ? '#35D07F' : scores.quality >= 45 ? '#E6B450' : '#FF5C5C' }}>
                {scores.qualityLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Quadrant matrix + final read */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* 4-box matrix */}
        {data?.type !== 'etf' && data?.type !== 'preferred' && (
          <div className="rounded-xl border p-5 space-y-4"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
              Valuation × Quality Matrix
            </p>
            {scores ? (
              <QuadrantMatrix quadrant={scores.quadrant} color={scores.quadrantColor} />
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {[0,1,2,3].map((i) => (
                  <div key={i} className="h-20 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--sct-border)' }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Final read / interpretation */}
        <div className="rounded-xl border p-5 space-y-4"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor:     scores?.quadrantColor ?? 'var(--sct-border)',
            borderLeftWidth: 4,
          }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Terminal Read
          </p>
          {scores ? (
            <div className="space-y-3">
              <p className="text-base font-bold" style={{ color: scores.quadrantColor }}>{scores.quadrantLabel}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>{scores.summary}</p>

              {/* Score summary row */}
              <div className="flex gap-4 pt-1">
                <div className="text-center">
                  <p className="text-xl font-mono font-bold" style={{ color: scores.trend < 45 ? '#35D07F' : scores.trend < 70 ? '#E6B450' : '#FF5C5C' }}>{scores.trend}</p>
                  <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>Trend</p>
                </div>
                {data?.type !== 'etf' && data?.type !== 'preferred' && (
                  <>
                    <div className="text-center">
                      <p className="text-xl font-mono font-bold" style={{ color: scores.valuation < 45 ? '#35D07F' : scores.valuation < 70 ? '#E6B450' : '#FF5C5C' }}>{scores.valuation}</p>
                      <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>Valuation</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-mono font-bold" style={{ color: scores.quality >= 65 ? '#35D07F' : scores.quality >= 45 ? '#E6B450' : '#FF5C5C' }}>{scores.quality}</p>
                      <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>Quality</p>
                    </div>
                  </>
                )}
              </div>

              {fund?.targetMeanPrice && fund.price && (
                <div className="rounded-lg border p-3 space-y-1"
                  style={{ borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-panel)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
                    Analyst Consensus
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
                      {fmtPrice(fund.targetMeanPrice, currency)} target
                    </p>
                    <p className="text-xs font-mono"
                      style={{ color: fund.targetMeanPrice > fund.price ? '#35D07F' : '#FF5C5C' }}>
                      {fmtPctChange(((fund.targetMeanPrice - fund.price) / fund.price) * 100)} upside
                    </p>
                  </div>
                  {fund.recommendation && (
                    <p className="text-[10px] capitalize" style={{ color: 'var(--sct-muted)' }}>
                      Consensus: {fund.recommendation.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {[0,1,2].map((i) => (
                <div key={i} className={`h-4 rounded animate-pulse w-${['full','3/4','1/2'][i]}`}
                  style={{ backgroundColor: 'var(--sct-border)' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disclosure */}
      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
        Data sourced from Yahoo Finance. Valuation percentile scores are estimated based on general market ranges, not individual stock history. Scores are informational tools — not buy or sell recommendations. Always combine with your own research.
      </p>
    </div>
  );
}
