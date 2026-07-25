// Shared snapshot shape produced by both altcoin data vendors (CoinMarketCap,
// CoinGecko) — kept in its own file so neither vendor module has to import
// from the other.

export type AltcoinSnapshot = {
  name:              string | null;
  price:             number | null;
  change24h:         number | null;
  marketCap:         number | null;
  marketCapRank:     number | null;
  volume24h:         number | null;
  circulatingSupply: number | null;
  totalSupply:       number | null;
  maxSupply:         number | null;
  athPrice:          number | null;
  athChangePct:      number | null;
  athDate:           string | null;
};

export const EMPTY_ALTCOIN_SNAPSHOT: AltcoinSnapshot = {
  name: null, price: null, change24h: null, marketCap: null, marketCapRank: null,
  volume24h: null, circulatingSupply: null, totalSupply: null, maxSupply: null,
  athPrice: null, athChangePct: null, athDate: null,
};
