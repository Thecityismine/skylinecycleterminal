import { fetchBTCDailyPrice } from "@/lib/api/coinmetrics";
import { calculate2YearMA } from "@/lib/indicators/cycleHelpers";
import { TwoYearMAChart } from "@/components/charts/TwoYearMAChart";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { InsightPanel, InsightRow } from "@/components/dashboard/InsightPanel";

export const revalidate = 86400;

export default async function TwoYearMAPage() {
  let chartData: Awaited<ReturnType<typeof calculate2YearMA>> = [];
  let fetchError = false;
  let latestPrice = 0;
  let latestMA: number | null = null;
  let latestMA5: number | null = null;

  try {
    // Need data from ~2010 to correctly calculate the 2YMA starting from 2012
    const prices = await fetchBTCDailyPrice('2010-01-01');
    const maData = calculate2YearMA(prices);

    // Only pass chart data where MA is valid (skip the first 730 null days)
    chartData = maData.filter((d) => d.ma !== null);

    // Current values (last data point)
    const last = maData[maData.length - 1];
    latestPrice = last?.price ?? 0;
    latestMA = last?.ma ?? null;
    latestMA5 = last?.ma5 ?? null;
  } catch {
    fetchError = true;
  }

  const multiplier = latestMA ? latestPrice / latestMA : null;

  const zone =
    latestMA5 != null && latestPrice > latestMA5
      ? { label: 'Distribution Zone', color: 'var(--sct-red)', desc: 'Price above 2YMA×5 — historically a cycle top signal' }
      : latestMA != null && latestPrice < latestMA
      ? { label: 'Accumulation Zone', color: 'var(--sct-blue)', desc: 'Price below 2YMA — historically the best long-term buy zone' }
      : { label: 'Neutral / Expansion', color: 'var(--sct-green)', desc: 'Price between 2YMA and 2YMA×5 — normal bull market range' };

  function fmt(n: number | null): string {
    if (n == null || n === 0) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="2-Year Moving Average"
        subtitle="Phillip Swift's macro valuation band — accumulate below 2YMA · distribute above 2YMA×5"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="BTC Price"
          value={fmt(latestPrice)}
          sub="Latest close"
          accent="var(--sct-text)"
          freshness="daily"
        />
        <StatCard
          label="2-Year MA"
          value={fmt(latestMA)}
          sub="730-day simple MA"
          accent="#F7931A"
        />
        <StatCard
          label="2Y MA × 5"
          value={fmt(latestMA5)}
          sub="Historical cycle top band"
          accent="#FF5C5C"
        />
        <StatCard
          label="Current Multiple"
          value={multiplier != null ? `${multiplier.toFixed(2)}×` : '—'}
          sub={zone.label}
          accent={zone.color}
        />
      </div>

      {/* Zone badge */}
      <div
        className="flex items-center gap-3 rounded-xl border px-5 py-3"
        style={{
          backgroundColor: 'var(--sct-card)',
          borderColor: zone.color,
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: zone.color }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: zone.color }}>{zone.label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>{zone.desc}</p>
        </div>
      </div>

      {/* Main chart */}
      <div
        className="rounded-xl border p-5"
        style={{ backgroundColor: 'var(--sct-card)', borderColor: 'var(--sct-border)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--sct-text)' }}>
              BTC / USD vs 2-Year Moving Average — Log Scale
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sct-muted)' }}>
              Price below orange = historically best buy zone · Price above red = historically cycle top
            </p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--sct-muted)' }}>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5" style={{ backgroundColor: 'rgba(247,249,252,0.9)' }} />
              BTC Price
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5" style={{ backgroundColor: '#F7931A' }} />
              2Y MA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-px border-t-2 border-dashed" style={{ borderColor: '#FF5C5C' }} />
              2Y MA ×5
            </span>
          </div>
        </div>

        {fetchError ? (
          <div
            className="h-[480px] flex items-center justify-center rounded-lg border text-sm"
            style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
          >
            Unable to load price data — CoinMetrics API unreachable
          </div>
        ) : (
          <div className="h-[480px]">
            <TwoYearMAChart data={chartData} />
          </div>
        )}
      </div>

      {/* Insight panel */}
      <InsightPanel title="Indicator Logic">
        <InsightRow
          label="Accumulation Signal"
          value="Price < 2YMA — occurred briefly in every bear market bottom (2011, 2015, 2019, 2022)"
          valueColor="var(--sct-blue)"
          stack
        />
        <InsightRow
          label="Distribution Signal"
          value="Price > 2YMA×5 — has marked every cycle top in BTC's history"
          valueColor="var(--sct-red)"
          stack
        />
        <InsightRow
          label="Current Multiple"
          value={multiplier != null ? `${multiplier.toFixed(2)}× the 2-Year Moving Average` : '—'}
          valueColor={zone.color}
          stack
        />
        <InsightRow
          label="Source"
          value="Daily price: CoinMetrics Community API · Calculation: 730-day simple moving average"
          stack
        />
      </InsightPanel>
    </div>
  );
}
