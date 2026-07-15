"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel } from '@/components/dashboard/InsightPanel';
import { RiskGauge } from '@/components/charts/RiskGauge';
import { SmartDcaEngineShareModal } from '@/components/share/SmartDcaEngineShareModal';
import type { SmartDcaEngineSharePayload } from '@/components/share/SmartDcaEngineShareCard';
import { buildRiskContext, riskColor, riskZone, ZONE_META, FACTOR_LABELS, RISK_WEIGHTS, FACTOR_KEYS } from '@/lib/indicators/riskScore';
import { computeDcaSeries, aggregateByBucket, pickBest } from '@/lib/indicators/dcaOptimizer';
import { MULTIPLIER_TABLE, multiplierFor, fmtMultiplier } from '@/lib/indicators/smartDcaEngine';
import type { PricePoint, RiskFactorPoint } from '@/lib/api/coinmetrics';

type Props = { prices: PricePoint[]; riskFactorData: RiskFactorPoint[] };

// Fixed, opinionated defaults — this page gives one answer, it doesn't expose
// the full exploratory controls from the DCA Optimizer / Risk Level pages.
const DCA_MA_PERIOD = 50;
const DCA_WIN_WINDOW = 90;

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function fmtScore(v: number | null): string {
  return v != null ? v.toFixed(3) : '—';
}

function CrossLinkCard({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-4 flex items-center justify-between gap-3 transition-colors hover:border-[#F7931A]"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{sub}</p>
      </div>
      <ArrowRight size={16} style={{ color: 'var(--sct-muted)' }} />
    </Link>
  );
}

export function SmartDcaEnginePageClient({ prices, riskFactorData }: Props) {
  const riskContext = useMemo(() => buildRiskContext(prices, riskFactorData), [prices, riskFactorData]);

  // Same lag-safety pattern as the Risk Level page: skip trailing days whose
  // MVRV/market-cap feed hasn't caught up to price yet.
  const lastRisk = riskContext.series.findLast((p) => p.factorScores.realizedPrice != null) ?? riskContext.series.at(-1);
  const score = lastRisk?.composite ?? null;
  const zone  = score != null ? ZONE_META[riskZone(score)] : null;
  const band  = score != null ? multiplierFor(score) : null;

  const dcaSeries  = useMemo(() => computeDcaSeries(prices, DCA_MA_PERIOD), [prices]);
  const dcaBuckets = useMemo(() => aggregateByBucket(dcaSeries, 'weekday', 'all', DCA_WIN_WINDOW), [dcaSeries]);
  const bestDay     = useMemo(() => pickBest(dcaBuckets, 'avgDiscount', DCA_WIN_WINDOW), [dcaBuckets]);

  const actionColor = score != null ? riskColor(score) : 'var(--sct-muted)';
  const actionText  = band ? (band.multiplier === 'pause' ? 'Pause DCA Buys' : `${fmtMultiplier(band.multiplier)} Suggested Multiplier`) : '—';

  const sharePayload: SmartDcaEngineSharePayload = {
    price:        lastRisk?.price ?? null,
    score,
    zoneLabel:    zone?.label ?? '—',
    bestDayLabel: bestDay?.label ?? '—',
    multiplierLabel: band ? fmtMultiplier(band.multiplier) : '—',
    actionLabel:  band?.label ?? '—',
    generatedAt:  new Date().toISOString(),
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Smart DCA Engine"
        subtitle="A rules-based synthesis of Skyline's risk model and historical DCA timing — not financial advice."
      />

      {/* Hero recommendation */}
      <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="flex justify-center">
            <RiskGauge score={score} label={zone?.label ?? 'No data'} size={240} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Current Risk" value={fmtScore(score)} sub={zone?.label ?? '—'} accent={actionColor} freshness="daily" />
            <StatCard label="Cycle" value={zone?.label ?? '—'} sub="Risk zone" accent={zone?.color} freshness="daily" />
            <StatCard label="Historical DCA Day" value={bestDay?.label ?? '—'} sub={`Avg discount ${fmtPct(bestDay?.avgDiscount)}`} accent="#F7931A" freshness="daily" />
            <StatCard label="Suggested Multiplier" value={band ? fmtMultiplier(band.multiplier) : '—'} sub={band?.label ?? '—'} accent={actionColor} freshness="daily" />
          </div>
        </div>

        <div
          className="mt-6 rounded-xl border px-5 py-4 flex flex-wrap items-center justify-between gap-4"
          style={{ backgroundColor: 'var(--sct-bg)', borderColor: actionColor, borderLeftWidth: '4px' }}
        >
          <div>
            <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--sct-muted)' }}>Suggested Action</p>
            <p className="text-2xl font-bold" style={{ color: actionColor }}>{actionText}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>
              {bestDay ? `Historically best paired with ${bestDay.label} purchases (${bestDay.occurrences} occurrences).` : ''}
            </p>
          </div>
          <SmartDcaEngineShareModal payload={sharePayload} />
        </div>
      </div>

      {/* Multiplier table */}
      <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>Multiplier Rule Table</p>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ color: 'var(--sct-muted)' }}>
              <th className="text-left pb-2 pr-6">Risk Below</th>
              <th className="text-left pb-2 pr-6">Multiplier</th>
              <th className="text-left pb-2">Label</th>
            </tr>
          </thead>
          <tbody>
            {MULTIPLIER_TABLE.map((b) => {
              const isCurrent = band === b;
              return (
                <tr key={b.label} style={{ borderTop: '1px solid var(--sct-border)', backgroundColor: isCurrent ? 'rgba(247,147,26,0.08)' : 'transparent' }}>
                  <td className="py-1.5 pr-6" style={{ color: 'var(--sct-secondary)' }}>
                    {Number.isFinite(b.maxScore) ? b.maxScore.toFixed(2) : '≥ 0.80'}
                  </td>
                  <td className="py-1.5 pr-6 font-semibold" style={{ color: isCurrent ? '#F7931A' : 'var(--sct-text)' }}>
                    {fmtMultiplier(b.multiplier)}{isCurrent ? ' ★' : ''}
                  </td>
                  <td className="py-1.5" style={{ color: 'var(--sct-muted)' }}>{b.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Why panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>Why This Risk Score</p>
          <div className="space-y-1.5">
            {FACTOR_KEYS.map((k) => {
              const v = lastRisk?.factorScores[k] ?? null;
              return (
                <div key={k} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--sct-muted)' }}>{FACTOR_LABELS[k]} ({(RISK_WEIGHTS[k] * 100).toFixed(0)}%)</span>
                  <span className="font-mono" style={{ color: v != null ? riskColor(v) : 'var(--sct-muted)' }}>{fmtScore(v)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--sct-text)' }}>Why This DCA Day</p>
          {bestDay ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span style={{ color: 'var(--sct-muted)' }}>Best Weekday</span><span className="font-mono" style={{ color: 'var(--sct-text)' }}>{bestDay.label}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--sct-muted)' }}>Avg Discount vs 50D SMA</span><span className="font-mono" style={{ color: 'var(--sct-text)' }}>{fmtPct(bestDay.avgDiscount)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--sct-muted)' }}>Avg 30D Return</span><span className="font-mono" style={{ color: 'var(--sct-text)' }}>{fmtPct(bestDay.avgFwd30)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--sct-muted)' }}>Avg 90D Return</span><span className="font-mono" style={{ color: 'var(--sct-text)' }}>{fmtPct(bestDay.avgFwd90)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--sct-muted)' }}>Win Rate (90D)</span><span className="font-mono" style={{ color: 'var(--sct-text)' }}>{bestDay.winRate != null ? `${bestDay.winRate.toFixed(0)}%` : '—'}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--sct-muted)' }}>Occurrences</span><span className="font-mono" style={{ color: 'var(--sct-muted)' }}>{bestDay.occurrences}</span></div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>Insufficient data.</p>
          )}
        </div>
      </div>

      {/* Cross-links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CrossLinkCard href="/tools/risk-level" title="See the full risk model" sub="Model selector, price↔risk calculator, historical events" />
        <CrossLinkCard href="/tools/dca-optimizer" title="See the full DCA breakdown" sub="Explore by weekday, week of month, or month" />
      </div>

      {/* Methodology */}
      <InsightPanel title="How This Works">
        <p className="text-xs leading-relaxed">
          The Smart DCA Engine combines the <span style={{ color: 'var(--sct-text)' }}>Skyline Risk Score</span> (composite,
          from the Risk Level tool) with the <span style={{ color: 'var(--sct-text)' }}>best historical weekday</span>
          {' '}(50D SMA discount, All Time, from the DCA Optimizer) into one opinionated recommendation. Unlike those two
          tools, this page fixes its parameters rather than exposing controls — it is meant to give one answer, not to
          be explored.
        </p>
        <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--sct-secondary)' }}>
          The multiplier table is a simple rules-based heuristic, not a backtested trading system. It is educational
          only and not personalized financial advice — always do your own research and consider your own risk tolerance.
        </p>
      </InsightPanel>
    </div>
  );
}
