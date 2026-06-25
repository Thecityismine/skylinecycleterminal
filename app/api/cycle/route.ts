import { NextResponse } from 'next/server';
import { fetchOnChainMetrics, fetchCurrentLTHData, fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { fetchFearGreed } from '@/lib/api/feargreed';
import { fetchMVRV } from '@/lib/api/cryptoquant';
import { fetchStablecoinSupply } from '@/lib/api/defillama';
import { fetchHashrate } from '@/lib/api/mempool';
import { computeSkylineScore, buildHistoricalContext } from '@/lib/indicators/skylineScore';

// 24-hour CDN cache â€” on-chain data is published daily with a 1-day lag
export const revalidate = 3600;

export async function GET() {
  try {
    const [onChain, fg, mvrvData, stablecoin, hashrate, lthData, fullPrices] = await Promise.all([
      fetchOnChainMetrics('2022-01-01'),
      fetchFearGreed(),
      fetchMVRV(),
      fetchStablecoinSupply(),
      fetchHashrate(),
      fetchCurrentLTHData(),
      fetchBTCDailyPrice('2012-01-01'),   // full history for percentile calibration
    ]);

    // Build percentile distributions from full price history.
    // This is what makes the score self-calibrating â€” each indicator is scored
    // relative to where it sits within all of Bitcoin's recorded history.
    const ctx = buildHistoricalContext(fullPrices);

    const result = computeSkylineScore(
      onChain,
      fg.value,
      {
        mvrvRatio:        mvrvData?.mvrv ?? null,
        stablecoinSupply: stablecoin?.totalCirculating ?? null,
        hashratePoints:   hashrate?.points ?? null,
        splyCur:          lthData?.splyCur    ?? null,
        splyAct1yr:       lthData?.splyAct1yr ?? null,
      },
      ctx,
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/cycle]', err);
    return NextResponse.json({ error: 'Failed to compute cycle score' }, { status: 500 });
  }
}
