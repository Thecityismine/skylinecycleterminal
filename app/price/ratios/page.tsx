"use client";

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useApiData } from '@/lib/hooks/useApiData';
import type { RatioKey, RatioData, RatioSeries, RotationSignal } from '@/lib/api/ratios';
import { RatioChart } from '@/components/charts/RatioChart';
import { PageHeader } from '@/components/dashboard/PageHeader';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtR(v: number | null, decimals = 4): string {
  if (v == null) return '—';
  if (v >= 100) return v.toFixed(1);
  if (v >= 10)  return v.toFixed(2);
  if (v >= 1)   return v.toFixed(3);
  return v.toFixed(decimals);
}
function pctStr(v: number | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

const RANGES = ['1Y', '2Y', '4Y', 'All'] as const;
type Range = typeof RANGES[number];

function startTs(r: Range) {
  const n = Date.now();
  if (r === '1Y')  return n - 365  * 86400_000;
  if (r === '2Y')  return n - 730  * 86400_000;
  if (r === '4Y')  return n - 1461 * 86400_000;
  return 0;
}

const RATIOS: {
  key: RatioKey; label: string; color: string;
  crypto: string; index: string; desc: string;
}[] = [
  { key: 'btc_ixic', label: 'BTC / IXIC', color: '#F7931A', crypto: 'Bitcoin',  index: 'Nasdaq',  desc: 'Nasdaq index points per 1 BTC' },
  { key: 'btc_spx',  label: 'BTC / SPX',  color: '#53A7FF', crypto: 'Bitcoin',  index: 'S&P 500', desc: 'S&P 500 index points per 1 BTC' },
  { key: 'eth_ixic', label: 'ETH / IXIC', color: '#9B8CFF', crypto: 'Ethereum', index: 'Nasdaq',  desc: 'Nasdaq index points per 1 ETH' },
  { key: 'btc_eth',  label: 'BTC / ETH',  color: '#35D07F', crypto: 'Bitcoin',  index: 'ETH',     desc: 'ETH required to buy 1 BTC' },
  { key: 'eth_btc',  label: 'ETH / BTC',  color: '#A78BFA', crypto: 'Ethereum', index: 'BTC',     desc: 'BTC required to buy 1 ETH' },
];

// ─── Rotation widget ───────────────────────────────────────────────────────────

function RotationWidget({ sig }: { sig: RotationSignal }) {
  const barPct = sig.pct4yr != null ? Math.max(2, Math.min(98, sig.pct4yr)) : 50;

  // "Current" band label
  const bandLabel =
    sig.pct4yr == null ? '' :
    sig.pct4yr < 20   ? 'ETH historically cheap vs BTC' :
    sig.pct4yr < 40   ? 'ETH below average vs BTC' :
    sig.pct4yr < 60   ? 'ETH near historical average' :
    sig.pct4yr < 80   ? 'ETH above average vs BTC' :
                        'ETH historically expensive vs BTC';

  const deviationLabel = sig.deviation != null
    ? `${Math.abs(sig.deviation * 100).toFixed(1)}% ${sig.deviation < 0 ? 'below' : 'above'} 365-day MA`
    : '—';

  return (
    <div
      className="rounded-xl border p-5 space-y-5"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: sig.color }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--sct-muted)' }}>
            BTC ↔ ETH Rotation Signal
          </p>
          <p className="text-base font-bold" style={{ color: sig.color }}>{sig.label}</p>
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>ETH/BTC ratio</p>
          <p className="text-2xl font-mono font-bold" style={{ color: 'var(--sct-text)' }}>
            {sig.ethBtc != null ? sig.ethBtc.toFixed(5) : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>{deviationLabel}</p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: '365-Day MA', value: sig.ma365 != null ? sig.ma365.toFixed(5) : '—', color: 'var(--sct-text)' },
          { label: '% vs MA',   value: pctStr(sig.deviation != null ? sig.deviation * 100 : null), color: sig.color },
          { label: '4-Year %ile', value: sig.pct4yr != null ? `${sig.pct4yr.toFixed(0)}th` : '—',
            color: sig.pct4yr != null
              ? sig.pct4yr < 30  ? '#3B82F6'
              : sig.pct4yr < 70  ? 'var(--sct-muted)'
              :                    '#FF5C5C'
              : 'var(--sct-muted)' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-2.5 space-y-0.5"
            style={{ backgroundColor: 'var(--sct-panel)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>{s.label}</p>
            <p className="text-sm font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Percentile bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]" style={{ color: 'var(--sct-muted)' }}>
          <span>← ETH cheap (buy ETH)</span>
          <span>{bandLabel}</span>
          <span>(buy BTC) ETH expensive →</span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-panel)' }}>
          {/* Gradient track */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: 'linear-gradient(to right, #3B82F6 0%, #35D07F 30%, #A3A3A3 50%, #E6B450 70%, #FF5C5C 100%)' }} />
          {/* Marker */}
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow"
            style={{ left: `calc(${barPct}% - 6px)`, backgroundColor: sig.color }} />
        </div>
        <div className="flex justify-between text-[10px]" style={{ color: 'var(--sct-muted)' }}>
          <span>0th %ile</span>
          <span>50th %ile</span>
          <span>100th %ile</span>
        </div>
      </div>

      {/* Sparkline — ETH/BTC vs 365MA */}
      {sig.history.length > 0 && (
        <div style={{ height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sig.history} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']}
                tick={false} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={false} axisLine={false} tickLine={false} width={0} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded border px-2 py-1.5 text-xs"
                      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
                      <p style={{ color: 'var(--sct-muted)' }}>{new Date(d.ts).toISOString().slice(0, 10)}</p>
                      <p style={{ color: sig.color }}>ETH/BTC {d.ethBtc?.toFixed(5)}</p>
                      {d.ma365 && <p style={{ color: '#E6B450' }}>365MA {d.ma365?.toFixed(5)}</p>}
                    </div>
                  );
                }}
              />
              {/* MA line */}
              <Line type="monotone" dataKey="ma365" stroke="#E6B450" strokeWidth={1.2}
                dot={false} isAnimationActive={false} connectNulls strokeDasharray="4 3" />
              {/* ETH/BTC line */}
              <Line type="monotone" dataKey="ethBtc" stroke={sig.color} strokeWidth={1.5}
                dot={false} isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-center mt-0.5" style={{ color: 'var(--sct-muted)' }}>
            ETH/BTC (purple) vs 365-day MA (amber) — rising = ETH outperforming
          </p>
        </div>
      )}

      {/* Guide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
        {[
          { band: 'Strong ETH', cond: 'ETH/BTC > 35% below MA', color: '#3B82F6' },
          { band: 'Favor ETH',  cond: '12–35% below MA',         color: '#35D07F' },
          { band: 'Favor BTC',  cond: '12–35% above MA',         color: '#E6B450' },
          { band: 'Strong BTC', cond: 'ETH/BTC > 35% above MA',  color: '#FF5C5C' },
        ].map((g) => (
          <div key={g.band} className="flex items-start gap-1.5">
            <span className="w-2 h-2 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: g.color }} />
            <div>
              <p className="font-semibold" style={{ color: g.color }}>{g.band}</p>
              <p style={{ color: 'var(--sct-muted)' }}>{g.cond}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function RatiosPage() {
  const [active, setActive] = useState<RatioKey>('btc_ixic');
  const [range,  setRange]  = useState<Range>('All');
  const [logScale, setLog]  = useState(true);

  const { data, loading } = useApiData<RatioData>('/api/markets/ratios');

  const cfg    = RATIOS.find((r) => r.key === active)!;
  const series: RatioSeries | null = data ? data[active] : null;

  const filtered = useMemo(() => {
    if (!series) return [];
    const ts = startTs(range);
    return series.points.filter((p) => p.ts >= ts);
  }, [series, range]);

  const oneYearChange = useMemo(() => {
    if (!series || !series.current) return null;
    const ts   = Date.now() - 365 * 86400_000;
    const base = series.points.find((p) => p.ts >= ts);
    if (!base) return null;
    return ((series.current - base.value) / base.value) * 100;
  }, [series]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Crypto / Market Ratios"
        subtitle="Bitcoin & Ethereum relative strength vs. indices — plus the BTC↔ETH rotation signal"
      />

      {/* Rotation widget */}
      {data?.rotationSignal && <RotationWidget sig={data.rotationSignal} />}
      {loading && (
        <div className="rounded-xl border p-8 text-center text-sm" style={{ color: 'var(--sct-muted)', borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-card)' }}>
          Loading rotation signal…
        </div>
      )}

      {/* Ratio selector */}
      <div className="flex flex-wrap gap-2">
        {RATIOS.map((r) => (
          <button key={r.key} onClick={() => setActive(r.key)}
            className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all"
            style={{
              backgroundColor: active === r.key ? r.color      : 'transparent',
              borderColor:     active === r.key ? r.color      : 'var(--sct-border)',
              color:           active === r.key ? '#000'       : 'var(--sct-muted)',
            }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Current',    value: fmtR(series?.current ?? null),    sub: `${cfg.crypto} / ${cfg.index}`,      color: cfg.color },
          { label: 'All-Time High', value: fmtR(series?.ath ?? null),     sub: 'Ratio peak (since 2015)',           color: 'var(--sct-text)' },
          { label: '% from ATH', value: pctStr(series?.pctFromAth ?? null), sub: 'vs. historical peak ratio',      color: (series?.pctFromAth ?? 0) < -30 ? 'var(--sct-green)' : 'var(--sct-red)' },
          { label: '1Y Change',  value: pctStr(oneYearChange),             sub: 'Ratio change past 12 months',      color: (oneYearChange ?? 0) >= 0 ? 'var(--sct-green)' : 'var(--sct-red)' },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border p-4 space-y-1"
            style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>{c.label}</p>
            <p className="text-xl font-mono font-bold" style={{ color: c.color }}>{loading ? '…' : c.value}</p>
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
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
            <div className="flex gap-1">
              {RANGES.map((r) => (
                <button key={r} onClick={() => setRange(r)}
                  className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
                  style={{
                    backgroundColor: range === r ? 'var(--sct-secondary)' : 'transparent',
                    borderColor:     range === r ? 'var(--sct-secondary)' : 'var(--sct-border)',
                    color:           range === r ? '#000' : 'var(--sct-muted)',
                  }}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={() => setLog((p) => !p)}
              className="px-2.5 py-1 rounded text-xs font-medium border transition-all"
              style={{
                backgroundColor: logScale ? 'var(--sct-secondary)' : 'transparent',
                borderColor:     logScale ? 'var(--sct-secondary)' : 'var(--sct-border)',
                color:           logScale ? '#000' : 'var(--sct-muted)',
              }}>
              Log
            </button>
          </div>
        </div>

        <div style={{ height: 420 }}>
          {loading ? (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">Loading ratio data…</p>
            </div>
          ) : filtered.length > 0 ? (
            <RatioChart data={filtered} ratioKey={active} logScale={logScale} />
          ) : (
            <div className="h-full flex items-center justify-center" style={{ color: 'var(--sct-muted)' }}>
              <p className="text-sm">No data for selected range</p>
            </div>
          )}
        </div>
      </div>

      {/* How to read */}
      <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>How to Read This</p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: 'Rising Ratio', color: 'var(--sct-green)',
              body: 'The numerator (crypto) is outperforming. BTC/IXIC expanding = Bitcoin gaining on Nasdaq. BTC/ETH rising = Bitcoin outperforming Ethereum.' },
            { title: 'Falling Ratio', color: 'var(--sct-red)',
              body: 'The denominator is outperforming. BTC/ETH falling = Ethereum season in play. 60–85% drawdowns in BTC/IXIC have historically marked Bitcoin bear markets.' },
            { title: 'Rotation Signal', color: '#E6B450',
              body: 'ETH/BTC vs its 365-day MA. When ETH/BTC is well below its MA, ETH is historically undervalued vs BTC — a potential rotation entry. Confirmed by the 4-year percentile.' },
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
