export type StockType = 'equity' | 'etf' | 'btc_proxy';
export type StockGroup = 'btc' | 'mining' | 'ai' | 'ai_pure' | 'space' | 'tech' | 'health' | 'macro';

export type WatchlistItem = {
  ticker:  string;
  name:    string;
  sector:  string;
  group:   StockGroup;
  type:    StockType;
  color:   string;
};

export const WATCHLIST: WatchlistItem[] = [
  // ── BTC-Adjacent (treasuries, exchanges, fintech) ──────────────────────────
  { ticker: 'MSTR',  name: 'MicroStrategy',     sector: 'BTC Treasury',           group: 'btc',     type: 'btc_proxy', color: '#F7931A' },
  { ticker: 'COIN',  name: 'Coinbase',           sector: 'Crypto Exchange',        group: 'btc',     type: 'equity',    color: '#0052FF' },
  { ticker: 'HOOD',    name: 'Robinhood',          sector: 'Crypto / Brokerage',     group: 'btc',     type: 'equity',    color: '#00C805' },
  { ticker: 'SQ',     name: 'Block',              sector: 'BTC Treasury / Fintech', group: 'btc',     type: 'equity',    color: '#00D64F' },
  { ticker: 'PYPL',   name: 'PayPal',             sector: 'Crypto Payments',        group: 'btc',     type: 'equity',    color: '#003087' },
  { ticker: 'GLXY.TO', name: 'Galaxy Digital',    sector: 'Crypto Finance',         group: 'btc',     type: 'equity',    color: '#9333EA' },

  // ── Bitcoin Mining ──────────────────────────────────────────────────────────
  { ticker: 'MARA',  name: 'MARA Holdings',      sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#E6B450' },
  { ticker: 'RIOT',  name: 'Riot Platforms',     sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#35D07F' },
  { ticker: 'CLSK',  name: 'CleanSpark',         sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#22D3EE' },
  { ticker: 'IREN',  name: 'IREN',               sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#FB923C' },
  { ticker: 'CIFR',  name: 'Cipher Mining',      sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#818CF8' },
  { ticker: 'CORZ',  name: 'Core Scientific',    sector: 'Mining / AI HPC',        group: 'mining',  type: 'equity',    color: '#F87171' },
  { ticker: 'WULF',  name: 'TeraWulf',           sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#4ADE80' },
  { ticker: 'BTDR',  name: 'Bitdeer',            sector: 'Mining / ASIC Mfg',      group: 'mining',  type: 'equity',    color: '#FBBF24' },
  { ticker: 'HIVE',  name: 'HIVE Digital',       sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#C084FC' },
  { ticker: 'BITF',  name: 'Bitfarms',           sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#F472B6' },
  { ticker: 'BTBT',  name: 'Bit Digital',        sector: 'Mining / AI Cloud',      group: 'mining',  type: 'equity',    color: '#38BDF8' },
  { ticker: 'CANG',  name: 'Cango',              sector: 'Bitcoin Mining',         group: 'mining',  type: 'equity',    color: '#FCA5A5' },

  // ── AI · Semiconductors ─────────────────────────────────────────────────────
  { ticker: 'NVDA',  name: 'NVIDIA',             sector: 'Semiconductors',         group: 'ai',      type: 'equity',    color: '#76B900' },
  { ticker: 'AMD',   name: 'AMD',                sector: 'Semiconductors',         group: 'ai',      type: 'equity',    color: '#ED1C24' },
  { ticker: 'AVGO',  name: 'Broadcom',           sector: 'Semiconductors',         group: 'ai',      type: 'equity',    color: '#CC0000' },
  { ticker: 'TSM',   name: 'TSMC',               sector: 'Semiconductors',         group: 'ai',      type: 'equity',    color: '#9B8CFF' },

  // ── AI Pure Play ────────────────────────────────────────────────────────────
  { ticker: 'PLTR',  name: 'Palantir',           sector: 'Defense AI',             group: 'ai_pure', type: 'equity',    color: '#00B5B5' },
  { ticker: 'ARM',   name: 'ARM Holdings',       sector: 'Chip Architecture',      group: 'ai_pure', type: 'equity',    color: '#0091BD' },
  { ticker: 'SMCI',  name: 'Super Micro',        sector: 'AI Servers',             group: 'ai_pure', type: 'equity',    color: '#C8C800' },
  { ticker: 'ORCL',  name: 'Oracle',             sector: 'AI Cloud Database',      group: 'ai_pure', type: 'equity',    color: '#F80000' },
  { ticker: 'NOW',   name: 'ServiceNow',         sector: 'Enterprise AI',          group: 'ai_pure', type: 'equity',    color: '#81B5A1' },
  { ticker: 'CRM',   name: 'Salesforce',         sector: 'AI CRM',                 group: 'ai_pure', type: 'equity',    color: '#00A1E0' },

  // ── Space ───────────────────────────────────────────────────────────────────
  { ticker: 'RKLB',  name: 'Rocket Lab',         sector: 'Space Launch',           group: 'space',   type: 'equity',    color: '#C6422E' },
  { ticker: 'ASTS',  name: 'AST SpaceMobile',    sector: 'Space Connectivity',     group: 'space',   type: 'equity',    color: '#5B7DD8' },
  { ticker: 'LUNR',  name: 'Intuitive Machines', sector: 'Lunar Exploration',      group: 'space',   type: 'equity',    color: '#A9B4C0' },

  // ── Mega-Cap Tech ───────────────────────────────────────────────────────────
  { ticker: 'AAPL',  name: 'Apple',              sector: 'Technology',             group: 'tech',    type: 'equity',    color: '#A2AAAD' },
  { ticker: 'MSFT',  name: 'Microsoft',          sector: 'Technology',             group: 'tech',    type: 'equity',    color: '#00A4EF' },
  { ticker: 'GOOGL', name: 'Alphabet',           sector: 'Technology',             group: 'tech',    type: 'equity',    color: '#34A853' },
  { ticker: 'AMZN',  name: 'Amazon',             sector: 'Cloud / Consumer',       group: 'tech',    type: 'equity',    color: '#FF9900' },
  { ticker: 'META',  name: 'Meta',               sector: 'Social / AI',            group: 'tech',    type: 'equity',    color: '#0467DF' },
  { ticker: 'TSLA',  name: 'Tesla',              sector: 'EV / Robotics',          group: 'tech',    type: 'equity',    color: '#CC0000' },

  // ── Healthcare / Pharma ─────────────────────────────────────────────────────
  { ticker: 'NVO',   name: 'Novo Nordisk',       sector: 'GLP-1 / Pharma',        group: 'health',  type: 'equity',    color: '#0066CC' },

  // ── Macro · ETFs ────────────────────────────────────────────────────────────
  { ticker: 'GLD',   name: 'Gold ETF',           sector: 'Commodities',            group: 'macro',   type: 'etf',       color: '#D4A853' },
  { ticker: 'SPY',   name: 'S&P 500 ETF',        sector: 'Index',                  group: 'macro',   type: 'etf',       color: '#53A7FF' },
  { ticker: 'QQQ',   name: 'Nasdaq 100 ETF',     sector: 'Index',                  group: 'macro',   type: 'etf',       color: '#9B8CFF' },
  { ticker: 'TLT',   name: '20Y Treasury ETF',   sector: 'Bonds',                  group: 'macro',   type: 'etf',       color: '#35D07F' },
  { ticker: 'SPCX',  name: 'SPAC & New Issue ETF', sector: 'SPACs / IPOs',        group: 'macro',   type: 'etf',       color: '#8B5CF6' },
];

export const GROUP_LABELS: Record<StockGroup, string> = {
  btc:      'BTC-Adjacent',
  mining:   'Bitcoin Mining',
  ai:       'AI · Semiconductors',
  ai_pure:  'AI Pure Play',
  space:    'Space',
  tech:     'Mega-Cap Tech',
  health:   'Healthcare · Pharma',
  macro:    'Macro · ETFs',
};

export const GROUP_ORDER: StockGroup[] = ['btc', 'mining', 'ai', 'ai_pure', 'space', 'tech', 'health', 'macro'];

export function getStock(ticker: string): WatchlistItem | undefined {
  return WATCHLIST.find((s) => s.ticker === ticker.toUpperCase());
}
