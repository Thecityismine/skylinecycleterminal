import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { fetchCrossAssetData } from '@/lib/api/crossAsset';
import { fetchLiquiditySeriesData, fredGetFrom } from '@/lib/api/fred';
import { fetchStablecoinHistory } from '@/lib/api/defillama';
import { SevenYearCyclePageClient } from '@/components/charts/SevenYearCyclePageClient';

export const revalidate = 86400;

export default async function SevenYearCyclePage() {
  const [btcPrices, crossAsset, liquidity, yieldCurve, creditSpread, stablecoins] = await Promise.all([
    fetchBTCDailyPrice('2010-01-01'),
    fetchCrossAssetData(),
    fetchLiquiditySeriesData('2005-01-01'),
    fredGetFrom('T10Y2Y', '1980-01-01'),
    fredGetFrom('BAMLH0A0HYM2', '1996-01-01'),
    fetchStablecoinHistory(),
  ]);

  return (
    <SevenYearCyclePageClient
      btcPrices={btcPrices}
      crossAsset={crossAsset.points}
      liquidity={liquidity}
      yieldCurve={yieldCurve}
      creditSpread={creditSpread}
      stablecoins={stablecoins}
    />
  );
}
