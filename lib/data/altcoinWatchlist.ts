export type AltcoinGroup = 'majors';

export type AltcoinWatchlistItem = {
  id:     string;   // CoinGecko coin id — routes and API calls key off this
  symbol: string;
  name:   string;
  sector: string;
  group:  AltcoinGroup;
  color:  string;
};

export const ALTCOIN_WATCHLIST: AltcoinWatchlistItem[] = [
  { id: 'binancecoin',       symbol: 'BNB',  name: 'BNB',        sector: 'Exchange Token · L1',      group: 'majors', color: '#F0B90B' },
  { id: 'ripple',            symbol: 'XRP',  name: 'XRP',        sector: 'Payments · Settlement',    group: 'majors', color: '#27A2DB' },
  { id: 'solana',            symbol: 'SOL',  name: 'Solana',     sector: 'Smart Contract L1',        group: 'majors', color: '#14F195' },
  { id: 'dogecoin',          symbol: 'DOGE', name: 'Dogecoin',   sector: 'Meme',                     group: 'majors', color: '#C2A633' },
  { id: 'chainlink',         symbol: 'LINK', name: 'Chainlink',  sector: 'Oracle · Middleware',       group: 'majors', color: '#2A5ADA' },
  { id: 'cardano',           symbol: 'ADA',  name: 'Cardano',    sector: 'Smart Contract L1',        group: 'majors', color: '#3468D1' },
  { id: 'stellar',           symbol: 'XLM',  name: 'Stellar',    sector: 'Payments · Settlement',    group: 'majors', color: '#14B6E7' },
  { id: 'the-open-network',  symbol: 'TON',  name: 'Toncoin',    sector: 'Smart Contract L1',        group: 'majors', color: '#0098EA' },
  { id: 'litecoin',          symbol: 'LTC',  name: 'Litecoin',   sector: 'Payments · Digital Silver', group: 'majors', color: '#BFBBBB' },
  { id: 'avalanche-2',       symbol: 'AVAX', name: 'Avalanche',  sector: 'Smart Contract L1',        group: 'majors', color: '#E84142' },
  { id: 'polkadot',          symbol: 'DOT',  name: 'Polkadot',   sector: 'Interoperability',          group: 'majors', color: '#E6007A' },
  { id: 'filecoin',          symbol: 'FIL',  name: 'Filecoin',   sector: 'Decentralized Storage',    group: 'majors', color: '#0090FF' },
  { id: 'curve-dao-token',   symbol: 'CRV',  name: 'Curve DAO',  sector: 'DeFi · DEX',                group: 'majors', color: '#B026FF' },
  { id: 'ondo-finance',      symbol: 'ONDO', name: 'Ondo',       sector: 'RWA Tokenization',          group: 'majors', color: '#5B57F5' },
  { id: 'hyperliquid',       symbol: 'HYPE', name: 'Hyperliquid', sector: 'Perp DEX · L1',            group: 'majors', color: '#5CE1E6' },
];

export const ALTCOIN_GROUP_LABELS: Record<AltcoinGroup, string> = {
  majors: 'Major Alts',
};

export const ALTCOIN_GROUP_ORDER: AltcoinGroup[] = ['majors'];

export function getAltcoin(id: string): AltcoinWatchlistItem | undefined {
  const key = id.toLowerCase();
  return ALTCOIN_WATCHLIST.find((c) => c.id === key || c.symbol.toLowerCase() === key);
}
