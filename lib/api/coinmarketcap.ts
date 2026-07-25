import type { AltcoinSnapshot } from './altcoinSnapshot';

const CMC_BASE = 'https://pro-api.coinmarketcap.com';
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY?.trim();

// CoinMarketCap symbols are NOT unique — e.g. "TON" resolves to an obscure
// tokenized-stock product (id 39249, rank ~3500) instead of Toncoin/Gram
// (id 11419, rank ~21). Always look coins up by CMC's numeric id, never by
// symbol. Free "Basic" plan caps historical lookback at 12 months (same
// practical limit CoinGecko has without a paid key), so this is used for
// the live snapshot only — CoinGecko remains the source for weekly price
// history. The free plan's quote object also has no ATH field.

export async function fetchCmcSnapshot(cmcId: number): Promise<AltcoinSnapshot> {
  if (!CMC_API_KEY) throw new Error('COINMARKETCAP_API_KEY not configured');

  const res = await fetch(
    `${CMC_BASE}/v2/cryptocurrency/quotes/latest?id=${cmcId}`,
    {
      headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY, Accept: 'application/json' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) throw new Error(`CoinMarketCap quotes HTTP ${res.status}`);

  const json = await res.json();
  const c = json.data?.[String(cmcId)];
  if (!c) throw new Error(`CoinMarketCap: no data for id ${cmcId}`);
  const usd = c.quote?.USD;
  if (!usd) throw new Error(`CoinMarketCap: no USD quote for id ${cmcId}`);

  return {
    name:              c.name ?? null,
    price:             usd.price ?? null,
    change24h:         usd.percent_change_24h ?? null,
    marketCap:         usd.market_cap ?? null,
    marketCapRank:     c.cmc_rank ?? null,
    volume24h:         usd.volume_24h ?? null,
    circulatingSupply: c.circulating_supply ?? null,
    totalSupply:       c.total_supply ?? null,
    maxSupply:         c.max_supply ?? null,
    athPrice:          null,  // not available on the free CMC plan
    athChangePct:      null,
    athDate:           null,
  };
}
