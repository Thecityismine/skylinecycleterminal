"use client";

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { InsightPanel } from '@/components/dashboard/InsightPanel';
import { RiskGauge } from '@/components/charts/RiskGauge';
import { BTCSevenYearCycleChart } from '@/components/charts/BTCSevenYearCycleChart';
import type { CycleMarker } from '@/components/charts/BTCSevenYearCycleChart';
import { SevenYearCycleShareModal } from '@/components/share/SevenYearCycleShareModal';
import type { SevenYearCycleSharePayload } from '@/components/share/SevenYearCycleShareCard';
import {
  SEVEN_YEAR_EVENTS, INSTITUTIONAL_ERAS, NEXT_HALVING,
  daysUntilWindow, sevenYearPhase, eventRelevance,
  calculateSevenYearStressScore, stressBandFor,
  buildSevenYearAlignmentStats, buildScenarioBands, buildThesisScoreboard,
  STRESS_FACTOR_LABELS, STRESS_WEIGHTS,
} from '@/lib/cycles/sevenYearCycle';
import type { StressFactorKey } from '@/lib/cycles/sevenYearCycle';
import { HALVINGS } from '@/lib/indicators/halvingCycles';
import { CYCLE_ANCHORS, getValidationMetrics, getActiveCyclePosition, type CyclePhase } from '@/lib/indicators/cycleAnchors';
import type { PricePoint } from '@/lib/api/coinmetrics';
import type { CrossAssetPoint } from '@/lib/api/crossAsset';
import type { MacroDataPoint, LiquiditySeriesData } from '@/lib/api/fred';
import type { StablecoinHistoryPoint } from '@/lib/api/defillama';

type Props = {
  btcPrices:    PricePoint[];
  crossAsset:   CrossAssetPoint[];
  liquidity:    LiquiditySeriesData;
  yieldCurve:   MacroDataPoint[];
  creditSpread: MacroDataPoint[];
  stablecoins:  StablecoinHistoryPoint[];
};

type ModelView = '4year' | '7year' | 'both';

const FOUR_YEAR_PHASE_LABEL: Record<CyclePhase, string> = {
  expansion:     'Expansion',
  'peak-risk':   'Peak Risk',
  distribution:  'Distribution',
  accumulation:  'Accumulation',
  'beyond-model': 'Beyond Model',
};

function toTs(date: string): number {
  return new Date(date + 'T00:00:00Z').getTime();
}

function fmtUSD(v: number | null): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
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

export function SevenYearCyclePageClient({ btcPrices, crossAsset, liquidity, yieldCurve, creditSpread, stablecoins }: Props) {
  const [modelView, setModelView] = useState<ModelView>('both');
  const [showInstitutionalEras, setShowInstitutionalEras] = useState(false);
  const [showScenarioBands, setShowScenarioBands] = useState(true);

  const weeklyPoints = useMemo(
    () => btcPrices
      .filter((_, i) => i % 7 === 0 || i === btcPrices.length - 1)
      .map((p) => ({ ts: toTs(p.time), time: p.time, price: p.price })),
    [btcPrices],
  );

  const halvingMarkers = useMemo(() => HALVINGS.map((h) => ({ ts: h.ts, label: h.label, estimated: h.estimated })), []);

  const stressWindows = useMemo(() => SEVEN_YEAR_EVENTS.map((e) => ({
    startTs: toTs(e.startDate), endTs: toTs(e.endDate), label: e.label, projected: !!e.projected,
  })), []);

  const institutionalEraMarkers = useMemo(() => INSTITUTIONAL_ERAS.map((e) => ({
    startTs: toTs(e.start), endTs: e.end ? toTs(e.end) : null, label: e.label, color: e.color,
  })), []);

  const cycleMarkers: CycleMarker[] = useMemo(() => {
    const out: CycleMarker[] = [];
    for (const c of CYCLE_ANCHORS) {
      out.push({ ts: toTs(c.lowDate), price: c.lowPrice, kind: 'low', label: `${c.label} Low` });
      if (c.highDate && c.highPrice) out.push({ ts: toTs(c.highDate), price: c.highPrice, kind: 'high', label: `${c.label} High` });
    }
    return out;
  }, []);

  const stressResult = useMemo(() => calculateSevenYearStressScore({
    today: new Date(),
    yieldCurve, creditSpread,
    dxy: liquidity.dxy, realYield: liquidity.realYield, m2: liquidity.m2, fedBalance: liquidity.fedBalance,
    crossAsset, btcPrices, stablecoins,
  }), [yieldCurve, creditSpread, liquidity, crossAsset, btcPrices, stablecoins]);

  const alignmentStats = useMemo(() => buildSevenYearAlignmentStats(), []);
  const halvingMetrics = useMemo(() => getValidationMetrics(), []);
  const activePosition = useMemo(() => getActiveCyclePosition(halvingMetrics), [halvingMetrics]);

  const currentPrice = btcPrices.at(-1)?.price ?? 0;
  const scenarioBands = useMemo(() => buildScenarioBands(currentPrice), [currentPrice]);
  const thesisScoreboard = useMemo(() => buildThesisScoreboard(alignmentStats, stressResult, btcPrices), [alignmentStats, stressResult, btcPrices]);

  const projectedEvent = SEVEN_YEAR_EVENTS.find((e) => e.projected)!;
  const daysToWindow = daysUntilWindow(new Date(), new Date(projectedEvent.startDate + 'T00:00:00Z'), new Date(projectedEvent.endDate + 'T00:00:00Z'));
  const insideWindow = new Date() >= new Date(projectedEvent.startDate + 'T00:00:00Z') && new Date() <= new Date(projectedEvent.endDate + 'T00:00:00Z');
  const sevenYearPhaseLabel = sevenYearPhase(daysToWindow, insideWindow);

  const fourYearRisk = activePosition.currentPhase === 'peak-risk' || activePosition.currentPhase === 'distribution' ? 'high'
    : activePosition.currentPhase === 'expansion' || activePosition.currentPhase === 'accumulation' ? 'low' : 'neutral';
  const sevenYearRisk = sevenYearPhaseLabel === 'Stress Watch' || sevenYearPhaseLabel === 'Active Stress Window' ? 'high'
    : sevenYearPhaseLabel === 'Expansion' ? 'low' : 'neutral';
  const modelAgreement = fourYearRisk === sevenYearRisk ? 'High' : (fourYearRisk === 'neutral' || sevenYearRisk === 'neutral') ? 'Mixed' : 'Low';
  const agreementColor = modelAgreement === 'High' ? '#35D07F' : modelAgreement === 'Mixed' ? '#E6B450' : '#F85149';

  const band = stressResult.score != null ? stressBandFor(stressResult.score) : null;

  const sharePayload: SevenYearCycleSharePayload = {
    price: currentPrice,
    stressScore: stressResult.score,
    stressLabel: band?.label ?? '—',
    fourYearPhase: FOUR_YEAR_PHASE_LABEL[activePosition.currentPhase],
    sevenYearPhase: sevenYearPhaseLabel,
    modelAgreement,
    thesisOverall: thesisScoreboard.overall,
    thesisVerdict: thesisScoreboard.verdict,
    generatedAt: new Date().toISOString(),
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin 7-Year Stress Cycle"
        subtitle="Testing Bitcoin against recurring seven-year financial stress windows and four-year halving cycles"
      />

      {/* Model comparison header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>Four-Year Halving Model</p>
          <p className="text-lg font-bold" style={{ color: '#F7931A' }}>{FOUR_YEAR_PHASE_LABEL[activePosition.currentPhase]}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>Next halving: {NEXT_HALVING.label} — est. {fmtDate(NEXT_HALVING.date)}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>Seven-Year Stress Model</p>
          <p className="text-lg font-bold" style={{ color: '#F85149' }}>{sevenYearPhaseLabel}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>Next window: {fmtDate(projectedEvent.startDate)} – {fmtDate(projectedEvent.endDate)}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
          <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--sct-muted)' }}>Model Agreement</p>
          <p className="text-lg font-bold" style={{ color: agreementColor }}>{modelAgreement}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sct-muted)' }}>Do both models currently point the same direction?</p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-xl border p-4 flex flex-wrap items-center gap-x-8 gap-y-3" style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider mr-1" style={{ color: 'var(--sct-muted)' }}>Model View</span>
          <ControlButton active={modelView === '4year'} onClick={() => setModelView('4year')}>4-Year Halving Cycle</ControlButton>
          <ControlButton active={modelView === '7year'} onClick={() => setModelView('7year')}>7-Year Stress Cycle</ControlButton>
          <ControlButton active={modelView === 'both'} onClick={() => setModelView('both')}>Show Both</ControlButton>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider mr-1" style={{ color: 'var(--sct-muted)' }}>Layers</span>
          <ControlButton active={showInstitutionalEras} onClick={() => setShowInstitutionalEras((v) => !v)}>Institutional Eras</ControlButton>
          <ControlButton active={showScenarioBands} onClick={() => setShowScenarioBands((v) => !v)}>Scenario Bands</ControlButton>
        </div>
      </div>

      {/* Main chart */}
      <Card
        title="BTC Price, Log Scale — Weekly"
        right={<SevenYearCycleShareModal payload={sharePayload} />}
      >
        <BTCSevenYearCycleChart
          points={weeklyPoints}
          halvings={halvingMarkers}
          stressWindows={stressWindows}
          institutionalEras={institutionalEraMarkers}
          cycleMarkers={cycleMarkers}
          scenarioBands={scenarioBands}
          showHalvings={modelView !== '7year'}
          showStressWindows={modelView !== '4year'}
          showInstitutionalEras={showInstitutionalEras}
          showScenarioBands={showScenarioBands}
        />
        <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] font-mono" style={{ color: 'var(--sct-muted)' }}>
          <span><span style={{ color: '#F7931A' }}>┊</span> Halvings</span>
          <span><span style={{ color: '#F85149' }}>▭</span> 7-Year Stress Windows</span>
          <span><span style={{ color: '#38BDF8' }}>●</span> Confirmed Cycle Lows</span>
          <span><span style={{ color: '#FF5C8A' }}>●</span> Confirmed Cycle Highs</span>
          {showScenarioBands && <span><span style={{ color: '#35D07F' }}>▭</span> Scenario Bands (2028–2029)</span>}
        </div>
      </Card>

      {/* Stress score + model comparison stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card title="Seven-Year Stress Score">
          <div className="flex flex-col items-center">
            <RiskGauge score={stressResult.score != null ? stressResult.score / 100 : null} label={band?.label ?? 'Insufficient data'} size={220} />
            <p className="text-xs mt-2" style={{ color: 'var(--sct-muted)' }}>
              Confidence: {stressResult.confidencePct.toFixed(0)}% of weighted inputs available
            </p>
          </div>
          <div className="mt-4 space-y-1.5">
            {(Object.keys(STRESS_WEIGHTS) as StressFactorKey[]).map((k) => {
              const v = stressResult.factors[k];
              return (
                <div key={k} className="flex justify-between text-xs">
                  <span style={{ color: 'var(--sct-muted)' }}>{STRESS_FACTOR_LABELS[k]} ({(STRESS_WEIGHTS[k] * 100).toFixed(0)}%)</span>
                  <span className="font-mono" style={{ color: 'var(--sct-text)' }}>{v != null ? v.toFixed(0) : '—'}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Model Comparison Statistics">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left pb-2 pr-4">Metric</th>
                <th className="text-right pb-2 pr-4">Halving Model</th>
                <th className="text-right pb-2">7-Year Stress Model</th>
              </tr>
            </thead>
            <tbody style={{ color: 'var(--sct-secondary)' }}>
              <tr style={{ borderTop: '1px solid var(--sct-border)' }}>
                <td className="py-1.5 pr-4" style={{ color: 'var(--sct-muted)' }}>Best-fit timing</td>
                <td className="py-1.5 pr-4 text-right">{halvingMetrics.lowToHigh.median}d low→high</td>
                <td className="py-1.5 text-right">±{alignmentStats.avgErrorDays ?? '—'}d</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--sct-border)' }}>
                <td className="py-1.5 pr-4" style={{ color: 'var(--sct-muted)' }}>Average error</td>
                <td className="py-1.5 pr-4 text-right">±{halvingMetrics.lowToHigh.stddev}d</td>
                <td className="py-1.5 text-right">{alignmentStats.avgErrorDays != null ? `${alignmentStats.avgErrorDays}d` : '—'}</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--sct-border)' }}>
                <td className="py-1.5 pr-4" style={{ color: 'var(--sct-muted)' }}>Alignment rate</td>
                <td className="py-1.5 pr-4 text-right">—</td>
                <td className="py-1.5 text-right">{alignmentStats.alignmentPct != null ? `${alignmentStats.alignmentPct}%` : '—'}</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--sct-border)' }}>
                <td className="py-1.5 pr-4" style={{ color: 'var(--sct-muted)' }}>Sample size</td>
                <td className="py-1.5 pr-4 text-right">{halvingMetrics.completedCycles}</td>
                <td className="py-1.5 text-right">{alignmentStats.sampleSize}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[10px] mt-3" style={{ color: 'var(--sct-muted)' }}>
            Both sample sizes are very small (n≤2). Neither model has enough completed cycles to be statistically conclusive —
            treat both as hypotheses under test, not proven laws.
          </p>
        </Card>
      </div>

      {/* Scenario map */}
      <Card title="2028–2029 Scenario Map">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4" style={{ backgroundColor: 'rgba(53,208,127,0.06)', borderColor: 'rgba(53,208,127,0.3)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#35D07F' }}>Scenario A — Halving Dominates</p>
            <p className="text-sm font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{fmtUSD(scenarioBands.bullish.low)} – {fmtUSD(scenarioBands.bullish.high)}</p>
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              2028 halving liquidity expands, BTC rallies into 2029, the traditional four-year pattern survives.
            </p>
          </div>
          <div className="rounded-lg border p-4" style={{ backgroundColor: 'rgba(230,180,80,0.06)', borderColor: 'rgba(230,180,80,0.3)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#E6B450' }}>Scenario C — Hybrid Cycle</p>
            <p className="text-sm font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{fmtUSD(scenarioBands.hybrid.low)} – {fmtUSD(scenarioBands.hybrid.high)}</p>
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              BTC rallies into or shortly after the halving, macro stress arrives later in 2029 — a compressed bull market
              followed by a sharp reset. The most historically typical pattern.
            </p>
          </div>
          <div className="rounded-lg border p-4" style={{ backgroundColor: 'rgba(248,81,73,0.06)', borderColor: 'rgba(248,81,73,0.3)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#F85149' }}>Scenario B — Stress Dominates</p>
            <p className="text-sm font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{fmtUSD(scenarioBands.stress.low)} – {fmtUSD(scenarioBands.stress.high)}</p>
            <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
              Macro stress appears during 2028–2029, the halving tailwind is overwhelmed, risk assets draw down.
            </p>
          </div>
        </div>
        <p className="text-[10px] mt-4" style={{ color: 'var(--sct-muted)' }}>
          Ranges are systematically derived from historical low→high multiples ({getValidationMetrics().completedCycles} completed
          cycles) and the 2021–2022 cycle&apos;s drawdown, not hand-picked forecasts — and are illustrative, not predictions.
        </p>
      </Card>

      {/* Thesis scoreboard */}
      <Card title="7-Year Thesis Scoreboard">
        <div className="space-y-3">
          {[
            { label: 'Timing alignment', value: thesisScoreboard.timingAlignment },
            { label: 'Macro stress confirmation', value: thesisScoreboard.macroStressConfirmation },
            { label: 'Institutional-cycle evidence', value: thesisScoreboard.institutionalEvidence },
            { label: 'BTC price confirmation', value: thesisScoreboard.btcPriceConfirmation },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--sct-secondary)' }}>{row.label}</span>
                <span className="font-mono font-bold" style={{ color: 'var(--sct-text)' }}>{row.value} / 100</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-border)' }}>
                <div className="h-full rounded-full" style={{ width: `${row.value}%`, backgroundColor: '#5B84FF' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--sct-border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>Overall</span>
          <span className="text-lg font-mono font-bold" style={{ color: thesisScoreboard.verdict === 'Confirmed' ? '#35D07F' : thesisScoreboard.verdict === 'Mixed / Watch' ? '#E6B450' : '#F85149' }}>
            {thesisScoreboard.overall} / 100, {thesisScoreboard.verdict}
          </span>
        </div>
      </Card>

      {/* Historical event table */}
      <Card title="Historical Seven-Year Reference Events">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ color: 'var(--sct-muted)' }}>
              <th className="text-left pb-2 pr-4">Year</th>
              <th className="text-left pb-2 pr-4">Event</th>
              <th className="text-left pb-2 pr-4">Category</th>
              <th className="text-left pb-2">Model Relevance</th>
            </tr>
          </thead>
          <tbody>
            {SEVEN_YEAR_EVENTS.map((ev) => (
              <tr key={ev.year} style={{ borderTop: '1px solid var(--sct-border)' }}>
                <td className="py-1.5 pr-4" style={{ color: ev.projected ? '#F7931A' : 'var(--sct-text)' }}>{ev.year}</td>
                <td className="py-1.5 pr-4" style={{ color: 'var(--sct-secondary)' }}>{ev.label}</td>
                <td className="py-1.5 pr-4" style={{ color: 'var(--sct-muted)' }}>{ev.category}</td>
                <td className="py-1.5" style={{ color: 'var(--sct-muted)' }}>{eventRelevance(ev)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Methodology */}
      <InsightPanel title="Model Validation Rules & Interpretation">
        <div className="space-y-3 text-xs leading-relaxed">
          <p>
            <span className="font-semibold" style={{ color: 'var(--sct-text)' }}>Seven-year thesis strengthens when:</span>{' '}
            macro stress rises materially during 2028–2029, credit spreads widen, liquidity contracts, equity volatility
            expands, and BTC weakens despite halving-related optimism.
          </p>
          <p>
            <span className="font-semibold" style={{ color: 'var(--sct-text)' }}>Seven-year thesis weakens when:</span>{' '}
            liquidity remains supportive, credit conditions stay calm, BTC sustains a post-halving expansion, and the
            projected stress window passes without major dislocation.
          </p>
          <p>
            <span className="font-semibold" style={{ color: 'var(--sct-text)' }}>Four-year thesis strengthens when:</span>{' '}
            BTC forms a major expansion after the 2028 halving, peak timing resembles prior halving cycles, and on-chain
            distribution follows familiar patterns.
          </p>
          <p className="pt-2" style={{ borderTop: '1px solid var(--sct-border)', color: 'var(--sct-secondary)' }}>
            The seven-year model identifies recurring financial-stress periods around 1987, 1994, 2001, 2008, 2015, and
            2022. Bitcoin only existed during the latter portion of this history, so most observations are macro context
            rather than direct Bitcoin evidence — and the 2015/2022 alignment shown above is also partly circular, since
            those years were chosen in part for having notable BTC moves. The next proposed stress window is September
            2028 through September 2029.
          </p>
          <p style={{ color: 'var(--sct-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--sct-text)' }}>Current conclusion:</span> the thesis is
            worth monitoring, but it is not yet confirmed. Macro liquidity, credit conditions, Bitcoin trend structure, and
            the 2028 halving response will determine whether the seven-year model adds value beyond the traditional
            halving framework.
          </p>
          <p className="text-[10px]" style={{ color: 'var(--sct-muted)' }}>
            Equity-stress uses S&amp;P 500 / Nasdaq drawdown rather than a volatility index. All macro inputs (yield curve,
            credit spread, DXY, real yield, M2, Fed balance sheet, stablecoin supply) that are unavailable at render time
            are excluded and the remaining weights renormalized — see the Confidence figure on the stress score. This is
            educational, hypothesis-testing content, not financial advice.
          </p>
        </div>
      </InsightPanel>
    </div>
  );
}
