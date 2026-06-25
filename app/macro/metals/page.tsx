import { fetchGoldHistory, fetchSilverHistory, fetchRealYield10Y } from '@/lib/api/metals';
import { fetchDXYHistory } from '@/lib/api/fred';
import {
  computeMetalTrend,
  downsampleToWeekly,
  interpolateToWeeklyDates,
} from '@/lib/indicators/metalTrend';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { PreciousMetalChartSection } from '@/components/charts/PreciousMetalChartSection';

export const revalidate = 86400;

export default async function MetalsPage() {
  const [goldDaily, silverMonthly, dxyDailyRaw, realYieldDaily] = await Promise.all([
    fetchGoldHistory(),
    fetchSilverHistory(),
    fetchDXYHistory(),
    fetchRealYield10Y(),
  ]);

  // Downsample daily series to weekly
  const goldWeekly = downsampleToWeekly(goldDaily);
  const realYieldWeekly = downsampleToWeekly(realYieldDaily);
  const dxyWeekly = downsampleToWeekly(dxyDailyRaw);

  // Interpolate silver monthly → weekly using gold's weekly dates as reference
  const goldDates = goldWeekly.map(p => p.date);
  const silverWeekly = interpolateToWeeklyDates(silverMonthly, goldDates);

  // Compute trend results for both metals
  const goldResult = computeMetalTrend(goldWeekly, dxyWeekly, realYieldWeekly, silverWeekly, null);
  const silverResult = computeMetalTrend(silverWeekly, dxyWeekly, realYieldWeekly, null, goldWeekly);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Precious Metals Macro Terminal"
        subtitle="Gold and silver trend, real-rate pressure, dollar strength, and relative value"
      />

      <PreciousMetalChartSection goldResult={goldResult} silverResult={silverResult} />

      <InsightPanel title="Methodology">
        <InsightRow
          label="Gold Data"
          value="FRED GOLDAMGBD228NLBM — London PM fix price in USD per troy ounce. Daily since 1968, downsampled to weekly (last value per ISO week)."
          stack
        />
        <InsightRow
          label="Silver Data"
          value="FRED SLVPRUSD — IMF Global Price of Silver in USD per troy ounce. Monthly data, linearly interpolated to weekly for consistent MA computation."
          stack
        />
        <InsightRow
          label="50W / 200W MA"
          value="Simple moving averages computed on weekly closing prices. 50W ≈ 1 year, 200W ≈ 4 years. Price above both MAs in the same direction is the core bullish structure."
          stack
        />
        <InsightRow
          label="Gold/Silver Ratio"
          value="Gold price divided by silver price. Historically above 90 has marked periods where silver is cheap relative to gold. Below 70 often signals silver outperformance and risk-on sentiment."
          stack
        />
        <InsightRow
          label="Trend Score"
          value="Composite 0–100: Price vs 50W MA (30%), Price vs 200W MA (25%), Distance from ATH (15%), Gold/Silver Ratio (15%), DXY Direction (10%), Real Yield Trend (5%). Higher scores indicate more extended conditions."
          stack
        />
        <InsightRow
          label="Macro Quadrant"
          value="2×2 grid based on trend strength (price above/below MAs) and macro backdrop (DXY direction + real yield direction). Expansion = strong trend + tailwind; Recovery = weak trend + tailwind; Defensive = strong trend + headwind; Avoid = weak trend + headwind."
          stack
        />
        <InsightRow
          label="Important Note"
          value="Gold and silver are macro context indicators. The gold/silver ratio is most useful for identifying which metal is leading and assessing risk appetite. Not financial advice."
          stack
        />
      </InsightPanel>
    </div>
  );
}
