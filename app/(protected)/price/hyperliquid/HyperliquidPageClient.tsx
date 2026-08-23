"use client";

import { useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { useApiData } from '@/lib/hooks/useApiData';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import type { HyperliquidData, HlFundingPoint, HlPricePoint } from '@/lib/api/hyperliquid';

const MARKETS = ['BTC', 'ETH'] as const;
const WINDOWS = [
  { label: '7D',  days: 7  },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

function fmtUSD(v: number, digits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: digits,
  }).format(v);
}

function fmtBig(v: number): string {
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return fmtUSD(v);
}

function fmtPct(v: number, dp = 2): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(dp)}%`;
}

function fmtDay(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// Funding is the interesting series here, so it drives the shape: positive means
// longs are paying to hold, negative means shorts are. Zero is the sign flip that
// matters, which is why the axis is not auto-scaled away from it.
function FundingTip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: number;
}) {
  if (!active || !payload?.length || label == null) return null;
  const apr   = payload.find((p) => p.dataKey === 'apr')?.value;
  const close = payload.find((p) => p.dataKey === 'close')?.value;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs font-mono"
      style={{ backgroundColor: '#0C1117', borderColor: '#1E293B' }}>
      <p style={{ color: '#4B5563' }}>
        {new Date(label).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', timeZone: 'UTC',
        })} UTC
      </p>
      {apr != null && (
        <p className="mt-1" style={{ color: apr >= 0 ? 'var(--sct-green)' : 'var(--sct-red)' }}>
          Funding <span className="font-bold">{fmtPct(apr)} APR</span>
        </p>
      )}
      {close != null && (
        <p style={{ color: '#F7931A' }}>
          Mark <span className="font-bold">{fmtUSD(close)}</span>
        </p>
      )}
    </div>
  );
}

type Merged = { ts: number; apr: number | null; close: number | null };

/** Funding is hourly and candles are hourly, but they do not always land on the
 *  same timestamps, so the price line is joined on the nearest earlier candle
 *  rather than by index. Joining by index silently shears the two series apart
 *  whenever one has a gap. */
function merge(funding: HlFundingPoint[], price: HlPricePoint[]): Merged[] {
  if (!funding.length) return [];
  const sorted = [...price].sort((a, b) => a.ts - b.ts);
  let i = 0;
  return funding.map((f) => {
    while (i + 1 < sorted.length && sorted[i + 1].ts <= f.ts) i++;
    const near = sorted[i];
    const close = near && Math.abs(near.ts - f.ts) <= 6 * 3_600_000 ? near.close : null;
    return { ts: f.ts, apr: f.apr, close };
  });
}

export function HyperliquidPositioning() {
  const [coin, setCoin] = useState<(typeof MARKETS)[number]>('BTC');
  const [days, setDays] = useState(30);

  const { data, loading, error } = useApiData<HyperliquidData>(
    `/api/hyperliquid?coin=${coin}&days=${days}`,
  );

  const snap   = data?.snapshot;
  const merged = data ? merge(data.funding, data.price) : [];
  const aprs   = merged.map((m) => m.apr).filter((v): v is number => v != null);
  const aprMin = aprs.length ? Math.min(0, Math.min(...aprs)) : 0;
  const aprMax = aprs.length ? Math.max(0, Math.max(...aprs)) : 0;
  const pad    = Math.max((aprMax - aprMin) * 0.1, 1);

  const btn = (active: boolean) => ({
    borderColor: active ? 'var(--sct-btc)' : 'var(--sct-border)',
    color:       active ? 'var(--sct-btc)' : 'var(--sct-muted)',
    backgroundColor: active ? 'rgba(247,147,26,0.08)' : 'transparent',
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl border p-3 flex flex-wrap items-center gap-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
            Market
          </span>
          {MARKETS.map((m) => (
            <button key={m} onClick={() => setCoin(m)}
              className="rounded-md border px-2.5 py-1 text-xs font-mono transition-colors"
              style={btn(coin === m)}>
              {m}
            </button>
          ))}
          <span className="text-xs font-mono ml-1" style={{ color: 'var(--sct-muted)' }}>
            · Hyperliquid perp
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
            Window
          </span>
          {WINDOWS.map((w) => (
            <button key={w.label} onClick={() => setDays(w.days)}
              className="rounded-md border px-2.5 py-1 text-xs font-mono transition-colors"
              style={btn(days === w.days)}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-sm"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-red)', color: 'var(--sct-red)' }}>
          {error}
          <span className="block text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
            Hyperliquid may be rate limiting or briefly unavailable. The figures below refresh on reload.
          </span>
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Mark Price"
          value={loading || !snap ? '…' : fmtUSD(snap.markPx)}
          sub={loading || !snap ? '' : `${fmtPct(snap.change24hPct)} 24h`}
          trend={snap ? (snap.change24hPct >= 0 ? 'up' : 'down') : undefined}
          accent="var(--sct-btc)"
          freshness="live"
          source="Hyperliquid"
        />
        <StatCard
          label="Open Interest"
          value={loading || !snap ? '…' : fmtBig(snap.openInterestUsd)}
          sub={loading || !snap ? '' : `${snap.openInterest.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${coin}`}
          accent="#5B84FF"
          freshness="live"
          source="Hyperliquid"
        />
        <StatCard
          label="Funding APR"
          value={loading || !snap ? '…' : fmtPct(snap.fundingApr)}
          sub={loading || !snap ? '' : snap.fundingApr >= 0 ? 'Positive · longs pay' : 'Negative · shorts pay'}
          trend={snap ? (snap.fundingApr >= 0 ? 'up' : 'down') : undefined}
          accent={snap && snap.fundingApr < 0 ? 'var(--sct-red)' : 'var(--sct-green)'}
          freshness="live"
          source="Hyperliquid"
        />
        <StatCard
          label="Funding (hourly)"
          value={loading || !snap ? '…' : `${(snap.fundingHourly * 100).toFixed(4)}%`}
          sub="Charged every hour"
          accent="#A78BFA"
          freshness="live"
          source="Hyperliquid"
        />
        <StatCard
          label="24h Volume"
          value={loading || !snap ? '…' : fmtBig(snap.dayNtlVlm)}
          sub="Notional traded"
          accent="#E6B450"
          freshness="live"
          source="Hyperliquid"
        />
        <StatCard
          label="Mark vs Oracle"
          value={loading || !snap || snap.premiumPct == null ? '—' : fmtPct(snap.premiumPct, 4)}
          sub={loading || !snap ? '' : `Oracle ${fmtUSD(snap.oraclePx)}`}
          accent="#35D07F"
          freshness="live"
          source="Hyperliquid"
        />
      </div>

      {/* Funding vs price */}
      <div className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
              Funding Rate (APR) vs Mark Price
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
              Green above zero: longs paying shorts, the usual state in an uptrend.
              Red below zero: shorts paying longs, which has marked local capitulation.
            </p>
          </div>
        </div>

        {loading ? <ChartSkeleton /> : merged.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-sm" style={{ color: 'var(--sct-muted)' }}>
            No funding history returned for this window.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={merged} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="hl-fund-pos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#35D07F" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#35D07F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1E293B" strokeOpacity={0.6} />
              <XAxis
                dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
                tickFormatter={fmtDay}
                tick={{ fill: '#4B5563', fontSize: 10 }}
                tickLine={false} axisLine={{ stroke: '#1E293B' }}
                minTickGap={60}
              />
              <YAxis
                yAxisId="apr" domain={[aprMin - pad, aprMax + pad]}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                tick={{ fill: '#4B5563', fontSize: 10 }}
                tickLine={false} axisLine={false} width={52}
              />
              <YAxis
                yAxisId="px" orientation="right" domain={['auto', 'auto']}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                tick={{ fill: '#4B5563', fontSize: 10 }}
                tickLine={false} axisLine={false} width={54}
              />
              <Tooltip content={<FundingTip />} cursor={{ stroke: '#1E293B', strokeWidth: 1 }} />
              <ReferenceLine yAxisId="apr" y={0} stroke="#475569" strokeDasharray="3 3" />
              <Area
                yAxisId="apr" type="monotone" dataKey="apr"
                stroke="#35D07F" strokeWidth={1.5} fill="url(#hl-fund-pos)"
                dot={false} isAnimationActive={false} connectNulls
              />
              <Line
                yAxisId="px" type="monotone" dataKey="close"
                stroke="#F7931A" strokeWidth={1.5} dot={false}
                isAnimationActive={false} connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <div className="flex items-center gap-4 mt-3 text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 14, height: 2, backgroundColor: '#35D07F', display: 'inline-block' }} />
            Funding APR
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 14, height: 2, backgroundColor: '#F7931A', display: 'inline-block' }} />
            Mark price
          </span>
          {data && (
            <span className="ml-auto">
              {merged.length} hourly points · fetched {new Date(data.fetchedAt).toLocaleTimeString('en-US')}
            </span>
          )}
        </div>
      </div>

      {/* The honest bit */}
      <div className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p className="text-xs font-semibold tracking-wider uppercase mb-2" style={{ color: 'var(--sct-muted)' }}>
          Not shown yet
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          Liquidation levels, entry-price distribution and a largest-positions table are not
          on this page. Hyperliquid does publish enough to build them: every public trade
          names both counterparties, and an account&apos;s entry price, liquidation price and
          leverage are readable per address. Assembling that means continuously crawling
          accounts and storing the results, which Skyline does not do today.
        </p>
        <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--sct-muted)' }}>
          Actual liquidation events, and any history from before such a crawl began, exist
          only in Hyperliquid&apos;s node-data archive. Until that work is done, this page reports
          what a single request returns: price, open interest, funding and volume. Nothing
          here is inferred from a model.
        </p>
      </div>
    </div>
  );
}
