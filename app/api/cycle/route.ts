import { NextResponse } from 'next/server';
import { fetchOnChainMetrics } from '@/lib/api/coinmetrics';
import { fetchFearGreed } from '@/lib/api/feargreed';
import { computeSkylineScore } from '@/lib/indicators/skylineScore';

// 24-hour CDN cache — on-chain data is published daily with a 1-day lag
export const revalidate = 86400;

export async function GET() {
  try {
    // Parallel fetch: CoinMetrics (2022→present) + Fear & Greed
    const [onChain, fg] = await Promise.all([
      fetchOnChainMetrics('2022-01-01'),
      fetchFearGreed(),
    ]);

    const result = computeSkylineScore(onChain, fg.value);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/cycle]', err);
    return NextResponse.json({ error: 'Failed to compute cycle score' }, { status: 500 });
  }
}
