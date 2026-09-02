import { PageHeader }              from '@/components/dashboard/PageHeader';
import { StatCard }                from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { fetchHousingData, HOUSING_SERIES } from '@/lib/api/fredHousing';
import {
  computeRealEstateScore,
  quadrantFor,
  labelFor,
  colorFor,
  type Pillar,
} from '@/lib/indicators/realEstateCycle';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';
import { fetchWeeklyHistory, type WeeklyClose } from '@/lib/api/yahoo';
import {
  computeHomebuilderSignal,
  BUILDERS,
  BENCHMARK,
  colorFor as builderColor,
} from '@/lib/indicators/homebuilderSignal';
import {
  buildRealSeries,
  detectCycleSegments,
  computeCyclePosition,
} from '@/lib/indicators/housingCycle';
import { HousingCycleSection } from '@/components/charts/HousingCycleSection';
import { computeDealWindow } from '@/lib/indicators/dealWindow';
import { ordinal } from '@/lib/format';

export const dynamic = 'force-dynamic';

const pct1 = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

const usd0 = (v: number | null) =>
  v == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

function Bar({ value, color }: { value: number | null; color: string }) {
  const w = value == null ? 0 : Math.max(2, Math.min(100, value));
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--sct-panel)' }}>
      <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

function PillarCard({ p }: { p: Pillar }) {
  const color = colorFor(p.score);
  return (
    <div
      className="rounded-xl border p-4 space-y-3 min-w-0"
      style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold min-w-0" style={{ color: 'var(--sct-text)' }}>{p.title}</p>
        <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--sct-muted)' }}>
          {(p.weight * 100).toFixed(0)}% weight
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-mono font-bold" style={{ color }}>
          {p.score == null ? '—' : Math.round(p.score)}
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--sct-muted)' }}>/ 100</span>
      </div>
      <Bar value={p.score} color={color} />

      <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>{p.blurb}</p>

      <div className="space-y-2 pt-1" style={{ borderTop: '1px solid var(--sct-line, var(--sct-border))' }}>
        {p.metrics.map((m) => (
          <div key={m.key} className="space-y-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs font-mono">
              <span className="min-w-0" style={{ color: 'var(--sct-secondary)' }}>{m.label}</span>
              <span className="shrink-0" style={{ color: 'var(--sct-text)' }}>{m.display}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0"><Bar value={m.score} color={colorFor(m.score)} /></div>
              <span className="text-[10px] font-mono shrink-0 w-16 text-right" style={{ color: 'var(--sct-muted)' }}>
                {m.percentile == null ? 'no pct' : `${ordinal(Math.round(m.percentile))} pct`}
              </span>
            </div>
            {m.depth === 'shallow' && (
              <p className="text-[10px]" style={{ color: '#E6B450' }}>10y history only — indicative</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function RealEstateCyclePage() {
  const housing = await fetchHousingData();
  const re = computeRealEstateScore(housing);

  // Builders, fetched alongside the FRED data. Each is allowed to fail on its
  // own — a missing ticker should cost one row of the group, not the section.
  const builderTickers = [...BUILDERS.map((b) => b.ticker), BENCHMARK];
  const builderSettled = await Promise.allSettled(builderTickers.map((t) => fetchWeeklyHistory(t)));
  const builderSeries: Record<string, WeeklyClose[]> = {};
  builderTickers.forEach((t, i) => {
    const r = builderSettled[i];
    builderSeries[t] = r.status === 'fulfilled' ? r.value : [];
  });
  const hb = computeHomebuilderSignal(builderSeries);

  // The Bitcoin side is the existing Skyline Cycle Score, inverted.
  //
  // That score runs low-is-cheap; this page runs high-is-opportunity. Inverting
  // at this boundary rather than inside the scorer keeps one place to look when
  // the two numbers seem to disagree.
  let btcOpportunity: number | null = null;
  let btcScoreRaw: number | null = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skylinecycleterminal.com'}/api/cycle`, {
      next: { revalidate: 900 },
    });
    if (res.ok) {
      const cycle = (await res.json()) as CycleScoreResult;
      btcScoreRaw = Math.round(cycle.score);
      btcOpportunity = 100 - btcScoreRaw;
    }
  } catch {
    // Leave null. The page still answers the housing half without it.
  }

  const quadrant = re.score != null && btcOpportunity != null
    ? quadrantFor(re.score, btcOpportunity)
    : null;

  const a = re.affordability;

  // The cycle backbone. Phases are derived from the deflated series and from the
  // pillars already computed above, so the chart and the score cannot disagree —
  // they are reading the same numbers.
  const cyclePoints   = buildRealSeries(housing.caseShiller, housing.cpi);
  const cycleSegments = detectCycleSegments(cyclePoints);
  const pillarScore = (key: string) => re.pillars.find((p) => p.key === key)?.score ?? null;
  const cyclePosition = computeCyclePosition({
    points:    cyclePoints,
    valuation: pillarScore('valuation'),
    supply:    pillarScore('supply'),
    credit:    pillarScore('credit'),
    builders:  hb.score,
  });

  // The Deal Window. Reads the same series as the pillars but asks a different
  // question — not "what are conditions" but "how far through the sequence that
  // precedes a buying window are we", which is what decides whether to prepare
  // or to deploy.
  const realChange12 =
    cyclePoints.length > 12
      ? ((cyclePoints[cyclePoints.length - 1].real - cyclePoints[cyclePoints.length - 13].real) /
         cyclePoints[cyclePoints.length - 13].real) * 100
      : null;

  // ITB is the group proxy, so its relative strength stands in for the sector's
  // rather than any single builder's idiosyncratic quarter.
  const itbRel = hb.builders.find((b) => b.ticker === 'ITB')?.relStrength ?? null;

  const deal = computeDealWindow({
    data:         housing,
    realChange12,
    builders:     hb.score,
    buildersRel:  itbRel,
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Real Estate & Business Cycle"
        subtitle="Where housing sits in its own history, and how that compares with Bitcoin — to answer whether this is a moment to deploy capital or hold it"
      />

      {/* Headline scores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Real Estate Opportunity"
          value={re.score == null ? '—' : `${Math.round(re.score)} / 100`}
          sub={re.label}
          accent={colorFor(re.score)}
          freshness="weekly"
        />
        <StatCard
          label="Bitcoin Opportunity"
          value={btcOpportunity == null ? '—' : `${btcOpportunity} / 100`}
          sub={btcOpportunity == null ? 'Cycle score unavailable' : `Skyline Cycle Score ${btcScoreRaw}, inverted`}
          accent={colorFor(btcOpportunity)}
        />
        <StatCard
          label="Median Payment / Income"
          value={a.paymentToIncome == null ? '—' : `${a.paymentToIncome.toFixed(1)}%`}
          sub={a.monthlyPayment == null ? 'Unavailable' : `${usd0(a.monthlyPayment)}/mo at ${a.mortgageRate?.toFixed(2)}%`}
          accent="#E6B450"
        />
        <StatCard
          label="Price / Income"
          value={a.priceToIncome == null ? '—' : `${a.priceToIncome.toFixed(2)}×`}
          sub={`${usd0(a.medianPrice)} vs ${usd0(a.medianIncome)}`}
          accent="var(--sct-text)"
        />
      </div>

      {/* Allocation quadrant */}
      {quadrant && re.score != null && btcOpportunity != null && (
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Capital allocation regime
            </p>
            <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>
              Both scored against their own history
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs font-mono">
                <span style={{ color: 'var(--sct-secondary)' }}>Real estate</span>
                <span style={{ color: colorFor(re.score) }}>{Math.round(re.score)} · {re.label}</span>
              </div>
              <Bar value={re.score} color={colorFor(re.score)} />
            </div>
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs font-mono">
                <span style={{ color: 'var(--sct-secondary)' }}>Bitcoin</span>
                <span style={{ color: colorFor(btcOpportunity) }}>{btcOpportunity} · {labelFor(btcOpportunity)}</span>
              </div>
              <Bar value={btcOpportunity} color={colorFor(btcOpportunity)} />
            </div>
          </div>

          <div
            className="rounded-lg border p-4 space-y-1.5"
            style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
          >
            <p className="text-sm font-semibold" style={{ color: '#F7931A' }}>{quadrant.title}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>{quadrant.read}</p>
          </div>
        </div>
      )}

      {/* The cycle backbone. Sits above the components because it is the frame
          they are read inside — the pillars say what conditions are, this says
          where those conditions have historically fallen in the long wave. */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <HousingCycleSection
          data={cyclePoints}
          segments={cycleSegments}
          position={cyclePosition}
          deal={{ stage: deal.stage, color: deal.color, fired: deal.fired, total: deal.total }}
        />
      </div>

      {/* Deal Window — the preparation timer.
          Sits directly under the cycle chart because it is the actionable half
          of the same question: the chart says where we are, this says what to
          be doing about it, and specifically how much runway is left. */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Deal Window
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              The conditions that precede a buying window, in the order they historically occur
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: deal.color }}>
              {deal.fired}
            </span>
            <span className="text-sm" style={{ color: 'var(--sct-muted)' }}>
              / {deal.total}
            </span>
            <span className="text-sm font-semibold ml-1" style={{ color: deal.color }}>
              {deal.stage}
            </span>
          </div>
        </div>

        <ol className="space-y-0">
          {deal.checkpoints.map((c) => (
            <li
              key={c.key}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2"
              style={{ borderTop: '1px solid var(--sct-border)' }}
            >
              <span
                className="font-mono text-xs w-5 shrink-0"
                style={{ color: c.fired ? deal.color : 'var(--sct-muted)' }}
              >
                {c.fired == null ? '—' : c.fired ? '✓' : '○'}
              </span>
              <span
                className="text-xs font-semibold min-w-0"
                style={{ color: c.fired ? 'var(--sct-text)' : 'var(--sct-muted)' }}
              >
                {c.order}. {c.title}
              </span>
              <span className="text-xs font-mono ml-auto" style={{ color: c.fired ? deal.color : 'var(--sct-muted)' }}>
                {c.reading}
              </span>
              <span className="text-xs basis-full pl-8" style={{ color: 'var(--sct-muted)' }}>
                {c.because}
              </span>
            </li>
          ))}
        </ol>

        <div
          className="rounded-lg border p-4 space-y-2"
          style={{ borderColor: 'var(--sct-border)', backgroundColor: 'var(--sct-panel)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-text)' }}>
            {deal.action}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
            {deal.waitingOn}
          </p>
        </div>
      </div>

      {/* Homebuilders — the leading leg */}
      <div
        className="rounded-xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              Homebuilder signal
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Builders trade daily; the housing data they lead is monthly and lagged
            </p>
          </div>
          <div className="flex items-baseline gap-2 shrink-0">
            <span className="text-2xl sm:text-3xl font-mono font-bold" style={{ color: hb.color }}>
              {hb.score == null ? '—' : Math.round(hb.score)}
            </span>
            <span className="text-xs font-mono" style={{ color: hb.color }}>{hb.label}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left py-1.5 pr-3 font-medium">Builder</th>
                <th className="text-right py-1.5 pr-3 font-medium">Price</th>
                <th className="text-right py-1.5 pr-3 font-medium">From 52w high</th>
                <th className="text-right py-1.5 pr-3 font-medium">vs 40w MA</th>
                <th className="text-right py-1.5 pr-3 font-medium">vs SPY 26w</th>
                <th className="text-right py-1.5 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {hb.builders.map((b) => (
                <tr key={b.ticker} style={{ borderTop: '1px solid var(--sct-border)' }}>
                  <td className="py-1.5 pr-3" style={{ color: 'var(--sct-text)' }}>
                    {b.ticker} <span style={{ color: 'var(--sct-muted)' }}>{b.name}</span>
                  </td>
                  <td className="py-1.5 pr-3 text-right" style={{ color: 'var(--sct-secondary)' }}>
                    {b.price == null ? '—' : `$${b.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                  </td>
                  <td className="py-1.5 pr-3 text-right" style={{ color: (b.drawdown ?? 0) < -15 ? '#FF5C5C' : 'var(--sct-secondary)' }}>
                    {pct1(b.drawdown)}
                  </td>
                  <td className="py-1.5 pr-3 text-right" style={{ color: (b.vsTrend ?? 0) < 0 ? '#F97316' : '#35D07F' }}>
                    {pct1(b.vsTrend)}
                  </td>
                  <td className="py-1.5 pr-3 text-right" style={{ color: (b.relStrength ?? 0) < 0 ? '#F97316' : '#35D07F' }}>
                    {pct1(b.relStrength)}
                  </td>
                  <td className="py-1.5 text-right font-semibold" style={{ color: builderColor(b.score) }}>
                    {b.score == null ? '—' : Math.round(b.score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: 'var(--sct-panel)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'var(--sct-secondary)' }}>{hb.read}</p>
        </div>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {re.pillars.map((p) => <PillarCard key={p.key} p={p} />)}
      </div>

      <InsightPanel title="How to read this">
        <InsightRow
          label="The 18-year cycle"
          value="Measured rather than assumed. On this data the real peaks fall in 1989, 2006 and 2022 — 16.8 and 16.0 years apart, close to the received 18-year figure but not equal to it, and a sample of two gaps. Treat the cycle as a description of how housing has behaved, not a schedule. That is why the current phase on the chart is derived from conditions and never from a year count."
        />
        <InsightRow
          label="Why prices are deflated"
          value="Nominal house prices rise through almost the whole record, which hides every cycle except 2008. In real terms a buyer at the 2006 peak waited until 2021 to break even in purchasing power — 14.8 years — while their nominal statement looked fine throughout. The current drawdown is only 3.7% in real terms, but prices have gone nowhere for three years, so the adjustment is happening through inflation instead of through falling prices."
        />
        <InsightRow
          label="Direction"
          value="High is opportunity. 100 means housing is cheap, loose and historically a good moment to buy; 0 means expensive and tight. Note this is the opposite polarity to the Skyline Cycle Score, where a LOW number means Bitcoin is cheap — the Bitcoin figure above is inverted so the two can sit side by side."
          stack
        />
        <InsightRow
          label="Why percentiles, not thresholds"
          value="A rule like 'over six months of supply is a buyer's market' sounds authoritative and misleads. Months-supply has a 63-year median of 5.5 and spent 2008 to 2011 above 8. What matters is where today sits in that distribution. Percentiles also survive a series being rebased, which fixed thresholds do not."
          stack
        />
        <InsightRow
          label="The credit pillar reads backwards on purpose"
          value="Tight lending and rising delinquency score as opportunity, because the best entry prices have historically coincided with the hardest financing. The catch is real: the moment a house is cheapest is frequently the moment you cannot get the loan. A high credit score here is a warning as much as an invitation."
          valueColor="#E6B450"
          stack
        />
        <InsightRow
          label="Affordability is computed, not fetched"
          value="FRED carries a housing affordability index (FIXHAI), but serves it as a rolling twelve months because NAR licenses it — a percentile over twelve observations says nothing. Payment-to-income is therefore built from median price, the 30-year rate and median income, all of which have four decades behind them. It excludes taxes and insurance, which vary too much by state for a national series to be honest about."
          stack
        />
        <InsightRow
          label="What this does not do"
          value="Housing is local and this is national. A national score cannot tell you about a specific metro, and the spread between metros is frequently wider than the national move. Treat it as the tide, not the boat."
          valueColor="#E6B450"
          stack
        />
      </InsightPanel>

      {/* Data coverage */}
      <div
        className="rounded-xl border p-5 space-y-3"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--sct-muted)' }}>
          Data coverage · {(re.coverage * 100).toFixed(0)}% of weight reporting
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono" style={{ minWidth: 460 }}>
            <thead>
              <tr style={{ color: 'var(--sct-muted)' }}>
                <th className="text-left py-1.5 pr-4 font-medium">Series</th>
                <th className="text-left py-1.5 pr-4 font-medium">Source</th>
                <th className="text-left py-1.5 font-medium">History</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(HOUSING_SERIES).map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--sct-border)' }}>
                  <td className="py-1.5 pr-4" style={{ color: 'var(--sct-secondary)' }}>{s.label}</td>
                  <td className="py-1.5 pr-4" style={{ color: 'var(--sct-muted)' }}>{s.source}</td>
                  <td className="py-1.5" style={{ color: s.depth === 'deep' ? '#35D07F' : '#E6B450' }}>
                    {s.depth === 'deep' ? 'full' : 'from 2016'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--sct-muted)' }}>
          Two series are deliberately absent. NAHB builder confidence is not on FRED, and the NAR
          affordability and existing-home-sales series are served as a rolling twelve months, which is
          too short to score against.
        </p>
      </div>
    </div>
  );
}
