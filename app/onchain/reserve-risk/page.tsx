import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { computeNUPL, nuplSignal } from '@/lib/indicators/nupl';
import { NUPLChartSection } from '@/components/charts/NUPLChartSection';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';

export const revalidate = 86400;

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n);
}

export default async function NUPLPage() {
  let result: Awaited<ReturnType<typeof computeNUPL>> | null = null;

  try {
    const prices = await fetchBTCDailyPrice('2012-01-01');
    result = computeNUPL(prices);
  } catch {
    // handled below
  }

  const cur = result?.current;
  const sig = nuplSignal(cur?.nupl ?? null);

  // Trend: compare current NUPL to 30-day prior
  let trend = 'Neutral';
  let trendColor = 'var(--sct-muted)';
  if (result?.points) {
    const pts = result.points.filter((p) => p.nupl != null);
    const last30 = pts.slice(-30).map((p) => p.nupl!);
    const ma30 = last30.length > 0 ? last30.reduce((s, v) => s + v, 0) / last30.length : null;
    if (cur?.nupl != null && ma30 != null) {
      if (cur.nupl < ma30 - 0.02) { trend = 'Improving'; trendColor = 'var(--sct-green)'; }
      else if (cur.nupl > ma30 + 0.02) { trend = 'Deteriorating'; trendColor = 'var(--sct-red)'; }
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="NUPL — Net Unrealized Profit / Loss"
        subtitle="Cycle sentiment proxy: (Price − 2Y MA) / Price · positive = market in unrealized profit, negative = aggregate loss"
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="NUPL"
          value={cur?.nupl != null ? cur.nupl.toFixed(3) : '—'}
          sub={sig.zone}
          accent={sig.color}
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="Signal"
          value={sig.zone !== 'Unknown' ? sig.zone : '—'}
          sub={cur?.nupl != null
            ? cur.nupl < 0
              ? 'Price below 2-year MA'
              : `${(cur.nupl * 100).toFixed(1)}% above 2Y cost basis`
            : 'Loading…'}
          accent={sig.color}
          freshness="daily"
        />
        <StatCard
          label="2Y Moving Avg"
          value={cur?.ma730 != null ? fmtUSD(cur.ma730) : '—'}
          sub="Realized-price proxy (730-day MA)"
          accent="var(--sct-secondary)"
          freshness="daily"
          source="CoinMetrics"
        />
        <StatCard
          label="Trend"
          value={trend}
          sub="vs. 30-day NUPL average"
          accent={trendColor}
          freshness="daily"
        />
      </div>

      {/* Signal badge */}
      {result?.available && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-3"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: sig.color }}
        >
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sig.color }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: sig.color }}>{sig.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              NUPL is a slow-moving macro backdrop. Confirm with MVRV and Skyline Cycle Score before acting.
            </p>
          </div>
        </div>
      )}

      {/* Main chart */}
      {result?.available ? (
        <NUPLChartSection
          points={result.points}
          nupl={cur?.nupl ?? null}
          price={cur?.price ?? null}
          ma730={cur?.ma730 ?? null}
          zoneLabel={sig.label}
          zoneColor={sig.color}
          zone={sig.zone}
        />
      ) : (
        <div
          className="rounded-xl border p-5"
          style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
        >
          <p className="text-sm text-center py-16" style={{ color: 'var(--sct-muted)' }}>
            Unable to load price data.
          </p>
        </div>
      )}

      {/* Insight panel */}
      <InsightPanel title="Indicator Logic">
        <InsightRow
          label="What it measures"
          value="(Price − 2Y MA) / Price. Positive values mean BTC trades above its 2-year average cost basis (holders in aggregate profit). Negative means BTC is below that baseline — historically the deepest accumulation windows."
          stack
        />
        <InsightRow
          label="Capitulation Zone (< 0)"
          value="Price is below the 2-year moving average. Every major cycle bottom — 2015, 2018, March 2020, late 2022 — coincided with this zone. The best long-term entry windows in Bitcoin history have occurred here."
          valueColor="#3B82F6"
          stack
        />
        <InsightRow
          label="Euphoria Zone (> 0.75)"
          value="Price is more than 3× above its 2-year cost basis. Prior cycle peaks (2013, 2017, 2021) all occurred while NUPL was in this zone. Begin scaling out of risk exposure."
          valueColor="#FF5C5C"
          stack
        />
        <InsightRow
          label="Methodology note"
          value="True NUPL uses the on-chain Realized Cap (average BTC cost basis weighted by last move date). This page uses the 730-day MA as a realized-price proxy — values and zone thresholds are recalibrated accordingly. The signal behavior is equivalent."
          stack
        />
        <InsightRow
          label="Source"
          value="BTC daily price via CoinMetrics Community API · 730-day MA computed server-side · revalidated every 24 hours"
          stack
        />
      </InsightPanel>
    </div>
  );
}
