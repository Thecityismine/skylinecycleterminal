import { NextResponse } from 'next/server';
import { fetchOnChainMetrics } from '@/lib/api/coinmetrics';
import { fetchFearGreed } from '@/lib/api/feargreed';
import { fetchMVRV } from '@/lib/api/cryptoquant';
import { fetchStablecoinSupply } from '@/lib/api/defillama';
import { fetchHashrate } from '@/lib/api/mempool';
import { computeSkylineScore } from '@/lib/indicators/skylineScore';

// 24-hour CDN cache — on-chain data is published daily with a 1-day lag
export const revalidate = 86400;

export async function GET() {
  try {
    const [onChain, fg, mvrvData, stablecoin, hashrate] = await Promise.all([
      fetchOnChainMetrics('2022-01-01'),
      fetchFearGreed(),
      fetchMVRV(),             // null → proxy fallback in score engine
      fetchStablecoinSupply(), // null → indicator marked unavailable
      fetchHashrate(),         // null → indicator marked unavailable
    ]);

    const result = computeSkylineScore(onChain, fg.value, {
      mvrvRatio:        mvrvData?.mvrv ?? null,
      stablecoinSupply: stablecoin?.totalCirculating ?? null,
      hashratePoints:   hashrate?.points ?? null,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/cycle]', err);
    return NextResponse.json({ error: 'Failed to compute cycle score' }, { status: 500 });
  }
}
