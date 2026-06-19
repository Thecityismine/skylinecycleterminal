import { NextResponse } from 'next/server';
import { fetchMarketData } from '@/lib/api/coingecko';
import { fetchFearGreed } from '@/lib/api/feargreed';

export const revalidate = 300; // 5-minute CDN cache

export async function GET() {
  try {
    const [market, fg] = await Promise.all([fetchMarketData(), fetchFearGreed()]);

    return NextResponse.json({
      btcPrice:        market.btc.usd,
      btcChange24h:    market.btc.usd_24h_change,
      btcMarketCap:    market.btc.usd_market_cap,
      ethPrice:        market.eth.usd,
      ethChange24h:    market.eth.usd_24h_change,
      btcDominance:    market.btcDominance,
      ethDominance:    market.ethDominance,
      totalMarketCap:  market.totalMarketCapUSD,
      fearGreedValue:  fg.value,
      fearGreedLabel:  fg.classification,
      fetchedAt:       new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/market]', err);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
