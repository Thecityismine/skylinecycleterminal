import { NextResponse } from 'next/server';
import { fetchMarketData } from '@/lib/api/coingecko';
import { fetchStablecoinHistory } from '@/lib/api/defillama';
import {
  calculateAltseasonScore,
  scoreBtcDominance,
  scoreEthBtc,
  scoreAltBreadth,
  scoreTotal2Relative,
  scoreTotal3Relative,
  scoreStablecoinDominance,
  buildHistoricalScore,
  detectSignalDots,
  isAltcoin,
  buildSectorSummaries,
  getRegime,
} from '@/lib/indicators/altseasonIndex';

export const revalidate = 900; // 15 minutes

const CG = 'https://api.coingecko.com/api/v3';

async function cgFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${CG}${path}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`CoinGecko ${path} HTTP ${res.status}`);
  return res.json();
}

type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
  price_change_percentage_90d_in_currency: number | null;
};

export async function GET() {
  try {
    // ── Parallel fetches ─────────────────────────────────────────────────────
    const [market, coinsRaw, btcMCHistory, ethMCHistory, stableHistory] = await Promise.all([
      fetchMarketData(),

      // Top 100 coins with 90d price change for breadth calculation
      cgFetch<CoinMarket[]>(
        '/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1' +
        '&price_change_percentage=90d&sparkline=false'
      ),

      // BTC market cap history (365 days)
      cgFetch<{ market_caps: [number, number][] }>(
        '/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily'
      ).then((j) =>
        j.market_caps.map(([ts, mc]) => ({
          time: new Date(ts).toISOString().slice(0, 10),
          mc,
        }))
      ),

      // ETH market cap history (365 days)
      cgFetch<{ market_caps: [number, number][] }>(
        '/coins/ethereum/market_chart?vs_currency=usd&days=365&interval=daily'
      ).then((j) =>
        j.market_caps.map(([ts, mc]) => ({
          time: new Date(ts).toISOString().slice(0, 10),
          mc,
        }))
      ),

      // Stablecoin history (DeFiLlama)
      fetchStablecoinHistory(),
    ]);

    // ── Breadth calculation ───────────────────────────────────────────────────
    const btcCoin  = coinsRaw.find((c) => c.id === 'bitcoin');
    const btcChg90 = btcCoin?.price_change_percentage_90d_in_currency ?? 0;

    const alts = coinsRaw.filter(isAltcoin);
    const altsBeating = alts.filter(
      (c) => (c.price_change_percentage_90d_in_currency ?? -Infinity) > btcChg90
    );
    const breadthPct = alts.length > 0 ? (altsBeating.length / alts.length) * 100 : 50;

    // ── Market-cap signals ────────────────────────────────────────────────────
    const btcMC   = market.btc.usd_market_cap;
    const ethMC   = market.eth.usd_market_cap;
    const totalMC = market.totalMarketCapUSD;
    const total2MC = totalMC - btcMC;
    const total3MC = totalMC - btcMC - ethMC;

    // 90-day change for BTC, TOTAL2, TOTAL3 from history
    const btcMcMap  = new Map(btcMCHistory.map((d) => [d.time, d.mc]));
    const ethMcMap  = new Map(ethMCHistory.map((d) => [d.time, d.mc]));

    const d90  = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    const btcMC90   = btcMcMap.get(d90) ?? btcMC * 0.8;
    const ethMC90   = ethMcMap.get(d90) ?? ethMC * 0.8;
    const total2MC90 = (totalMC / (btcMC / btcMC90)) - btcMC90; // approximate

    const btcGrowth90   = btcMC90 > 0 ? ((btcMC - btcMC90)   / btcMC90)   * 100 : 0;
    const total2Growth90 = btcMC90 > 0 ? ((total2MC - (btcMC90 > 0 ? total2MC * (btcMC90 / btcMC) : total2MC * 0.8)) / (total2MC * (btcMC90 / btcMC) || 1)) * 100 : 0;

    // Simpler: compare ETH/BTC ratio change as TOTAL2 proxy
    const ethBtcNow = ethMC > 0 && btcMC > 0 ? ethMC / btcMC : 0.06;
    const ethBtc90d = ethMC90 > 0 && btcMC90 > 0 ? ethMC90 / btcMC90 : ethBtcNow;

    // TOTAL3 relative (approximate with small-cap proxy — difference growth)
    const total3Growth90 = total2Growth90 - (btcGrowth90 * 0.5); // heuristic

    // ── Stablecoin dominance ──────────────────────────────────────────────────
    const latestStable = stableHistory.length > 0 ? stableHistory[stableHistory.length - 1].stablecoinMC : 0;
    const stableDomPct = totalMC > 0 ? (latestStable / totalMC) * 100 : 8;

    // ── Sub-scores ────────────────────────────────────────────────────────────
    const altBreadthScore     = scoreAltBreadth(breadthPct);
    const btcDominanceScore   = scoreBtcDominance(market.btcDominance);
    const ethBtcScore         = scoreEthBtc(ethBtcNow);
    const total2Score         = scoreTotal2Relative(total2Growth90, btcGrowth90);
    const total3Score         = scoreTotal3Relative(total3Growth90, btcGrowth90);
    const stablecoinScore     = scoreStablecoinDominance(stableDomPct);

    // ── Composite score ───────────────────────────────────────────────────────
    const score = calculateAltseasonScore({
      altBreadthScore,
      btcDominanceScore,
      ethBtcScore,
      total2Score,
      total3Score,
      stablecoinScore,
    });

    const regime = getRegime(score);

    // ── Historical chart data ─────────────────────────────────────────────────
    const historicalPoints = buildHistoricalScore(btcMCHistory, ethMCHistory, stableHistory);
    const signalDots       = detectSignalDots(historicalPoints);

    // Attach BTC price history to historical points (from btc market_chart)
    const btcPriceHistory = await cgFetch<{ prices: [number, number][] }>(
      '/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily'
    ).catch(() => ({ prices: [] as [number, number][] }));

    const btcPriceMap = new Map(
      btcPriceHistory.prices.map(([ts, p]) => [
        new Date(ts).toISOString().slice(0, 10),
        p,
      ])
    );

    const chartData = historicalPoints.map((p) => ({
      time:  p.time,
      ts:    p.ts,
      score: p.score,
      btcPrice: btcPriceMap.get(p.time) ?? null,
    }));

    // ── Sector breadth ────────────────────────────────────────────────────────
    const altCoinsWithChg = alts
      .filter((c) => c.price_change_percentage_90d_in_currency != null)
      .map((c) => ({
        id:     c.id,
        symbol: c.symbol,
        chg90d: c.price_change_percentage_90d_in_currency!,
      }));

    const sectorSummaries = buildSectorSummaries(altCoinsWithChg, btcChg90);

    // ── Response ──────────────────────────────────────────────────────────────
    return NextResponse.json({
      score,
      regime:            regime.key,
      regimeLabel:       regime.label,
      regimeColor:       regime.color,
      btcDominance:      +market.btcDominance.toFixed(2),
      ethBtc:            +ethBtcNow.toFixed(5),
      ethBtc90dAgo:      +ethBtc90d.toFixed(5),
      stableDomPct:      +stableDomPct.toFixed(2),
      altcoinsTracked:   alts.length,
      altcoinsBeatingBtc: altsBeating.length,
      btcChg90d:         +btcChg90.toFixed(1),
      subScores: {
        altBreadth:    Math.round(altBreadthScore),
        btcDominance:  Math.round(btcDominanceScore),
        ethBtc:        Math.round(ethBtcScore),
        total2:        Math.round(total2Score),
        total3:        Math.round(total3Score),
        stablecoin:    Math.round(stablecoinScore),
      },
      chartData,
      signalDots,
      sectorSummaries,
    });
  } catch (err) {
    console.error('[/api/altseason]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
