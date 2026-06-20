import { fetchReserveRiskData } from '@/lib/api/coinmetrics';
import { computeReserveRisk, rrSignal } from '@/lib/indicators/reserveRisk';
import { ReserveRiskChart } from '@/components/charts/ReserveRiskChart';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export const revalidate = 86400;

export default async function ReserveRiskPage() {
  let result: Awaited<ReturnType<typeof computeReserveRisk>> | null = null;
  let fetchError = false;

  try {
    const raw = await fetchReserveRiskData('2012-01-01');
    result = computeReserveRisk(raw);
  } catch {
    fetchError = true;
  }

  const cur    = result?.current;
  const zones  = result?.zones  ?? { accumulate: 0, caution: 0, distribution: 0 };
  const signal = rrSignal(cur?.reserveRisk ?? null, zones);
  const trend  = result?.trend ?? 'Neutral';

  // Score: 0–100 based on zone position
  function scoreFromRR(rr: number | null): number | null {
    if (rr == null || !result?.available) return null;
    const { accumulate, caution, distribution } = zones;
    if (rr < accumulate)   return Math.round((rr / accumulate) * 25);
    if (rr < caution)      return Math.round(25 + ((rr - accumulate) / (caution - accumulate)) * 35);
    if (rr < distribution) return Math.round(60 + ((rr - caution) / (distribution - caution)) * 25);
    return Math.min(100, Math.round(85 + ((rr - distribution) / distribution) * 15));
  }

  const cycleScore = scoreFromRR(cur?.reserveRisk ?? null);

  const trendColor =
    trend === 'Improving'     ? 'var(--sct-green)'
    : trend === 'Deteriorating' ? 'var(--sct-red)'
    : 'var(--sct-muted)';

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Reserve Risk"
        subtitle="Long-term holder conviction versus price — slow-moving macro confirmation tool"
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Reserve Risk"
          value={cur?.reserveRisk != null ? cur.reserveRisk.toFixed(5) : '—'}
          sub={result?.available ? signal.label.split(' · ')[0] : 'Data unavailable'}
          accent={signal.color}
          freshness="daily"
          source="CoinMetrics (proxy)"
        />
        <StatCard
          label="Signal"
          value={result?.available ? signal.label.split(' · ')[0] : '—'}
          sub={result?.available ? signal.label.split(' · ')[1] ?? '' : 'SplyAct1yr required'}
          accent={signal.color}
          freshness="daily"
        />
        <StatCard
          label="Cycle Score"
          value={cycleScore != null ? `${cycleScore} / 100` : '—'}
          sub={cycleScore != null
            ? cycleScore < 30 ? 'Deep value zone'
            : cycleScore < 55 ? 'Mid-cycle expansion'
            : cycleScore < 75 ? 'Elevated cycle risk'
            : 'Late-cycle conditions'
            : 'Insufficient data'}
          accent={signal.color}
          freshness="daily"
        />
        <StatCard
          label="Trend"
          value={result?.available ? trend : '—'}
          sub="vs. 30-day moving average"
          accent={trendColor}
          freshness="daily"
        />
      </div>

      {/* Zone badge */}
      {result?.available && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: signal.color }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: signal.color }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: signal.color }}>
              {signal.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Treat as a slow-moving macro backdrop — confirm signals with MVRV and Puell before acting.
            </p>
          </div>
        </div>
      )}

      {/* Main chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              BTC Price (log) · Reserve Risk
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Dashed verticals = cycle tops (red) and bottoms (blue) · Zones derived from historical distribution
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--sct-muted)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 opacity-80" style={{ backgroundColor: 'rgba(247,249,252,0.85)' }} />
              BTC Price
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5" style={{ backgroundColor: '#A855F7' }} />
              Reserve Risk
            </span>
          </div>
        </div>

        {fetchError || !result?.available ? (
          <div
            className="h-[380px] flex items-center justify-center rounded-lg border text-sm text-center px-8"
            style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
          >
            Reserve Risk data requires SplyAct1yr (1-year active supply) from CoinMetrics.
            This metric may not be available in the Community free tier.
          </div>
        ) : (
          <ReserveRiskChart data={result.points} zones={zones} />
        )}
      </div>

      {/* Insight panel */}
      <InsightPanel title="Indicator Logic">
        <InsightRow
          label="What it measures"
          value="The relationship between Bitcoin's current price and the conviction of long-term holders. Low readings mean holders are sitting on large opportunity costs without selling — historically the strongest entry zones."
          stack
        />
        <InsightRow
          label="Accumulation Signal"
          value="Reserve Risk in the blue zone — long-term holders have high conviction, price is not yet elevated relative to their patience. Historically aligned with multi-year entry points."
          valueColor="var(--sct-blue)"
          stack
        />
        <InsightRow
          label="Late-Cycle Signal"
          value="Reserve Risk entering the red zone — price has risen enough that even patient holders begin distributing. Has marked or preceded every major cycle top."
          valueColor="var(--sct-red)"
          stack
        />
        <InsightRow
          label="How Skyline uses it"
          value="Macro confirmation only. Does not trigger buy or sell signals alone. Cross-reference with MVRV Z-Score, Puell Multiple, and the Skyline Cycle Score before acting."
          stack
        />
        <InsightRow
          label="Source"
          value="Proxy computed from CoinMetrics Community API · SplyCur and SplyAct1yr (1-year active supply) · Calibrated HODL Bank methodology"
          stack
        />
      </InsightPanel>
    </div>
  );
}
