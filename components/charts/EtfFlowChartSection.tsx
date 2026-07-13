"use client";

import { useState, useMemo } from 'react';
import { EtfFlowBarChart } from './EtfFlowBarChart';
import { EtfCumulativeChart } from './EtfCumulativeChart';
import { ETF_ISSUERS } from '@/lib/api/etfFlows';
import type { EtfFlowsSource } from '@/lib/api/etfFlows';
import type { EtfFlowPoint, FlowScore, FlowDivergence } from '@/lib/indicators/etfFlows';

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

type Props = {
  points: EtfFlowPoint[];
  score: FlowScore;
  divergence: FlowDivergence | null;
  flow7d: number | null;
  flow30d: number | null;
  cumTotal: number;
  streak: number;
  streakDir: 'inflow' | 'outflow' | 'flat';
  positiveIssuers: number;
  negativeIssuers: number;
  totalIssuers: number;
  lastDate: string;
  source: EtfFlowsSource;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFlow(v: number | null): string {
  if (v == null) return '—';
  const abs = Math.abs(v);
  const sign = v >= 0 ? '+' : '-';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}

function flowColor(v: number | null): string {
  if (v == null) return 'var(--sct-muted)';
  return v >= 0 ? '#35D07F' : '#F85149';
}

function cutoffDate(range: TimeRange): string {
  const now = new Date();
  if (range === 'All') return '2000-01-01';
  const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range];
  now.setDate(now.getDate() - days);
  return now.toISOString().slice(0, 10);
}

function ToggleBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
      style={{
        backgroundColor: active ? 'rgba(91,132,255,0.12)' : 'transparent',
        borderColor:     active ? 'rgba(91,132,255,0.50)' : 'var(--sct-border)',
        color:           active ? 'rgba(91,132,255,0.90)' : 'var(--sct-muted)',
      }}
    >
      {children}
    </button>
  );
}

function RangeBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded text-xs font-mono border transition-all duration-150"
      style={{
        backgroundColor: active ? 'rgba(247,147,26,0.10)' : 'transparent',
        borderColor:     active ? 'rgba(247,147,26,0.40)' : 'var(--sct-border)',
        color:           active ? '#F7931A' : 'var(--sct-muted)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Issuer breakdown table ───────────────────────────────────────────────────

function IssuerTable({ points, source }: { points: EtfFlowPoint[]; source: EtfFlowsSource }) {
  const last = points[points.length - 1];
  if (!last) return null;

  // 30D per-issuer sums. SoSoValue's free tier only exposes issuer-level
  // flows for the current day (see lib/api/sosovalue.ts), so in fallback
  // mode this collapses to a single day of data — detect that and relabel
  // the column instead of showing a misleading "30D" figure.
  const last30 = points.slice(-30);
  const issuer30: Record<string, number> = {};
  let issuerDayCount = 0;
  for (const p of last30) {
    if (ETF_ISSUERS.some(k => p[k.key as keyof EtfFlowPoint] != null)) issuerDayCount++;
  }
  for (const k of ETF_ISSUERS) {
    let sum = 0;
    for (const p of last30) {
      const v = p[k.key as keyof EtfFlowPoint] as number | undefined;
      if (v != null) sum += v;
    }
    issuer30[k.key] = sum;
  }

  const hasIssuerHistory = source === 'farside' || issuerDayCount > 1;

  const rows = ETF_ISSUERS.map(iss => {
    const daily = last[iss.key as keyof EtfFlowPoint] as number | undefined;
    const flow30d = issuer30[iss.key];
    return { ...iss, daily: daily ?? null, flow30d };
  }).filter(r => r.daily != null || r.flow30d !== 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr style={{ color: 'var(--sct-muted)' }}>
            <th className="text-left pb-2 pr-4">ETF</th>
            <th className="text-left pb-2 pr-4">Issuer</th>
            <th className="text-right pb-2 pr-4">Daily Flow</th>
            <th className="text-right pb-2">{hasIssuerHistory ? '30D Flow' : 'Today Only'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} style={{ borderTop: '1px solid var(--sct-border)' }}>
              <td className="py-2 pr-4">
                <span className="font-semibold" style={{ color: r.color }}>{r.ticker}</span>
              </td>
              <td className="py-2 pr-4" style={{ color: 'var(--sct-muted)' }}>{r.issuer}</td>
              <td className="py-2 pr-4 text-right" style={{ color: flowColor(r.daily) }}>
                {fmtFlow(r.daily)}
              </td>
              <td className="py-2 text-right" style={{ color: flowColor(hasIssuerHistory ? r.flow30d : r.daily) }}>
                {hasIssuerHistory ? fmtFlow(r.flow30d) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!hasIssuerHistory && (
        <p className="text-[10px] mt-2" style={{ color: 'var(--sct-muted)' }}>
          Per-issuer history unavailable from the current data source — showing today only.
        </p>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function EtfFlowChartSection({
  points, score, divergence,
  flow7d, flow30d, cumTotal,
  streak, streakDir,
  positiveIssuers, negativeIssuers, totalIssuers,
  lastDate, source,
}: Props) {
  const [range, setRange]         = useState<TimeRange>('3M');
  const [showRolling7, setR7]     = useState(false);
  const [showRolling30, setR30]   = useState(true);
  const [showBtc, setBtc]         = useState(true);
  const [showCumulative, setCum]  = useState(false);

  const filtered = useMemo(() => {
    const cutoff = cutoffDate(range);
    return points.filter(p => p.time >= cutoff);
  }, [points, range]);

  const RANGES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'All'];

  const lastDay = points[points.length - 1] ?? null;
  const todayFlow = lastDay?.totalNetFlowUsd ?? null;

  return (
    <div className="space-y-4">

      {/* ── Main chart card ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl border"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: 'var(--sct-border)' }}
        >
          {/* Time ranges */}
          <div className="flex gap-1">
            {RANGES.map(r => (
              <RangeBtn key={r} active={range === r} onClick={() => setRange(r)}>{r}</RangeBtn>
            ))}
          </div>

          <div style={{ width: 1, height: 20, backgroundColor: 'var(--sct-border)' }} />

          {/* View toggles */}
          <ToggleBtn active={showRolling7} onClick={() => setR7(v => !v)}>7D MA</ToggleBtn>
          <ToggleBtn active={showRolling30} onClick={() => setR30(v => !v)}>30D MA</ToggleBtn>
          <ToggleBtn active={showBtc} onClick={() => setBtc(v => !v)}>BTC</ToggleBtn>

          <div style={{ width: 1, height: 20, backgroundColor: 'var(--sct-border)' }} />

          <ToggleBtn active={showCumulative} onClick={() => setCum(v => !v)}>CUMULATIVE</ToggleBtn>

          <div className="ml-auto text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
            {lastDate} · {source === 'sosovalue' ? 'SoSoValue' : 'Farside'}
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ height: 340, padding: '12px 0 4px' }}>
          <EtfFlowBarChart
            data={filtered}
            showRolling7={showRolling7}
            showRolling30={showRolling30}
            showBtcOverlay={showBtc}
          />
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap gap-4 px-4 pb-3 text-[10px] font-mono"
          style={{ color: 'var(--sct-muted)' }}
        >
          <span><span style={{ color: '#35D07F' }}>■</span> Net Inflow</span>
          <span><span style={{ color: '#F85149' }}>■</span> Net Outflow</span>
          {showRolling7  && <span><span style={{ color: '#5B84FF' }}>─</span> 7D Rolling</span>}
          {showRolling30 && <span><span style={{ color: '#EAB84D' }}>─</span> 30D Rolling</span>}
          {showBtc       && <span><span style={{ color: 'rgba(230,237,243,0.5)' }}>─</span> BTC Price</span>}
        </div>
      </div>

      {/* ── Cumulative chart (optional) ──────────────────────────────────── */}
      {showCumulative && (
        <div
          className="rounded-xl border"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="px-5 pt-4 pb-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              {source === 'sosovalue' ? 'Cumulative Net ETF Flows' : 'Cumulative Net ETF Flows Since Launch'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Running total of all daily ETF net flows · structural demand view vs tactical daily bars
            </p>
          </div>
          <div style={{ height: 260, padding: '4px 0 8px' }}>
            <EtfCumulativeChart data={filtered} showBtcOverlay={showBtc} />
          </div>
        </div>
      )}

      {/* ── Flow / Price Divergence panel ───────────────────────────────── */}
      {divergence && (
        <div
          className="rounded-xl border px-5 py-4 flex items-start gap-4"
          style={{
            backgroundColor: `${divergence.color}08`,
            borderColor: `${divergence.color}30`,
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: divergence.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: divergence.color }}>
              Flow / Price Divergence · {divergence.label}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
              {divergence.description}
            </p>
          </div>
        </div>
      )}

      {/* ── Two-col: Issuer breakdown + Flow streak ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Issuer breakdown (2/3 width) */}
        <div
          className="lg:col-span-2 rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Issuer Breakdown
            </p>
            <div className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>
              Positive today:{' '}
              <span style={{ color: '#35D07F' }}>{positiveIssuers}</span>
              {' / '}
              Negative:{' '}
              <span style={{ color: '#F85149' }}>{negativeIssuers}</span>
            </div>
          </div>
          <IssuerTable points={points} source={source} />
        </div>

        {/* Flow streak + regime */}
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
            Flow Streak
          </p>

          <div className="space-y-2 text-xs font-mono">
            {[
              { label: 'Today', value: fmtFlow(todayFlow), color: flowColor(todayFlow) },
              { label: '7D Net', value: fmtFlow(flow7d), color: flowColor(flow7d) },
              { label: '30D Net', value: fmtFlow(flow30d), color: flowColor(flow30d) },
              { label: 'Cumulative', value: fmtFlow(cumTotal), color: flowColor(cumTotal) },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-1.5 border-b last:border-0"
                style={{ borderColor: 'var(--sct-border)' }}>
                <span style={{ color: 'var(--sct-muted)' }}>{row.label}</span>
                <span className="font-semibold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {streak > 0 && streakDir !== 'flat' && (
            <div
              className="rounded-lg p-3 border text-center"
              style={{
                borderColor: streakDir === 'inflow' ? 'rgba(53,208,127,0.3)' : 'rgba(248,81,73,0.3)',
                backgroundColor: streakDir === 'inflow' ? 'rgba(53,208,127,0.06)' : 'rgba(248,81,73,0.06)',
              }}
            >
              <p className="text-2xl font-mono font-bold"
                style={{ color: streakDir === 'inflow' ? '#35D07F' : '#F85149' }}>
                {streak}
              </p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--sct-muted)' }}>
                consecutive {streakDir === 'inflow' ? 'inflow' : 'outflow'} {streak === 1 ? 'day' : 'days'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
