import { fetchBTCDailyPrice } from "@/lib/api/coinmetrics";
import { assignCycles, getCurrentCycleInfo, CYCLE_STROKE, CYCLE_LABEL } from "@/lib/indicators/cycleHelpers";
import { FourYearCyclePageClient } from "@/components/charts/FourYearCyclePageClient";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { InsightPanel, InsightRow } from "@/components/dashboard/InsightPanel";

export const dynamic = 'force-dynamic';

export default async function FourYearCyclePage() {
  const info = getCurrentCycleInfo();

  let chartData: Awaited<ReturnType<typeof assignCycles>> = [];
  let fetchError = false;

  try {
    const prices = await fetchBTCDailyPrice('2012-01-01');
    chartData = assignCycles(prices);
  } catch {
    fetchError = true;
  }

  const cycleColor = CYCLE_STROKE[info.currentCycleNum] ?? 'var(--sct-text)';
  const progressColor =
    info.cycleProgress > 75
      ? 'var(--sct-red)'
      : info.cycleProgress > 50
      ? 'var(--sct-amber)'
      : 'var(--sct-green)';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Bitcoin 4-Year Cycle"
        subtitle="Halving-driven cycle epochs — log scale · accumulate in early cycles, distribute near peaks"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Current Cycle"
          value={`Cycle ${info.currentCycleNum}`}
          sub={CYCLE_LABEL[info.currentCycleNum]}
          accent={cycleColor}
          freshness="daily"
        />
        <StatCard
          label="Days Since Halving"
          value={info.daysSince.toLocaleString()}
          sub="of ~1,460 day epoch"
          accent="var(--sct-text)"
        />
        <StatCard
          label="Next Halving"
          value={`${info.daysToNext.toLocaleString()} days`}
          sub={`est. ${info.nextHalving.date}`}
          accent="var(--sct-muted)"
        />
        <StatCard
          label="Cycle Progress"
          value={`${info.cycleProgress}%`}
          sub="of 4-year window"
          accent={progressColor}
        />
      </div>

      {/* Main chart */}
      {fetchError ? (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <div
            className="h-[480px] flex items-center justify-center rounded-lg border text-sm"
            style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
          >
            Unable to load price data — CoinMetrics API unreachable
          </div>
        </div>
      ) : (
        <FourYearCyclePageClient
          chartData={chartData}
          currentCycleNum={info.currentCycleNum}
          daysSince={info.daysSince}
          cycleProgress={info.cycleProgress}
          daysToNext={info.daysToNext}
          nextHalvingDate={info.nextHalving.date}
        />
      )}

      {/* Insight panel */}
      <InsightPanel title="Cycle Framework">
        <InsightRow
          label="Mechanism"
          value="Bitcoin's supply issuance halves every ~210,000 blocks (~4 years). Supply shocks historically precede major price expansion 12–18 months post-halving."
          stack
        />
        <InsightRow
          label="Current Position"
          value={`Cycle ${info.currentCycleNum} — ${info.daysSince} days since the Apr 20, 2024 halving`}
          valueColor={cycleColor}
          stack
        />
        <InsightRow
          label="Cycle Progress"
          value={`${info.cycleProgress}% through the ~1,460-day epoch`}
          valueColor={progressColor}
          stack
        />
        <InsightRow
          label="Signal Use"
          value="Structural context only. Confirm with MVRV Z-Score, Puell Multiple, and the Skyline Cycle Score before acting."
          stack
        />
        <InsightRow
          label="Past Cycle Peaks"
          value="C1: Nov 2013 ($1,177) · C2: Dec 2017 ($19.8K) · C3: Nov 2021 ($69K)"
          stack
        />
      </InsightPanel>
    </div>
  );
}
