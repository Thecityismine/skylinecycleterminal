export type StockType = 'equity' | 'etf' | 'btc_proxy';

export type WatchlistItem = {
  ticker:  string;
  name:    string;
  sector:  string;
  group:   'btc' | 'ai' | 'tech' | 'macro';
  type:    StockType;
  color:   string;
};

export const WATCHLIST: WatchlistItem[] = [
  // BTC-adjacent
  { ticker: 'MSTR',  name: 'MicroStrategy',   sector: 'BTC Treasury',      group: 'btc',  type: 'btc_proxy', color: '#F7931A' },
  { ticker: 'COIN',  name: 'Coinbase',         sector: 'Crypto Exchange',   group: 'btc',  type: 'equity',    color: '#0052FF' },
  { ticker: 'MARA',  name: 'MARA Holdings',    sector: 'Bitcoin Mining',    group: 'btc',  type: 'equity',    color: '#E6B450' },
  { ticker: 'RIOT',  name: 'Riot Platforms',   sector: 'Bitcoin Mining',    group: 'btc',  type: 'equity',    color: '#35D07F' },
  // AI / Semiconductors
  { ticker: 'NVDA',  name: 'NVIDIA',           sector: 'Semiconductors',    group: 'ai',   type: 'equity',    color: '#76B900' },
  { ticker: 'AMD',   name: 'AMD',              sector: 'Semiconductors',    group: 'ai',   type: 'equity',    color: '#ED1C24' },
  { ticker: 'AVGO',  name: 'Broadcom',         sector: 'Semiconductors',    group: 'ai',   type: 'equity',    color: '#CC0000' },
  { ticker: 'TSM',   name: 'TSMC',             sector: 'Semiconductors',    group: 'ai',   type: 'equity',    color: '#9B8CFF' },
  // Mega-cap Tech
  { ticker: 'AAPL',  name: 'Apple',            sector: 'Technology',        group: 'tech', type: 'equity',    color: '#A2AAAD' },
  { ticker: 'MSFT',  name: 'Microsoft',        sector: 'Technology',        group: 'tech', type: 'equity',    color: '#00A4EF' },
  { ticker: 'GOOGL', name: 'Alphabet',         sector: 'Technology',        group: 'tech', type: 'equity',    color: '#34A853' },
  { ticker: 'AMZN',  name: 'Amazon',           sector: 'Cloud / Consumer',  group: 'tech', type: 'equity',    color: '#FF9900' },
  { ticker: 'META',  name: 'Meta',             sector: 'Social / AI',       group: 'tech', type: 'equity',    color: '#0467DF' },
  { ticker: 'TSLA',  name: 'Tesla',            sector: 'EV / Robotics',     group: 'tech', type: 'equity',    color: '#CC0000' },
  // Macro
  { ticker: 'GLD',   name: 'Gold ETF',         sector: 'Commodities',       group: 'macro', type: 'etf',     color: '#D4A853' },
  { ticker: 'SPY',   name: 'S&P 500 ETF',      sector: 'Index',             group: 'macro', type: 'etf',     color: '#53A7FF' },
  { ticker: 'QQQ',   name: 'Nasdaq 100 ETF',   sector: 'Index',             group: 'macro', type: 'etf',     color: '#9B8CFF' },
  { ticker: 'TLT',   name: '20Y Treasury ETF', sector: 'Bonds',             group: 'macro', type: 'etf',     color: '#35D07F' },
];

export const GROUP_LABELS: Record<string, string> = {
  btc:   'BTC-Adjacent',
  ai:    'AI · Semiconductors',
  tech:  'Mega-Cap Tech',
  macro: 'Macro · ETFs',
};

export function getStock(ticker: string): WatchlistItem | undefined {
  return WATCHLIST.find((s) => s.ticker === ticker.toUpperCase());
}
