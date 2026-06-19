import { NextResponse } from 'next/server';
import { fetchMarketData } from '@/lib/api/coingecko';

export const revalidate = 300;

const CG = 'https://api.coingecko.com/api/v3';

async function cgMarketChart(coinId: string, days: number) {
  const res = await fetch(
    `${CG}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    { next: { revalidate: 300 }, signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) throw new Error(`CoinGecko ${coinId} chart HTTP ${res.status}`);
  const j = await res.json();
  return (j.market_caps as [number, number][]).map(([ts, mc]) => ({
    time: new Date(ts).toISOString().slice(0, 10),
    mc,
  }));
}

export async function GET() {
  try {
    const [market, btcMC, ethMC] = await Promise.all([
      fetchMarketData(),
      cgMarketChart('bitcoin',  365),
      cgMarketChart('ethereum', 365),
    ]);

    // Build lookup map
    const ethMap = new Map(ethMC.map(d => [d.time, d.mc]));

    // BTC share of (BTC + ETH) combined cap — capital rotation signal
    const btcSharePoints = btcMC
      .filter(d => ethMap.has(d.time))
      .map(d => ({
        date:  d.time,
        value: +(d.mc / (d.mc + ethMap.get(d.time)!) * 100).toFixed(2),
      }));

    // ETH share of (BTC + ETH)
    const ethSharePoints = ethMC
      .filter(d => btcMC.some(b => b.time === d.time))
      .map(d => {
        const btc = btcMC.find(b => b.time === d.time)?.mc ?? 0;
        return {
          date:  d.time,
          value: +(d.mc / (d.mc + btc) * 100).toFixed(2),
        };
      });

    // Combined BTC + ETH market cap in $T
    const combinedCapPoints = btcMC
      .filter(d => ethMap.has(d.time))
      .map(d => ({
        date:  d.time,
        value: +((d.mc + ethMap.get(d.time)!) / 1e12).toFixed(3),
      }));

    return NextResponse.json({
      current: {
        btcDominance:     +market.btcDominance.toFixed(2),
        ethDominance:     +market.ethDominance.toFixed(2),
        totalMarketCap:   market.totalMarketCapUSD,
        altcoinDominance: +(100 - market.btcDominance - market.ethDominance).toFixed(2),
      },
      btcSharePoints,
      ethSharePoints,
      combinedCapPoints,
    });
  } catch (err) {
    console.error('[/api/dominance]', err);
    try {
      const market = await fetchMarketData();
      return NextResponse.json({
        current: {
          btcDominance:    +market.btcDominance.toFixed(2),
          ethDominance:    +market.ethDominance.toFixed(2),
          totalMarketCap:  market.totalMarketCapUSD,
          altcoinDominance: +(100 - market.btcDominance - market.ethDominance).toFixed(2),
        },
        btcSharePoints:   [],
        ethSharePoints:   [],
        combinedCapPoints: [],
      });
    } catch {
      return NextResponse.json({ error: 'Failed to fetch dominance data' }, { status: 500 });
    }
  }
}
