import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard }   from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

import { MacroRiskGauge }         from '@/components/macro/MacroRiskGauge';
import { MacroSectionCard }       from '@/components/macro/MacroSectionCard';
import { MacroChecklist }         from '@/components/macro/MacroChecklist';
import { MacroImpactMeter }       from '@/components/macro/MacroImpactMeter';
import { MacroCorrelationMatrix } from '@/components/macro/MacroCorrelationMatrix';
import { MacroTimeline }          from '@/components/macro/MacroTimeline';
import { MacroScenarios }         from '@/components/macro/MacroScenarios';
import { MacroReportPanel }       from '@/components/macro/MacroReportPanel';
import { CycleVsMacroBridge }     from '@/components/macro/CycleVsMacroBridge';

import { fetchMacroTerminalData, type MacroTerminalData } from '@/lib/api/macroTerminal';
import { fetchFearGreed } from '@/lib/api/feargreed';
import { computeMacroRisk } from '@/lib/indicators/macroRisk';
import {
  buildBtcContext,
  buildMacroSummary,
  buildMacroReport,
  buildChecklist,
  buildScenarios,
  currentEra,
  MACRO_ERAS,
} from '@/lib/indicators/macroNarrative';

export const dynamic = 'force-dynamic';

const EMPTY: MacroTerminalData = {
  fedAssets: [], reverseRepo: [], tga: [], usM2: [], ecbAssets: [], bojAssets: [],
  usdPerEur: [], jpyPerUsd: [], spx: [], nasdaq: [], dow: [], russell: [], marginDebt: [],
  hyOas: [], igOas: [], cccOas: [], cpRate: [], tbill3m: [], lendingStd: [], bankCredit: [],
  nfci: [], dxy: [], realYield10y: [], ust10y: [], ust30y: [], yieldCurve: [],
  vix: [], vxn: [], ovx: [], gvz: [], move: [], btc: [], gold: [], stablecoins: [],
  btcHistory: [], fetchedAt: new Date().toISOString(),
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export default async function MacroTerminalPage() {
  const [dataRes, fgRes] = await Promise.allSettled([
    fetchMacroTerminalData(),
    fetchFearGreed(),
  ]);

  const data      = dataRes.status === 'fulfilled' ? dataRes.value : EMPTY;
  const fearGreed = fgRes.status  === 'fulfilled' ? fgRes.value.value : null;

  const risk      = computeMacroRisk(data, fearGreed);
  const btc       = buildBtcContext(data.btcHistory);
  const summary   = buildMacroSummary(risk, btc);
  const report    = buildMacroReport(risk, btc);
  const checklist = buildChecklist(risk);
  const scenarios = buildScenarios(risk, btc);
  const eras      = [...MACRO_ERAS, currentEra(risk, btc)];

  const dateStr = fmtDate(risk.asOf);

  const liq = risk.sections.find(s => s.key === 'liquidity');
  const eq  = risk.sections.find(s => s.key === 'equities');
  const cr  = risk.sections.find(s => s.key === 'credit');

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Skyline Macro Terminal"
        subtitle="Bitcoin looks cheap. Is the macro environment about to make it cheaper?"
      />

      {/* ── Data coverage warning ──────────────────────────────────────────── */}
      {risk.coverage < 0.95 && (
        <div
          className="rounded-xl border px-5 py-4 flex items-start gap-3"
          style={{
            backgroundColor: 'var(--sct-card)',
            borderColor:     risk.provisional ? '#FF5C5C' : '#E6B450',
          }}
        >
          <span className="text-base leading-none mt-0.5" style={{ color: risk.provisional ? '#FF5C5C' : '#E6B450' }}>
            ⚠
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: risk.provisional ? '#FF5C5C' : '#E6B450' }}>
              {risk.provisional
                ? `Provisional score: only ${(risk.coverage * 100).toFixed(0)}% of inputs returned data`
                : `Partial data: ${(risk.coverage * 100).toFixed(0)}% of inputs returned data`}
            </p>
            <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--sct-secondary)' }}>
              {risk.provisional
                ? 'The Macro Risk Score is calculated from the inputs that responded, so it currently reflects a narrow slice of the picture and should not be read at face value. '
                : 'Missing inputs are excluded rather than estimated, and the remaining weights are renormalised. '}
              {risk.missing.length > 0 && (
                <>Unavailable sections: <span className="font-mono">{risk.missing.join(', ')}</span>. </>
              )}
              Most upstream series come from FRED; a missing <span className="font-mono">FRED_API_KEY</span> or
              an upstream outage is the usual cause.
            </p>
          </div>
        </div>
      )}

      {/* ── Hero: gauge + read ─────────────────────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: risk.color }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="flex items-center justify-center p-6 border-b lg:border-b-0 lg:border-r"
            style={{ borderColor: 'var(--sct-border)' }}>
            <MacroRiskGauge score={risk.score} color={risk.color} />
          </div>

          <div className="p-6 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: risk.color }} />
              <p className="text-lg font-semibold" style={{ color: risk.color }}>{risk.headline}</p>
            </div>

            <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--sct-secondary)' }}>
              {summary}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 pt-4 border-t"
              style={{ borderColor: 'var(--sct-border)' }}>
              {risk.sections.map(s => (
                <div key={s.key}>
                  <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--sct-muted)' }}>
                    {s.title}
                  </p>
                  <p className="text-sm font-mono font-semibold" style={{ color: s.color }}>
                    {s.risk == null ? '—' : Math.round(s.risk)}
                    <span className="text-[10px] font-normal" style={{ color: 'var(--sct-muted)' }}>
                      {' '}· {(s.weight * 100).toFixed(0)}%
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Headline stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Macro Risk"
          value={risk.score == null ? '—' : `${risk.score} / 100`}
          sub={risk.band}
          accent={risk.color}
          freshness="daily"
        />
        <StatCard
          label="Liquidity Risk"
          value={liq?.risk == null ? '—' : `${Math.round(liq.risk)} / 100`}
          sub={liq?.status ?? '—'}
          accent={liq?.color}
        />
        <StatCard
          label="Credit Stress"
          value={cr?.risk == null ? '—' : `${Math.round(cr.risk)} / 100`}
          sub={cr?.status ?? '—'}
          accent={cr?.color}
        />
        <StatCard
          label="Equity Risk"
          value={eq?.risk == null ? '—' : `${Math.round(eq.risk)} / 100`}
          sub={eq?.status ?? '—'}
          accent={eq?.color}
        />
      </div>

      {/* ── Checklist ──────────────────────────────────────────────────────── */}
      <MacroChecklist items={checklist} />

      {/* ── The bridge + impact meter ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,380px)] gap-4 lg:gap-6">
        <CycleVsMacroBridge
          macroScore={risk.score}
          macroBand={risk.band}
          macroColor={risk.color}
        />
        <MacroImpactMeter impact={risk.impact} score={risk.score} />
      </div>

      {/* ── Daily report ───────────────────────────────────────────────────── */}
      <MacroReportPanel
        report={report}
        score={risk.score}
        band={risk.band}
        color={risk.color}
        date={dateStr}
      />

      {/* ── Six sections ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--sct-muted)' }}>
          Macro Dashboard · Six Lenses
        </p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {risk.sections.map(s => <MacroSectionCard key={s.key} section={s} />)}
        </div>
      </div>

      {/* ── Scenarios ──────────────────────────────────────────────────────── */}
      <MacroScenarios scenarios={scenarios} />

      {/* ── Timeline + correlations ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <MacroTimeline eras={eras} />
        <MacroCorrelationMatrix rows={risk.correlations} />
      </div>

      {/* ── Methodology ────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border px-5 py-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--sct-muted)' }}>
          Methodology Note
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          Every number on this page runs in the same direction:{' '}
          <strong style={{ color: 'var(--sct-text)' }}>0 means macro conditions are supportive of Bitcoin, 100 means they are hostile.</strong>{' '}
          That includes Liquidity, which is shown as liquidity <em>risk</em>. A high reading means
          liquidity is draining, not that liquidity is strong. Each metric is scored against
          historical anchors or against its own distribution since 2006, then blended by the weights
          shown on each section card. Where a data source is unavailable, that metric is excluded and
          the section&apos;s remaining weights are renormalised rather than back-filled with an assumption.
          This is a simplified heuristic built from publicly available macro data. It measures the
          current environment and what similar conditions have meant historically.{' '}
          <strong style={{ color: 'var(--sct-text)' }}>It is not a prediction and not financial advice.</strong>
        </p>
      </div>

      <InsightPanel title="How to read this page">
        <InsightRow
          label="What this answers"
          value="The Skyline Cycle Score already answers whether Bitcoin is cheap. This page answers whether the rest of the financial system is likely to help or fight Bitcoin over the coming months. Bitcoin does not trade in a vacuum: if global liquidity contracts, leverage unwinds, or equities enter a major bear market, price can fall further even when on-chain metrics suggest long-term value."
          stack
        />
        <InsightRow
          label="Liquidity (30%)"
          value="Fed net liquidity, the combined Fed/ECB/BOJ balance sheet, US M2 and stablecoin supply. Weighted highest because liquidity has led every Bitcoin cycle turn, usually by months."
          valueColor="#35D07F"
          stack
        />
        <InsightRow
          label="Credit (20%) & Equities (20%)"
          value="Credit spreads reprice risk before equities do, and equities reprice before crypto. Together these capture the forced-deleveraging channel, the mechanism by which an equity bear market reaches Bitcoin regardless of its own fundamentals."
          stack
        />
        <InsightRow
          label="Dollar & Rates (15%), Volatility (10%), Psychology (5%)"
          value="The dollar sets global financial conditions; volatility is what mechanically forces funds to cut exposure; sentiment sets how violent the move becomes once it starts. Psychology is weighted lightest because it is the noisiest."
          stack
        />
        <InsightRow
          label="Known gaps"
          value="China liquidity (FRED discontinued its China M2 series in 2019), advance-decline line, put/call ratio, AAII and CNN sentiment surveys, credit default swaps and corporate default rates all lack a free data source and are excluded rather than estimated. Margin debt is quarterly and lags by roughly one quarter."
          valueColor="#E6B450"
          stack
        />
        <InsightRow
          label="Sources"
          value="FRED (St. Louis Fed) for liquidity, credit, rates, dollar and volatility · Yahoo Finance for Russell 2000, MOVE and gold · DeFiLlama for stablecoin supply · CoinMetrics for Bitcoin price · alternative.me for Fear & Greed"
          stack
        />
      </InsightPanel>
    </div>
  );
}
