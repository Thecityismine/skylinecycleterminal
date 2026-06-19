const BASE = 'https://api.coingecko.com/api/v3';

export type CoinPrice = {
  usd: number;
  usd_24h_change: number;
  usd_market_cap: number;
  usd_24h_vol: number;
};

export type MarketData = {
  btc: CoinPrice;
  eth: CoinPrice;
  btcDominance: number;
  ethDominance: number;
  totalMarketCapUSD: number;
};

export async function fetchMarketData(): Promise<MarketData> {
  const [priceRes, globalRes] = await Promise.all([
    fetch(
      `${BASE}/simple/price?ids=bitcoin,ethereum` +
        `&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
      { signal: AbortSignal.timeout(10000) }
    ),
    fetch(`${BASE}/global`, { signal: AbortSignal.timeout(10000) }),
  ]);

  if (!priceRes.ok) throw new Error(`CoinGecko prices HTTP ${priceRes.status}`);
  if (!globalRes.ok) throw new Error(`CoinGecko global HTTP ${globalRes.status}`);

  const [priceJson, globalJson] = await Promise.all([priceRes.json(), globalRes.json()]);

  return {
    btc: priceJson.bitcoin,
    eth: priceJson.ethereum,
    btcDominance: globalJson.data.market_cap_percentage.btc,
    ethDominance: globalJson.data.market_cap_percentage.eth,
    totalMarketCapUSD: globalJson.data.total_market_cap.usd,
  };
}
