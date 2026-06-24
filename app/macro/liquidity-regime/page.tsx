import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { fetchLiquiditySeriesData } from '@/lib/api/fred';
import { fetchStablecoinHistory } from '@/lib/api/defillama';
import { computeLiquidityRegime, REGIME_COLOR, REGIME_LABEL } from '@/lib/indicators/liquidityRegime';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { LiquidityRegimeSection } from '@/components/charts/LiquidityRegimeSection';

export const revalidate = 86400;

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
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          label="Liquidity Score"
          value={`${Math.round(current.score)} / 100`}
          sub={REGIME_LABEL[current.regime]}
          accent={REGIME_COLOR[current.regime]}
          freshness="daily"
        />
        <StatCard
          label="Regime"
          value={
            current.regime === 'strong'      ? 'Supportive'
            : current.regime === 'improving'  ? 'Improving'
            : current.regime === 'restrictive' ? 'Restrictive'
            : 'Tight'
          }
          sub="Macro liquidity backdrop"
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
          sub={`Score: ${current.btcTrendScore} / 100`}
          accent={current.btcTrendScore >= 50 ? 'var(--sct-green)' : 'var(--sct-red)'}
          freshness="daily"
        />
        <StatCard
          label="DXY (90d)"
          value={
            current.dxyChange90d != null
              ? `${current.dxyChange90d >= 0 ? '+' : ''}${current.dxyChange90d.toFixed(1)}%`
              : '—'
          }
          sub={
            current.dxyChange90d != null
              ? (current.dxyChange90d < -1 ? 'Weakening ↓' : current.dxyChange90d > 1 ? 'Strengthening ↑' : 'Flat →')
              : 'No data'
          }
          accent={
            current.dxyChange90d != null
              ? (current.dxyChange90d < 0 ? 'var(--sct-green)' : 'var(--sct-red)')
              : 'var(--sct-muted)'
          }
          freshness="daily"
        />
        <StatCard
          label="Real Yields (90d)"
          value={
            current.realYieldChange90d != null
              ? `${current.realYieldChange90d >= 0 ? '+' : ''}${current.realYieldChange90d.toFixed(2)}pp`
              : '—'
          }
          sub={
            current.realYieldChange90d != null
              ? (current.realYieldChange90d < 0 ? 'Falling (bullish)' : 'Rising (bearish)')
              : 'No data'
          }
          accent={
            current.realYieldChange90d != null
              ? (current.realYieldChange90d < 0 ? 'var(--sct-green)' : 'var(--sct-red)')
              : 'var(--sct-muted)'
          }
          freshness="daily"
        />
        <StatCard
          label="Stablecoin Supply"
          value={
            current.stablecoin30d != null
              ? `${current.stablecoin30d >= 0 ? '+' : ''}${current.stablecoin30d.toFixed(1)}%`
              : '—'
          }
          sub="30-day growth rate"
          accent={
            current.stablecoin30d != null
              ? (current.stablecoin30d > 0 ? 'var(--sct-green)' : 'var(--sct-red)')
              : 'var(--sct-muted)'
          }
          freshness="daily"
        />
      </div>

      <LiquidityRegimeSection chartData={chartData} zones={zones} current={current} />
    </div>
  );
}
