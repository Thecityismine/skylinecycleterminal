import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { fetchLiquiditySeriesData } from '@/lib/api/fred';
import { fetchStablecoinHistory } from '@/lib/api/defillama';
import { computeSkylineGLI } from '@/lib/indicators/gliLag';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { InsightPanel, InsightRow } from '@/components/dashboard/InsightPanel';
import { BTCGLISection } from '@/components/charts/BTCGLISection';

export const dynamic = 'force-dynamic';

export default async function BTCGliLagPage() {
  let btcPrices: Awaited<ReturnType<typeof fetchBTCDailyPrice>> = [];
  let gliRaw: Awaited<ReturnType<typeof computeSkylineGLI>> = [];
  let fetchError = false;

  try {
    const [prices, fredData, stablecoinHist] = await Promise.all([
      fetchBTCDailyPrice('2017-01-01'),
      fetchLiquiditySeriesData('2016-01-01'),
      fetchStablecoinHistory(),
    ]);
    btcPrices = prices;
    gliRaw = computeSkylineGLI(fredData, stablecoinHist, prices.map(p => p.time));
  } catch {
    fetchError = true;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="BTC vs GLI Liquidity Lag"
        subtitle="Bitcoin price behavior compared with global liquidity momentum using a configurable lag model"
      />

      {fetchError || !btcPrices.length || !gliRaw.length ? (
        <div
          className="h-[480px] flex items-center justify-center rounded-xl border text-sm"
          style={{ borderColor: 'var(--sct-border)', color: 'var(--sct-muted)' }}
        >
          Unable to load data — CoinMetrics, FRED, or DeFiLlama API unreachable
        </div>
      ) : (
        <BTCGLISection btcPrices={btcPrices} gliRaw={gliRaw} />
      )}

      <InsightPanel title="Skyline GLI Model">
        <InsightRow
          label="What is the GLI?"
          value="A composite z-score of global liquidity growth momentum: US M2 YoY growth (30%), Fed balance sheet YoY growth (20%), DXY 90-day change inverted (20%), 10Y real yield 90-day change inverted (15%), and stablecoin supply 30-day growth (15%) — rescaled to 0–100."
          stack
        />
        <InsightRow
          label="Why growth, not levels?"
          value="Raw M2 and Fed balance sheet levels trend secularly upward — z-scoring the level alone would produce a slowly rising line with no oscillation. Scoring growth rates instead produces a genuine leading/lagging oscillator with real turning points."
          stack
        />
        <InsightRow
          label="The lag model"
          value="GLI is shifted forward by the selected number of days (default 75) so today's liquidity reading is plotted where BTC would be expected to react. Use the Lag Optimizer to test which offset currently correlates best."
          stack
        />
        <InsightRow
          label="Reading the signal"
          value="Tailwind = GLI rising + BTC above its 50D trend + positive correlation. Headwind = GLI falling + BTC below trend + positive correlation. Divergence = GLI and BTC trend disagree. Breakdown = correlation has gone weak or negative — treat the model as unreliable at that lag."
          stack
        />
        <InsightRow
          label="Signal use"
          value="Macro confirmation only — not a standalone timing signal. Cross-check against price structure, seasonality, DXY, and on-chain data (Liquidity Regime, BTC/M2) before acting."
          stack
        />
        <InsightRow
          label="Data sources"
          value="BTC price via CoinMetrics · DXY (DTWEXBGS), Real Yield (DFII10), M2 (WM2NS), Fed Balance Sheet (WALCL) via FRED · Stablecoin supply via DeFiLlama"
          stack
        />
      </InsightPanel>
    </div>
  );
}
