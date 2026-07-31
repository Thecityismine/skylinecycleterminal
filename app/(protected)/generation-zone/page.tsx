"use client";

import { useApiData } from '@/lib/hooks/useApiData';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { ChartSkeleton } from '@/components/dashboard/LoadingSkeleton';
import { InsightPanel } from '@/components/dashboard/InsightPanel';
import { GenerationZoneChart } from '@/components/charts/GenerationZoneChart';
import { Check, Minus, TriangleAlert } from 'lucide-react';
import type { GenerationZoneResult } from '@/lib/indicators/generationZone';

const usd = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const signed = (v: number | null) => (v == null ? 'n/a' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);

const monthYear = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function Metric({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="p-5" style={{ backgroundColor: 'var(--sct-card)' }}>
      <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--sct-muted)' }}>{label}</p>
      <p className="text-2xl font-mono font-bold" style={{ color: color ?? 'var(--sct-text)' }}>{value}</p>
      {sub && <p className="text-[11px] mt-1" style={{ color: 'var(--sct-muted)' }}>{sub}</p>}
    </div>
  );
}

export default function GenerationZonePage() {
  const { data, loading, error } = useApiData<GenerationZoneResult>('/api/generation-zone');

  const inZone = data?.current.inZone ?? false;
  const zoneColor = inZone ? 'var(--sct-green)' : 'var(--sct-muted)';

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      <PageHeader
        title="Generation Buying Zone"
        subtitle="Weekly closes against the 200 EMA and 230 SMMA, the levels Bitcoin has historically reached only during its deepest sell-offs"
        regime={inZone ? 'accumulate' : 'neutral'}
      />

      {error && (
        <div className="rounded-xl border p-5 text-sm"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)', color: 'var(--sct-secondary)' }}>
          The zone is temporarily unavailable. It rebuilds from full weekly price history, so this is usually a data-source hiccup.
        </div>
      )}

      {loading && !data && <ChartSkeleton height="h-64" />}

      {data && (
        <>
          {/* Hero metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-border)' }}>
            <Metric label="Weekly close" value={usd(data.current.close)} sub={`Week ending ${data.current.time}`} />
            <Metric
              label="200 EMA"
              value={data.current.ema200 == null ? 'n/a' : usd(data.current.ema200)}
              sub={`${signed(data.current.distanceToEmaPct)} from price`}
              color="#3B82F6"
            />
            <Metric
              label="230 SMMA"
              value={data.current.smma230 == null ? 'n/a' : usd(data.current.smma230)}
              sub={`${signed(data.current.distanceToSmmaPct)} from price`}
              color="#FF5C5C"
            />
            <Metric
              label="Zone status"
              value={inZone ? 'Active' : 'Outside'}
              sub={data.current.depth === 'at-smma' ? 'Reached the 230 SMMA' : data.current.depth === 'at-ema' ? 'At the 200 EMA' : 'Above both averages'}
              color={zoneColor}
            />
          </div>

          {/* Chart */}
          <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
                BTC/USD weekly, log scale
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  { c: 'rgba(247,249,252,0.92)', l: 'Weekly close' },
                  { c: '#3B82F6', l: '200 EMA' },
                  { c: '#FF5C5C', l: '230 SMMA' },
                  { c: 'rgba(53,208,127,0.5)', l: 'Touch episode' },
                ].map((x) => (
                  <div key={x.l} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: x.c }} />
                    <span className="text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>{x.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 460 }}>
              <GenerationZoneChart weekly={data.weekly} episodes={data.episodes} />
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--sct-muted)' }}>
              Shaded bands mark every week price closed at or below one of the averages, within a 2% tolerance.
              Darker bands reached the deeper 230 SMMA. The 200 EMA needs 200 weekly closes and the 230 SMMA needs 230,
              so neither exists before mid-2014 and this chart says nothing about 2011 to 2013.
            </p>
          </div>

          {/* Conditions */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
            <div className="lg:col-span-3 rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
                  Conditions met
                </p>
                <p className="text-sm font-mono font-bold" style={{ color: zoneColor }}>
                  {data.conditions.filter((c) => c.met).length} of {data.conditions.length}
                </p>
              </div>
              <div className="space-y-3">
                {data.conditions.map((c) => (
                  <div key={c.label} className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5" style={{ color: c.met ? 'var(--sct-green)' : 'var(--sct-muted)' }}>
                      {c.met ? <Check size={15} /> : <Minus size={15} />}
                    </span>
                    <div>
                      <p className="text-sm" style={{ color: c.met ? 'var(--sct-text)' : 'var(--sct-secondary)' }}>{c.label}</p>
                      <p className="text-[11px]" style={{ color: 'var(--sct-muted)' }}>{c.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed mt-4 pt-4" style={{ color: 'var(--sct-muted)', borderTop: '1px solid var(--sct-border)' }}>
                This is a count of independent conditions that are true right now, not a probability.
                Four booleans agreeing is not a forecast, and treating it as one would claim precision that does not exist.
              </p>
            </div>

            <div className="lg:col-span-2">
              <InsightPanel title="What these levels are">
                <p className="text-xs leading-relaxed">
                  The 200 EMA and 230 SMMA sit far below price for most of a cycle. Reaching them has required a
                  drawdown deep enough to unwind years of trend, which historically has coincided with forced selling
                  and capitulation rather than ordinary weakness.
                </p>
                <p className="text-xs leading-relaxed mt-3">
                  That is a description of what has happened, not a prediction. Price is not obliged to revisit either
                  average in any given cycle, and one that does may keep falling.
                </p>
              </InsightPanel>
            </div>
          </div>

          {/* Episodes */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--sct-border)' }}>
              <p className="text-xs font-medium tracking-wider uppercase" style={{ color: 'var(--sct-muted)' }}>
                Every touch since the averages began, {data.episodes.length} in total
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--sct-border)' }}>
                    {['Episode', 'Weeks', 'Lowest weekly close', 'Depth reached', 'Peak that followed', 'Gain from the low'].map((h) => (
                      <th key={h} className="text-left font-medium text-[11px] uppercase tracking-wider px-5 py-3" style={{ color: 'var(--sct-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.episodes.map((ep) => (
                    <tr key={ep.start} style={{ borderBottom: '1px solid var(--sct-border)' }}>
                      <td className="px-5 py-3.5" style={{ color: 'var(--sct-text)' }}>
                        <span className="font-medium">{ep.label ?? monthYear(ep.lowTime)}</span>
                        <span className="block text-[11px]" style={{ color: 'var(--sct-muted)' }}>
                          {ep.start} to {ep.end}{ep.ongoing ? ', ongoing' : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'var(--sct-secondary)' }}>{ep.weeks}</td>
                      <td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'var(--sct-secondary)' }}>{usd(ep.lowClose)}</td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: ep.reachedSmma ? '#FF5C5C' : '#3B82F6' }}>
                        {ep.reachedSmma ? '230 SMMA' : '200 EMA'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs" style={{ color: 'var(--sct-secondary)' }}>
                        {ep.peakClose == null ? '—' : `${usd(ep.peakClose)} · ${monthYear(ep.peakTime!)}`}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold" style={{ color: ep.forwardReturnPct == null ? 'var(--sct-muted)' : 'var(--sct-green)' }}>
                        {ep.forwardReturnPct == null ? 'Unresolved' : `+${Math.round(ep.forwardReturnPct).toLocaleString()}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] leading-relaxed px-5 py-4" style={{ color: 'var(--sct-muted)', borderTop: '1px solid var(--sct-border)' }}>
              Prices are weekly closes, which is what a weekly chart plots. Popular accounts of these events usually
              quote the intraday low instead, so the figures here read higher than the numbers you may remember.
              Gains are measured from each episode&apos;s lowest weekly close to the highest weekly close that came after
              it, and an episode still running has no gain to report.
            </p>
          </div>

          {/* Risk */}
          <div className="rounded-xl border p-6" style={{ backgroundColor: 'rgba(230,180,80,0.06)', borderColor: 'rgba(230,180,80,0.35)' }}>
            <p className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: 'var(--sct-amber)' }}>
              <TriangleAlert size={15} />
              What this cannot tell you
            </p>
            <ul className="space-y-2 text-sm leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>
              <li>The sample is small. {data.episodes.length} episodes across roughly a decade is not enough to call anything reliable.</li>
              <li>Only the deepest episodes reached the 230 SMMA. Most touches were the 200 EMA alone, and those are far more common.</li>
              <li>Every gain shown is measured with hindsight, to a peak that was only knowable afterwards.</li>
              <li>Reaching these levels has not marked the exact low. Price has spent months below them before recovering.</li>
              <li>Nothing obliges Bitcoin to revisit either average in a future cycle.</li>
            </ul>
            <p className="text-[11px] mt-4" style={{ color: 'var(--sct-muted)' }}>
              Educational and informational only. Not financial advice, and not a recommendation to buy or sell any asset.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
