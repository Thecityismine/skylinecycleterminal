export type AltcoinGroup = 'majors';

export type AltcoinWatchlistItem = {
  id:     string;   // CoinGecko coin id — used for weekly price history
  cmcId:  number;   // CoinMarketCap numeric id — used for the live snapshot.
                     // CMC symbols collide (e.g. "TON" resolves to an unrelated
                     // tokenized-stock product, not Toncoin/Gram) so lookups
                     // must always go by numeric id, never by symbol.
  cointraderSymbol?: string;  // charts.cointrader.pro symbol — used ONLY to
                     // backfill history older than CoinGecko's free-tier
                     // 365-day window. Every value here was manually verified
                     // (live price + freshness) before being added; do not
                     // add one without checking — this catalog has stale/dead
                     // feeds under confusingly similar names (e.g.
                     // "AVALANCHE-AVAX:USD" stopped updating in 2022; the
                     // live one is "AVALANCHE:USD"). Omitted entirely for
                     // coins not in its catalog (ONDO, HYPE).
  symbol: string;
  name:   string;
  sector: string;
  group:  AltcoinGroup;
  color:  string;
};

export const ALTCOIN_WATCHLIST: AltcoinWatchlistItem[] = [
  { id: 'binancecoin',       cmcId: 1839,  cointraderSymbol: 'BNB:USD',              symbol: 'BNB',  name: 'BNB',        sector: 'Exchange Token · L1',      group: 'majors', color: '#F0B90B' },
  { id: 'ripple',            cmcId: 52,    cointraderSymbol: 'XRP:USD',              symbol: 'XRP',  name: 'XRP',        sector: 'Payments · Settlement',    group: 'majors', color: '#27A2DB' },
  { id: 'solana',            cmcId: 5426,  cointraderSymbol: 'SOLANA:USD',           symbol: 'SOL',  name: 'Solana',     sector: 'Smart Contract L1',        group: 'majors', color: '#14F195' },
  { id: 'dogecoin',          cmcId: 74,    cointraderSymbol: 'DOGECOIN:USD',         symbol: 'DOGE', name: 'Dogecoin',   sector: 'Meme',                     group: 'majors', color: '#C2A633' },
  { id: 'chainlink',         cmcId: 1975,  cointraderSymbol: 'CHAINLINK:USD',        symbol: 'LINK', name: 'Chainlink',  sector: 'Oracle · Middleware',       group: 'majors', color: '#2A5ADA' },
  { id: 'cardano',           cmcId: 2010,  cointraderSymbol: 'CARDANO:USD',          symbol: 'ADA',  name: 'Cardano',    sector: 'Smart Contract L1',        group: 'majors', color: '#3468D1' },
  { id: 'stellar',           cmcId: 512,   cointraderSymbol: 'STELLAR:USD',          symbol: 'XLM',  name: 'Stellar',    sector: 'Payments · Settlement',    group: 'majors', color: '#14B6E7' },
  { id: 'the-open-network',  cmcId: 11419, cointraderSymbol: 'TONCOIN:USD',          symbol: 'TON',  name: 'Toncoin',    sector: 'Smart Contract L1',        group: 'majors', color: '#0098EA' },
  { id: 'litecoin',          cmcId: 2,     cointraderSymbol: 'LITECOIN:USD',         symbol: 'LTC',  name: 'Litecoin',   sector: 'Payments · Digital Silver', group: 'majors', color: '#BFBBBB' },
  { id: 'avalanche-2',       cmcId: 5805,  cointraderSymbol: 'AVALANCHE:USD',        symbol: 'AVAX', name: 'Avalanche',  sector: 'Smart Contract L1',        group: 'majors', color: '#E84142' },
  { id: 'polkadot',          cmcId: 6636,  cointraderSymbol: 'POLKADOT-NEW:USD',     symbol: 'DOT',  name: 'Polkadot',   sector: 'Interoperability',          group: 'majors', color: '#E6007A' },
  { id: 'filecoin',          cmcId: 2280,  cointraderSymbol: 'FILECOIN:USD',         symbol: 'FIL',  name: 'Filecoin',   sector: 'Decentralized Storage',    group: 'majors', color: '#0090FF' },
  { id: 'curve-dao-token',   cmcId: 6538,  cointraderSymbol: 'CURVE-DAO-TOKEN:USD',  symbol: 'CRV',  name: 'Curve DAO',  sector: 'DeFi · DEX',                group: 'majors', color: '#B026FF' },
  { id: 'ondo-finance',      cmcId: 21159, symbol: 'ONDO', name: 'Ondo',       sector: 'RWA Tokenization',          group: 'majors', color: '#5B57F5' },
  { id: 'hyperliquid',       cmcId: 32196, symbol: 'HYPE', name: 'Hyperliquid', sector: 'Perp DEX · L1',            group: 'majors', color: '#5CE1E6' },
];

export const ALTCOIN_GROUP_LABELS: Record<AltcoinGroup, string> = {
  majors: 'Major Alts',
};

export const ALTCOIN_GROUP_ORDER: AltcoinGroup[] = ['majors'];

export function getAltcoin(id: string): AltcoinWatchlistItem | undefined {
  const key = id.toLowerCase();
  return ALTCOIN_WATCHLIST.find((c) => c.id === key || c.symbol.toLowerCase() === key);
}
