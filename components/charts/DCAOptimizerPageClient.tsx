"use client";

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel } from '@/components/dashboard/InsightPanel';
import { DCAOptimizerChart } from '@/components/charts/DCAOptimizerChart';
import { BTCDCAOptimizerShareModal } from '@/components/share/BTCDCAOptimizerShareModal';
import type { BTCDCAOptimizerSharePayload } from '@/components/share/BTCDCAOptimizerShareCard';
import {
  computeDcaSeries, aggregateByBucket, pickBest, metricValue,
  DATE_RANGE_LABELS,
} from '@/lib/indicators/dcaOptimizer';
import type {
  MaPeriod, GroupBy, Metric, ForwardWindow, DateRangeKey, BucketStat,
} from '@/lib/indicators/dcaOptimizer';
import type { PricePoint } from '@/lib/api/coinmetrics';

type Props = { prices: PricePoint[] };

const MA_OPTIONS: MaPeriod[] = [7, 20, 50, 100, 200];
const RANGE_OPTIONS: DateRangeKey[] = ['all', '2017', 'currentCycle'];
const GROUP_BY_OPTIONS: { key: GroupBy; label: string }[] = [
  { key: 'weekday',     label: 'Weekday' },
  { key: 'weekOfMonth', label: 'Week of Month' },
  { key: 'month',       label: 'Month' },
];
const METRIC_OPTIONS: { key: Metric; label: string }[] = [
  { key: 'avgDiscount',    label: 'Average Discount' },
  { key: 'medianDiscount', label: 'Median Discount' },
  { key: 'winRate',        label: 'Win Rate' },
  { key: 'avgReturn',      label: 'Average Return' },
];
const WINDOW_OPTIONS: ForwardWindow[] = [30, 90, 180, 365];

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function ControlButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded text-xs font-mono border transition-all duration-150"
      style={{
        backgroundColor: active ? 'var(--sct-border)' : 'transparent',
        borderColor:     'var(--sct-border)',
        color:           active ? 'var(--sct-text)' : 'var(--sct-muted)',
      }}
    >
      {children}
    </button>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

export function DCAOptimizerPageClient({ prices }: Props) {
  const [range, setRange]       = useState<DateRangeKey>('all');
  const [maPeriod, setMaPeriod] = useState<MaPeriod>(50);
  const [groupBy, setGroupBy]   = useState<GroupBy>('weekday');
  const [metric, setMetric]     = useState<Metric>('avgDiscount');
  const [winWindow, setWinWindow] = useState<ForwardWindow>(90);

  const series = useMemo(() => computeDcaSeries(prices, maPeriod), [prices, maPeriod]);
  const buckets: BucketStat[] = useMemo(
    () => aggregateByBucket(series, groupBy, range, winWindow),
    [series, groupBy, range, winWindow],
  );
  const best = useMemo(() => pickBest(buckets, metric, winWindow), [buckets, metric, winWindow]);

  const groupByLabel = GROUP_BY_OPTIONS.find((g) => g.key === groupBy)!.label;
  const metricLabel  = METRIC_OPTIONS.find((m) => m.key === metric)!.label;
  const maLabel      = `${maPeriod}D SMA`;
  const rangeLabel   = DATE_RANGE_LABELS[range];

  const bestMetricValue = best ? metricValue(best, metric, winWindow) : null;
  const bestValueStr = best
    ? metric === 'winRate'
      ? `${bestMetricValue?.toFixed(0) ?? '—'}%`
      : fmtPct(bestMetricValue)
    : '—';

  const sharePayload: BTCDCAOptimizerSharePayload = {
    buckets, metric, metricLabel, winWindow, groupByLabel, rangeLabel, maLabel, best,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC DCA Optimizer"
        subtitle="Historically, when has recurring Bitcoin buying paid off best?"
      />

      {/* Controls */}
      <div
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <ControlGroup label="Date Range">
            {RANGE_OPTIONS.map((r) => (
              <ControlButton key={r} active={range === r} onClick={() => setRange(r)}>
                {DATE_RANGE_LABELS[r]}
              </ControlButton>
            ))}
          </ControlGroup>

          <ControlGroup label="Moving Average">
            {MA_OPTIONS.map((m) => (
              <ControlButton key={m} active={maPeriod === m} onClick={() => setMaPeriod(m)}>
                {m}D
              </ControlButton>
            ))}
          </ControlGroup>

          <ControlGroup label="Group By">
            {GROUP_BY_OPTIONS.map((g) => (
              <ControlButton key={g.key} active={groupBy === g.key} onClick={() => setGroupBy(g.key)}>
                {g.label}
              </ControlButton>
            ))}
          </ControlGroup>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <ControlGroup label="Metric">
            {METRIC_OPTIONS.map((m) => (
              <ControlButton key={m.key} active={metric === m.key} onClick={() => setMetric(m.key)}>
                {m.label}
              </ControlButton>
            ))}
          </ControlGroup>

          <ControlGroup label="Win / Return Window">
            {WINDOW_OPTIONS.map((w) => (
              <ControlButton key={w} active={winWindow === w} onClick={() => setWinWindow(w)}>
                {w}D
              </ControlButton>
            ))}
          </ControlGroup>
        </div>
      </div>

      {/* Best bucket banner */}
      <div
        className="rounded-xl border px-5 py-4 flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: '#F7931A', borderLeftWidth: '4px' }}
      >
        <div className="space-y-0.5">
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>
            Best {groupByLabel} — {metricLabel}
          </p>
          <p className="text-xl font-bold" style={{ color: '#F7931A' }}>
            {best?.label ?? 'Insufficient data'}
          </p>
          <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
            {best
              ? `Avg Discount ${fmtPct(best.avgDiscount)} vs ${maLabel} · ${best.occurrences} occurrences`
              : 'Not enough historical samples in this range for a reliable read.'}
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-mono font-semibold"
          style={{ backgroundColor: '#F7931A22', color: '#F7931A' }}
        >
          {metricLabel}: {bestValueStr}
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={`Best ${groupByLabel}`}
          value={best?.label ?? '—'}
          sub={metricLabel}
          accent="#F7931A"
          freshness="daily"
        />
        <StatCard
          label="Avg Discount"
          value={fmtPct(best?.avgDiscount ?? null)}
          sub={`vs ${maLabel}`}
          accent="#5B84FF"
          freshness="daily"
        />
        <StatCard
          label="Avg 30D Return"
          value={fmtPct(best?.avgFwd30 ?? null)}
          sub="Forward return"
          accent="#35D07F"
          freshness="daily"
        />
        <StatCard
          label="Avg 90D Return"
          value={fmtPct(best?.avgFwd90 ?? null)}
          sub="Forward return"
          accent="#35D07F"
          freshness="daily"
        />
      </div>

      {/* Chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              {metricLabel} by {groupByLabel}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              {rangeLabel} · {maLabel} baseline · orange outline marks the best bucket
            </p>
          </div>
          <BTCDCAOptimizerShareModal payload={sharePayload} />
        </div>
        <div style={{ height: 360 }}>
          <DCAOptimizerChart buckets={buckets} metric={metric} winWindow={winWindow} bestKey={best?.key ?? null} />
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>
          {groupByLabel} Breakdown
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left pb-2 pr-6">{groupByLabel}</th>
                <th className="text-right pb-2 pr-6">Avg Discount</th>
                <th className="text-right pb-2 pr-6">Median Discount</th>
                <th className="text-right pb-2 pr-6">30D Return</th>
                <th className="text-right pb-2 pr-6">90D Return</th>
                <th className="text-right pb-2 pr-6">Win Rate ({winWindow}D)</th>
                <th className="text-right pb-2">Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => {
                const isBest = best?.key === b.key;
                return (
                  <tr
                    key={b.key}
                    style={{
                      borderTop: '1px solid var(--sct-border)',
                      backgroundColor: isBest ? 'rgba(247,147,26,0.08)' : 'transparent',
                    }}
                  >
                    <td className="py-2 pr-6 font-semibold" style={{ color: isBest ? '#F7931A' : 'var(--sct-text)' }}>
                      {b.label}{isBest ? ' ★' : ''}
                    </td>
                    <td className="py-2 pr-6 text-right" style={{ color: 'var(--sct-secondary)' }}>{fmtPct(b.avgDiscount)}</td>
                    <td className="py-2 pr-6 text-right" style={{ color: 'var(--sct-secondary)' }}>{fmtPct(b.medianDiscount)}</td>
                    <td className="py-2 pr-6 text-right" style={{ color: 'var(--sct-secondary)' }}>{fmtPct(b.avgFwd30)}</td>
                    <td className="py-2 pr-6 text-right" style={{ color: 'var(--sct-secondary)' }}>{fmtPct(b.avgFwd90)}</td>
                    <td className="py-2 pr-6 text-right" style={{ color: 'var(--sct-secondary)' }}>{b.winRate != null ? `${b.winRate.toFixed(0)}%` : '—'}</td>
                    <td className="py-2 text-right" style={{ color: 'var(--sct-muted)' }}>{b.occurrences}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology / disclaimer */}
      <InsightPanel title="How This Works">
        <p className="text-xs leading-relaxed">
          For every day in the selected range, discount is calculated as <span className="font-mono">(price − {maLabel}) / {maLabel}</span>.
          Days are grouped by {groupByLabel.toLowerCase()}, and each bucket&apos;s stats are averaged across every occurrence in history.
          Forward returns measure what happened to price N days after each buy; win rate is the share of buys with a positive
          {' '}{winWindow}D forward return. Buckets need at least 10 occurrences to be eligible as &quot;best&quot;.
        </p>
        <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--sct-secondary)' }}>
          This is a historical pattern, not a guarantee — small sample sizes (especially for Week of Month and Month views)
          can shift meaningfully as new data arrives. Not financial advice.
        </p>
      </InsightPanel>
    </div>
  );
}
