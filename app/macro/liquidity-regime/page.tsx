import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { fetchLiquiditySeriesData } from '@/lib/api/fred';
import { fetchStablecoinHistory } from '@/lib/api/defillama';
import { computeLiquidityRegime, REGIME_COLOR, REGIME_LABEL } from '@/lib/indicators/liquidityRegime';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { LiquidityRegimeSection } from '@/components/charts/LiquidityRegimeSection';

export const dynamic = 'force-dynamic';

export default async function LiquidityRegimePage() {
  const [prices, fredData, stablecoinHist] = await Promise.all([
    fetchBTCDailyPrice('2014-01-01'),
    fetchLiquiditySeriesData('2018-01-01'),
    fetchStablecoinHistory(),
  ]);

  const { chartData, zones, current } = computeLiquidityRegime(prices, fredData, stablecoinHist);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC Liquidity Regime Matrix"
        subtitle="Bitcoin trend, macro liquidity, dollar strength, and real-rate pressure in one regime model"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Liquidity Score"
          value={`${Math.round(current.score)} / 100`}
          sub={REGIME_LABEL[current.regime]}
          accent={REGIME_COLOR[current.regime]}
          freshness="daily"
        />
        <StatCard
          label="BTC Trend"
          value={
            current.btcTrendScore >= 100 ? 'Strong'
            : current.btcTrendScore >= 50  ? 'Constructive'
            : 'Weak'
          }
          sub={current.btcTrendScore >= 100 ? 'Above 100W & 200W MA' : current.btcTrendScore >= 50 ? 'Above 100W MA' : 'Below 100W MA'}
          accent={current.btcTrendScore >= 50 ? 'var(--sct-green)' : 'var(--sct-red)'}
          freshness="daily"
        />
        <StatCard
          label="DXY (90d Change)"
          value={
            current.dxyChange90d != null
              ? `${current.dxyChange90d >= 0 ? '+' : ''}${current.dxyChange90d.toFixed(1)}%`
              : 'â€”'
          }
          sub={
            current.dxyChange90d != null
              ? (current.dxyChange90d < -1 ? 'Weakening â€” bullish for BTC' : current.dxyChange90d > 1 ? 'Strengthening â€” bearish' : 'Flat')
              : 'No FRED data'
          }
          accent={
            current.dxyChange90d != null
              ? (current.dxyChange90d < 0 ? 'var(--sct-green)' : 'var(--sct-red)')
              : 'var(--sct-muted)'
          }
          freshness="daily"
        />
        <StatCard
          label="10Y Real Yield (90d)"
          value={
            current.realYieldChange90d != null
              ? `${current.realYieldChange90d >= 0 ? '+' : ''}${current.realYieldChange90d.toFixed(2)}pp`
              : 'â€”'
          }
          sub={
            current.realYieldChange90d != null
              ? (current.realYieldChange90d < 0 ? 'Falling â€” bullish for BTC' : 'Rising â€” bearish')
              : 'No FRED data'
          }
          accent={
            current.realYieldChange90d != null
              ? (current.realYieldChange90d < 0 ? 'var(--sct-green)' : 'var(--sct-red)')
              : 'var(--sct-muted)'
          }
          freshness="daily"
        />
      </div>

      <LiquidityRegimeSection chartData={chartData} zones={zones} current={current} />

      <InsightPanel title="Score Model">
        <InsightRow
          label="Weighting"
          value="Fed Balance Sheet 30% Â· DXY 20% Â· 10Y Real Yield 20% Â· M2 Growth 15% Â· Stablecoin Supply 10% Â· BTC Trend 5%"
          stack
        />
        <InsightRow
          label="Bullish Regime"
          value="Fed balance sheet expanding, DXY weakening, real yields falling, M2 and stablecoin supply growing, BTC above its long-term moving averages"
          stack
        />
        <InsightRow
          label="Bearish Regime"
          value="Fed tightening, DXY strengthening, real yields rising, M2 contracting, stablecoin supply shrinking, BTC below key moving averages"
          stack
        />
        <InsightRow
          label="Signal Use"
          value="Regime context only â€” not a timing tool. Use alongside MVRV, SOPR, and the Skyline Cycle Score to confirm positioning before acting."
          stack
        />
        <InsightRow
          label="Data Sources"
          value="BTC price via CoinMetrics Â· DXY (DTWEXBGS), Real Yield (DFII10), M2 (WM2NS), Fed Balance Sheet (WALCL) via FRED Â· Stablecoin supply via DeFiLlama"
          stack
        />
      </InsightPanel>
    </div>
  );
}
