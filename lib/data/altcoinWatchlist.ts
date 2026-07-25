export type AltcoinGroup = 'majors';

export type AltcoinWatchlistItem = {
  id:     string;   // CoinGecko coin id — used for weekly price history
  cmcId:  number;   // CoinMarketCap numeric id — used for the live snapshot.
                     // CMC symbols collide (e.g. "TON" resolves to an unrelated
                     // tokenized-stock product, not Toncoin/Gram) so lookups
                     // must always go by numeric id, never by symbol.
  symbol: string;
  name:   string;
  sector: string;
  group:  AltcoinGroup;
  color:  string;
};

export const ALTCOIN_WATCHLIST: AltcoinWatchlistItem[] = [
  { id: 'binancecoin',       cmcId: 1839,  symbol: 'BNB',  name: 'BNB',        sector: 'Exchange Token · L1',      group: 'majors', color: '#F0B90B' },
  { id: 'ripple',            cmcId: 52,    symbol: 'XRP',  name: 'XRP',        sector: 'Payments · Settlement',    group: 'majors', color: '#27A2DB' },
  { id: 'solana',            cmcId: 5426,  symbol: 'SOL',  name: 'Solana',     sector: 'Smart Contract L1',        group: 'majors', color: '#14F195' },
  { id: 'dogecoin',          cmcId: 74,    symbol: 'DOGE', name: 'Dogecoin',   sector: 'Meme',                     group: 'majors', color: '#C2A633' },
  { id: 'chainlink',         cmcId: 1975,  symbol: 'LINK', name: 'Chainlink',  sector: 'Oracle · Middleware',       group: 'majors', color: '#2A5ADA' },
  { id: 'cardano',           cmcId: 2010,  symbol: 'ADA',  name: 'Cardano',    sector: 'Smart Contract L1',        group: 'majors', color: '#3468D1' },
  { id: 'stellar',           cmcId: 512,   symbol: 'XLM',  name: 'Stellar',    sector: 'Payments · Settlement',    group: 'majors', color: '#14B6E7' },
  { id: 'the-open-network',  cmcId: 11419, symbol: 'TON',  name: 'Toncoin',    sector: 'Smart Contract L1',        group: 'majors', color: '#0098EA' },
  { id: 'litecoin',          cmcId: 2,     symbol: 'LTC',  name: 'Litecoin',   sector: 'Payments · Digital Silver', group: 'majors', color: '#BFBBBB' },
  { id: 'avalanche-2',       cmcId: 5805,  symbol: 'AVAX', name: 'Avalanche',  sector: 'Smart Contract L1',        group: 'majors', color: '#E84142' },
  { id: 'polkadot',          cmcId: 6636,  symbol: 'DOT',  name: 'Polkadot',   sector: 'Interoperability',          group: 'majors', color: '#E6007A' },
  { id: 'filecoin',          cmcId: 2280,  symbol: 'FIL',  name: 'Filecoin',   sector: 'Decentralized Storage',    group: 'majors', color: '#0090FF' },
  { id: 'curve-dao-token',   cmcId: 6538,  symbol: 'CRV',  name: 'Curve DAO',  sector: 'DeFi · DEX',                group: 'majors', color: '#B026FF' },
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
