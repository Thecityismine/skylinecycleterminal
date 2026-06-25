import { fetchBTCDailyPrice } from "@/lib/api/coinmetrics";
import { calculate2YearMA } from "@/lib/indicators/cycleHelpers";
import { TwoYearMAChart } from "@/components/charts/TwoYearMAChart";
import { TwoYearMAShareModal } from "@/components/share/TwoYearMAShareModal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { InsightPanel, InsightRow } from "@/components/dashboard/InsightPanel";

export const dynamic = 'force-dynamic';

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

  // Signal widget data based on price/2YMA multiple
  const maWidget = (() => {
    const m = multiplier;
    if (m == null) return null;
    let zoneLabel = '', color = '', body = '', ctx = '';
    if (m >= 5.0) {
      zoneLabel = 'Distribution Zone';
      color = '#FF5C5C';
      body = `At ${m.toFixed(2)}× the 2-Year MA, BTC is above the historical distribution band (2YMA×5). Every time price has reached this zone it has marked a major cycle top. Aggressive, systematic profit-taking is historically warranted.`;
      ctx = 'Price above 2YMA×5 has coincided with every major BTC cycle top: 2011, 2013, 2017, and 2021 — each followed by a 70–85% drawdown.';
    } else if (m >= 3.5) {
      zoneLabel = 'High Risk — Approaching Top Band';
      color = '#F97316';
      body = `At ${m.toFixed(2)}× the 2-Year MA, BTC is significantly extended. The distribution band (5×) is within reach. Risk/reward is shifting decisively — begin taking profits in tranches on strength.`;
      ctx = 'The final 20–30% of prior bull runs occurred in this zone. Each time it resolved with 70–80%+ corrections when the 5× band was eventually reached.';
    } else if (m >= 2.0) {
      zoneLabel = 'Bull Market — Elevated Premium';
      color = '#E6B450';
      body = `BTC is ${m.toFixed(2)}× its 2-Year MA — in a healthy bull market with a growing premium above trend. Long-term holders have significant unrealized gains. Consider partial profit-taking at key resistance levels.`;
      ctx = 'The 2020–2021 bull run spent most of its time between 2×–5× the 2YMA. Holding through this range has historically been rewarded, but position sizing matters.';
    } else if (m >= 1.0) {
      zoneLabel = 'Neutral / Expansion';
      color = '#35D07F';
      body = `BTC is ${m.toFixed(2)}× its 2-Year MA — in the healthy expansion zone. Price is above trend but without excessive premium. This is the most comfortable zone for holding and accumulating on dips.`;
      ctx = 'The 1×–2× range is where BTC spends the most time during bull markets and where the bulk of mid-cycle gains typically accumulate.';
    } else {
      zoneLabel = 'Accumulation Zone';
      color = '#3B82F6';
      body = `BTC is below its 2-Year MA at ${m.toFixed(2)}× — historically the strongest long-term entry zone in BTC\'s history. This level has only been reached during deep bear market bottoms.`;
      ctx = 'Price below 2YMA has occurred near the 2015 ($150), 2019 ($3.4K), and 2022 ($16K) cycle lows — each preceded a 5–20× move.';
    }
    const barPos = Math.min(m / 6.0, 1) * 100;
    return {
      zoneLabel, color,
      headline: `${m.toFixed(2)}× the 2-Year Moving Average`,
      body, ctx, barPos,
    };
  })();

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
          <div className="flex items-center gap-4 flex-wrap">
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
            {!fetchError && (
              <TwoYearMAShareModal payload={{
                data:        chartData,
                latestPrice,
                latestMA,
                latestMA5,
                multiplier,
                zoneLabel:   zone.label,
                zoneColor:   zone.color,
                generatedAt: new Date().toISOString(),
              }} />
            )}
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

        {/* Signal interpretation widget */}
        {maWidget && (
          <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--sct-border)' }}>
            {/* Zone badge + headline */}
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{ backgroundColor: maWidget.color + '25', color: maWidget.color }}
              >
                {maWidget.zoneLabel}
              </span>
              <span className="text-[11px] font-mono" style={{ color: 'var(--sct-muted)' }}>
                {maWidget.headline}
              </span>
            </div>

            {/* Interpretation body */}
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--sct-muted)' }}>
              {maWidget.body}
            </p>

            {/* Zone bar */}
            <div className="relative mb-1.5">
              <div className="flex h-1.5 rounded-full overflow-hidden">
                {/* 0–1× Accumulation */}
                <div style={{ width: '16.7%', backgroundColor: '#3B82F6' }} />
                {/* 1–2× Neutral */}
                <div style={{ width: '16.7%', backgroundColor: '#35D07F' }} />
                {/* 2–3.5× Elevated */}
                <div style={{ width: '25.0%', backgroundColor: '#E6B450' }} />
                {/* 3.5–5× High Risk */}
                <div style={{ width: '25.0%', backgroundColor: '#F97316' }} />
                {/* 5×+ Distribution */}
                <div style={{ width: '16.6%', backgroundColor: '#FF5C5C' }} />
              </div>
              {/* Position marker */}
              <div
                className="absolute rounded-sm"
                style={{
                  top: '-3px', width: '3px', height: '12px',
                  left: `${Math.min(Math.max(maWidget.barPos, 1), 99)}%`,
                  transform: 'translateX(-50%)',
                  backgroundColor: '#fff',
                  boxShadow: `0 0 6px ${maWidget.color}`,
                }}
              />
            </div>
            <div
              className="flex justify-between text-[9px] font-mono mb-4"
              style={{ color: 'var(--sct-muted)' }}
            >
              <span>0×</span>
              <span>1× 2YMA</span>
              <span>3.5×</span>
              <span>5× Top</span>
              <span>6×+</span>
            </div>

            {/* Historical context note */}
            <p
              className="text-[11px] leading-relaxed px-2.5 py-1.5 rounded"
              style={{ backgroundColor: maWidget.color + '12', color: maWidget.color }}
            >
              {maWidget.ctx}
            </p>
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
