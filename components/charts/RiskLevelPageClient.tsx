"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel } from '@/components/dashboard/InsightPanel';
import { RiskGauge } from '@/components/charts/RiskGauge';
import { RiskColoredPriceChart } from '@/components/charts/RiskColoredPriceChart';
import type { ChartPoint } from '@/components/charts/RiskColoredPriceChart';
import { RiskHistogramChart } from '@/components/charts/RiskHistogramChart';
import { BTCRiskLevelShareModal } from '@/components/share/BTCRiskLevelShareModal';
import type { BTCRiskLevelSharePayload } from '@/components/share/BTCRiskLevelShareCard';
import {
  buildRiskContext, computeRiskForPrice, percentileRank, riskColor, riskZone, allocationFor,
  FACTOR_KEYS, MODEL_LABELS, RISK_WEIGHTS, FACTOR_LABELS, ZONE_META, ALLOCATION_TABLE, HISTORICAL_EVENTS,
} from '@/lib/indicators/riskScore';
import type { ModelKey, RiskPoint } from '@/lib/indicators/riskScore';
import type { PricePoint, RiskFactorPoint } from '@/lib/api/coinmetrics';

type Props = { prices: PricePoint[]; riskFactorData: RiskFactorPoint[] };

const MODEL_OPTIONS: ModelKey[] = ['composite', ...FACTOR_KEYS];

const PRICE_LADDER = [20_000, 30_000, 40_000, 50_000, 60_000, 70_000, 80_000, 90_000, 100_000, 120_000, 150_000, 200_000];

function isNum(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v);
}

function scoreForModel(point: { composite: number | null; factorScores: Record<string, number | null> }, modelKey: ModelKey): number | null {
  return modelKey === 'composite' ? point.composite : point.factorScores[modelKey];
}

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function fmtScore(v: number | null): string {
  return v != null ? v.toFixed(3) : '—';
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

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>{title}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

export function RiskLevelPageClient({ prices, riskFactorData }: Props) {
  const [modelKey, setModelKey]   = useState<ModelKey>('composite');
  const [showBands, setShowBands] = useState(true);
  const context = useMemo(() => buildRiskContext(prices, riskFactorData), [prices, riskFactorData]);

  const [calculatorPrice, setCalculatorPrice] = useState<number>(() => Math.round(context.basis.todayActualPrice));

  // CoinMetrics' MVRV/market-cap feed publishes with a short lag behind price —
  // skip trailing days that haven't caught up yet, same pattern as onchain/cycle-master.
  const last: RiskPoint | undefined = context.series.findLast((p) => p.factorScores.realizedPrice != null) ?? context.series.at(-1);
  const currentScore = last ? scoreForModel(last, modelKey) : null;
  const zone = currentScore != null ? ZONE_META[riskZone(currentScore)] : null;

  const compositeScores = useMemo(
    () => context.series.map((p) => p.composite).filter(isNum).sort((a, b) => a - b),
    [context.series],
  );
  const historicalPct = last?.composite != null ? percentileRank(compositeScores, last.composite) * 100 : null;

  const chartPoints: ChartPoint[] = useMemo(
    () => context.weeklySeries.map((p) => ({ ts: p.ts, time: p.time, price: p.price, score: scoreForModel(p, modelKey) })),
    [context.weeklySeries, modelKey],
  );

  const histogramScores = useMemo(
    () => context.series.map((p) => scoreForModel(p, modelKey)),
    [context.series, modelKey],
  );

  const calculatorResult = useMemo(
    () => computeRiskForPrice(calculatorPrice, context.basis, context.distributions),
    [calculatorPrice, context.basis, context.distributions],
  );
  const calculatorScore = modelKey === 'composite' ? calculatorResult.composite : calculatorResult.factorScores[modelKey];

  const priceLadderRows = useMemo(
    () => PRICE_LADDER.map((price) => {
      const r = computeRiskForPrice(price, context.basis, context.distributions);
      return { price, score: modelKey === 'composite' ? r.composite : r.factorScores[modelKey] };
    }),
    [context.basis, context.distributions, modelKey],
  );

  const historicalEventRows = useMemo(
    () => HISTORICAL_EVENTS.map((ev) => {
      const point = context.series.find((p) => p.time >= ev.date) ?? context.series.at(-1);
      return { ...ev, price: point?.price ?? null, score: point?.composite ?? null };
    }),
    [context.series],
  );

  const modelLabel = MODEL_LABELS[modelKey];

  const sharePayload: BTCRiskLevelSharePayload = {
    points: chartPoints,
    modelLabel,
    currentPrice: last?.price ?? null,
    currentScore,
    historicalPct,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC Historical Risk Level"
        subtitle="How risky is buying Bitcoin today, relative to its full history?"
      />

      {/* Model selector */}
      <div className="rounded-xl border p-4 flex flex-wrap items-center gap-1.5" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <span className="text-[10px] font-mono uppercase tracking-wider mr-2" style={{ color: 'var(--sct-muted)' }}>
          Valuation Model
        </span>
        {MODEL_OPTIONS.map((m) => (
          <ControlButton key={m} active={modelKey === m} onClick={() => setModelKey(m)}>
            {MODEL_LABELS[m]}
          </ControlButton>
        ))}
      </div>

      {/* Gauge + right panel */}
      <div className="rounded-xl border p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="flex justify-center">
          <RiskGauge score={currentScore} label={zone?.label ?? 'No data'} size={260} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Current Price" value={fmtUSD(last?.price ?? null)} sub={modelLabel} accent="#F7931A" freshness="daily" />
          <StatCard label="Risk" value={fmtScore(currentScore)} sub={zone?.label ?? '—'} accent={currentScore != null ? riskColor(currentScore) : undefined} freshness="daily" />
          <StatCard label="Historical Percentile" value={historicalPct != null ? `${historicalPct.toFixed(0)}%` : '—'} sub="vs full BTC history" accent="#5B84FF" freshness="daily" />
          <StatCard label="Confidence" value={last ? `${last.confidencePct.toFixed(0)}%` : '—'} sub="Data completeness" accent="#35D07F" freshness="daily" />
        </div>
      </div>

      {/* Main chart */}
      <Card
        title={`${modelLabel} — Price Colored by Risk`}
        right={
          <div className="flex items-center gap-2">
            <ControlButton active={showBands} onClick={() => setShowBands((v) => !v)}>
              {showBands ? 'Hide Bands' : 'Show Bands'}
            </ControlButton>
            <BTCRiskLevelShareModal payload={sharePayload} />
          </div>
        }
      >
        <RiskColoredPriceChart points={chartPoints} showBands={showBands} />
        <p className="text-xs mt-2" style={{ color: 'var(--sct-muted)' }}>
          Log-scale BTC price, colored by {modelLabel.toLowerCase()} risk band: deep blue (lowest) through red (highest). Dashed verticals mark halvings.
        </p>
      </Card>

      {/* Histogram + Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card title="Risk Distribution">
          <div style={{ height: 220 }}>
            <RiskHistogramChart scores={histogramScores} currentScore={currentScore} />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--sct-muted)' }}>
            How rare today&apos;s {modelLabel.toLowerCase()} reading is across all of BTC history. Orange outline marks today&apos;s bucket.
          </p>
        </Card>

        <Card title="Price ↔ Risk Calculator">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>Hypothetical Price</span>
              <span className="text-lg font-mono font-bold" style={{ color: '#F7931A' }}>{fmtUSD(calculatorPrice)}</span>
            </div>
            <input
              type="range"
              min={5_000}
              max={500_000}
              step={1_000}
              value={calculatorPrice}
              onChange={(e) => setCalculatorPrice(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--sct-border)' }}>
              <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>Resulting Risk</span>
              <span className="text-2xl font-mono font-bold" style={{ color: calculatorScore != null ? riskColor(calculatorScore) : 'var(--sct-muted)' }}>
                {fmtScore(calculatorScore)}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--sct-muted)' }}>
              {calculatorScore != null
                ? `Educational allocation reference: "${allocationFor(calculatorScore)}"`
                : 'Move the slider to see the resulting risk score.'}
            </p>
          </div>
        </Card>
      </div>

      {/* Historical Price Table + Allocation Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card title="Historical Price Table">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left pb-2 pr-6">Price</th>
                <th className="text-right pb-2">Risk</th>
              </tr>
            </thead>
            <tbody>
              {priceLadderRows.map((r) => (
                <tr key={r.price} style={{ borderTop: '1px solid var(--sct-border)' }}>
                  <td className="py-1.5 pr-6" style={{ color: 'var(--sct-secondary)' }}>{fmtUSD(r.price)}</td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: r.score != null ? riskColor(r.score) : 'var(--sct-muted)' }}>
                    {fmtScore(r.score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Risk Allocation Suggestions">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left pb-2 pr-6">Risk Below</th>
                <th className="text-left pb-2">Suggestion</th>
              </tr>
            </thead>
            <tbody>
              {ALLOCATION_TABLE.map((a) => (
                <tr key={a.label} style={{ borderTop: '1px solid var(--sct-border)' }}>
                  <td className="py-1.5 pr-6" style={{ color: 'var(--sct-secondary)' }}>
                    {Number.isFinite(a.maxScore) ? a.maxScore.toFixed(2) : '> 0.80'}
                  </td>
                  <td className="py-1.5" style={{ color: riskColor(Math.min(0.99, a.maxScore - 0.05)) }}>{a.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] mt-3" style={{ color: 'var(--sct-muted)' }}>
            Educational reference only — not personalized financial advice.
          </p>
        </Card>
      </div>

      {/* Historical Events */}
      <Card title="Historical Events">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ color: 'var(--sct-muted)' }}>
              <th className="text-left pb-2 pr-6">Date</th>
              <th className="text-left pb-2 pr-6">Event</th>
              <th className="text-right pb-2 pr-6">Price</th>
              <th className="text-right pb-2">Risk</th>
            </tr>
          </thead>
          <tbody>
            {historicalEventRows.map((ev) => (
              <tr key={ev.date} style={{ borderTop: '1px solid var(--sct-border)' }}>
                <td className="py-1.5 pr-6" style={{ color: 'var(--sct-muted)' }}>{ev.date}</td>
                <td className="py-1.5 pr-6" style={{ color: 'var(--sct-text)' }}>{ev.label}</td>
                <td className="py-1.5 pr-6 text-right" style={{ color: 'var(--sct-secondary)' }}>{fmtUSD(ev.price)}</td>
                <td className="py-1.5 text-right font-semibold" style={{ color: ev.score != null ? riskColor(ev.score) : 'var(--sct-muted)' }}>
                  {fmtScore(ev.score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Cross-link */}
      <Link
        href="/tools/smart-dca-engine"
        className="rounded-xl border p-4 flex items-center justify-between gap-3 transition-colors hover:border-[#F7931A]"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Get the Smart DCA recommendation</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>Combines this risk score with the DCA Optimizer&apos;s best-day model into one suggested multiplier</p>
        </div>
        <ArrowRight size={16} style={{ color: 'var(--sct-muted)' }} />
      </Link>

      {/* Methodology */}
      <InsightPanel title="How This Works">
        <p className="text-xs leading-relaxed">
          The Skyline Risk Score blends six factors, each percentile-ranked against its own full BTC history so the
          model self-calibrates as cycle-over-cycle multiples compress — no fixed thresholds to re-tune:
        </p>
        <div className="mt-2 space-y-1">
          {FACTOR_KEYS.map((k) => (
            <div key={k} className="flex justify-between text-xs">
              <span style={{ color: 'var(--sct-muted)' }}>{FACTOR_LABELS[k]}</span>
              <span className="font-mono" style={{ color: 'var(--sct-text)' }}>{(RISK_WEIGHTS[k] * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <p className="text-xs leading-relaxed mt-3" style={{ color: 'var(--sct-secondary)' }}>
          The MVRV factor uses the Z-Score (market cap minus realized cap, divided by historical volatility) rather than
          the raw MVRV ratio — the raw ratio is mathematically identical to the Realized Price factor, so Z-Score avoids
          double-counting the same signal. &quot;Power Law&quot; and &quot;Log Regression&quot; are the same model here and share one
          entry. The Price↔Risk Calculator holds today&apos;s moving averages, fair value, realized price, and volatility
          basis fixed and asks what risk would read if only the spot price were different.
        </p>
        <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--sct-secondary)' }}>
          This is a historical, educational model — not a guarantee, and not personalized financial advice.
        </p>
      </InsightPanel>
    </div>
  );
}
