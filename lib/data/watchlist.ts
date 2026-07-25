export type StockType = 'equity' | 'etf' | 'btc_proxy' | 'preferred';
export type StockGroup =
  | 'btc_treasury' | 'saylor' | 'btc' | 'mining' | 'ai' | 'ai_pure'
  | 'space' | 'tech' | 'health' | 'macro' | 'banks';

export type WatchlistItem = {
  ticker:  string;
  name:    string;
  sector:  string;
  // A company can belong to several categories at once — e.g. MARA is both a
  // miner and a Bitcoin treasury holder, so it appears under both filters.
  groups:  StockGroup[];
  type:    StockType;
  color:   string;
  // Optional YYYY-MM-DD cutoff — ignore price history before this date. For
  // companies whose listing predates a total change of business, the older
  // history belongs to a different company and corrupts every derived metric
  // (ATH, drawdown, and the self-calibrating trend percentiles).
  historyStart?: string;
};

export const WATCHLIST: WatchlistItem[] = [
  // ── Saylor / Strategy Ecosystem ───────────────────────────────────────────
  { ticker: 'MSTR',  name: 'Strategy',           sector: 'BTC Treasury',           groups: ['saylor', 'btc_treasury'], type: 'btc_proxy', color: '#F7931A' },
  { ticker: 'STRK',  name: 'Strategy Strike',    sector: 'Preferred · 8% Yield',  groups: ['saylor'],  type: 'preferred', color: '#FBBF24' },
  { ticker: 'STRF',  name: 'Strategy Strife',    sector: 'Preferred · 10% Yield', groups: ['saylor'],  type: 'preferred', color: '#FDE68A' },
  { ticker: 'STRC',  name: 'Strategy Strife C',  sector: 'Preferred · Convertible', groups: ['saylor'], type: 'preferred', color: '#FCD34D' },
  { ticker: 'MSTY',  name: 'YieldMax MSTR',      sector: 'Covered Call Income',   groups: ['saylor'],  type: 'etf',       color: '#A855F7' },
  { ticker: 'MSTU',  name: 'T-Rex 2X Long MSTR', sector: '2× Leveraged Long',     groups: ['saylor'],  type: 'etf',       color: '#35D07F' },
  { ticker: 'MSTX',  name: 'Defiance 2X MSTR',  sector: '2× Leveraged Long',     groups: ['saylor'],  type: 'etf',       color: '#22D3EE' },
  { ticker: 'MSTZ',  name: 'T-Rex 2X Inverse',   sector: '2× Leveraged Short',    groups: ['saylor'],  type: 'etf',       color: '#FF5C5C' },
  { ticker: 'SMST',  name: 'ProShares UltraShort', sector: '2× Leveraged Short',  groups: ['saylor'],  type: 'etf',       color: '#F87171' },

  // ── Bitcoin Treasury Companies ────────────────────────────────────────────
  // Companies holding BTC as a primary reserve asset. Most also live in another
  // category (miners, exchanges, the Saylor complex) — see `groups` above.
  // Listed since 2004 as Red Planet Japan, a hotel operator; renamed and
  // pivoted to a Bitcoin treasury strategy in April 2024. Pre-pivot prices are
  // effectively a different company (¥47,250 in 2004 -> ¥18 in 2023), which
  // put ATH 99.5% above spot and skewed the trend percentiles, so history is
  // cut to the pivot.
  { ticker: '3350.T', name: 'Metaplanet',        sector: 'BTC Treasury · Japan',   groups: ['btc_treasury'], type: 'btc_proxy', color: '#E8B32C', historyStart: '2024-04-01' },
  // Bitcoin Standard Treasury Co. has not completed its SPAC merger — no BSTR
  // ticker exists yet. CEPO is the pre-merger Cantor Equity Partners I vehicle
  // it is combining with, still trading near SPAC trust value (~$10).
  { ticker: 'CEPO',  name: 'Bitcoin Standard Treasury', sector: 'BTC Treasury · Pre-Merger SPAC', groups: ['btc_treasury'], type: 'equity', color: '#F7931A' },

  // ── BTC-Adjacent (exchanges, fintech) ─────────────────────────────────────
  { ticker: 'XXI',   name: 'Twenty One Capital', sector: 'BTC Treasury',           groups: ['btc', 'btc_treasury'], type: 'btc_proxy', color: '#F7931A' },
  { ticker: 'COIN',  name: 'Coinbase',           sector: 'Crypto Exchange',        groups: ['btc', 'btc_treasury'], type: 'equity',    color: '#0052FF' },
  { ticker: 'BLSH',  name: 'Bullish',            sector: 'Crypto Exchange',        groups: ['btc', 'btc_treasury'], type: 'equity',    color: '#1B4DFF' },
  { ticker: 'HOOD',    name: 'Robinhood',          sector: 'Crypto / Brokerage',     groups: ['btc'],     type: 'equity',    color: '#00C805' },
  { ticker: 'XYZ',    name: 'Block',              sector: 'BTC Treasury / Fintech', groups: ['btc', 'btc_treasury'], type: 'equity',    color: '#00D64F' }, // ticker changed from SQ
  { ticker: 'PYPL',   name: 'PayPal',             sector: 'Crypto Payments',        groups: ['btc'],     type: 'equity',    color: '#003087' },
  // Galaxy Digital relisted on Nasdaq as GLXY (USD); the old Toronto listing
  // GLXY.TO is delisted and returns no data from Yahoo.
  { ticker: 'GLXY',  name: 'Galaxy Digital',    sector: 'Crypto Finance',         groups: ['btc', 'btc_treasury'], type: 'equity',    color: '#9333EA' },

  // ── Bitcoin Mining ──────────────────────────────────────────────────────────
  { ticker: 'MARA',  name: 'MARA Holdings',      sector: 'Bitcoin Mining',         groups: ['mining', 'btc_treasury'], type: 'equity',    color: '#E6B450' },
  { ticker: 'RIOT',  name: 'Riot Platforms',     sector: 'Bitcoin Mining',         groups: ['mining', 'btc_treasury'], type: 'equity',    color: '#35D07F' },
  { ticker: 'CLSK',  name: 'CleanSpark',         sector: 'Bitcoin Mining',         groups: ['mining', 'btc_treasury'], type: 'equity',    color: '#22D3EE' },
  { ticker: 'IREN',  name: 'IREN',               sector: 'Bitcoin Mining',         groups: ['mining'],  type: 'equity',    color: '#FB923C' },
  { ticker: 'CIFR',  name: 'Cipher Mining',      sector: 'Bitcoin Mining',         groups: ['mining'],  type: 'equity',    color: '#818CF8' },
  { ticker: 'CORZ',  name: 'Core Scientific',    sector: 'Mining / AI HPC',        groups: ['mining'],  type: 'equity',    color: '#F87171' },
  { ticker: 'WULF',  name: 'TeraWulf',           sector: 'Bitcoin Mining',         groups: ['mining'],  type: 'equity',    color: '#4ADE80' },
  { ticker: 'BTDR',  name: 'Bitdeer',            sector: 'Mining / ASIC Mfg',      groups: ['mining'],  type: 'equity',    color: '#FBBF24' },
  { ticker: 'HIVE',  name: 'HIVE Digital',       sector: 'Bitcoin Mining',         groups: ['mining'],  type: 'equity',    color: '#C084FC' },
  { ticker: 'BITF',  name: 'Bitfarms',           sector: 'Bitcoin Mining',         groups: ['mining'],  type: 'equity',    color: '#F472B6' },
  { ticker: 'BTBT',  name: 'Bit Digital',        sector: 'Mining / AI Cloud',      groups: ['mining'],  type: 'equity',    color: '#38BDF8' },
  { ticker: 'CANG',  name: 'Cango',              sector: 'Bitcoin Mining',         groups: ['mining'],  type: 'equity',    color: '#FCA5A5' },

  // ── AI · Semiconductors ─────────────────────────────────────────────────────
  { ticker: 'NVDA',  name: 'NVIDIA',             sector: 'Semiconductors',         groups: ['ai'],      type: 'equity',    color: '#76B900' },
  { ticker: 'AMD',   name: 'AMD',                sector: 'Semiconductors',         groups: ['ai'],      type: 'equity',    color: '#ED1C24' },
  { ticker: 'AVGO',  name: 'Broadcom',           sector: 'Semiconductors',         groups: ['ai'],      type: 'equity',    color: '#CC0000' },
  { ticker: 'TSM',   name: 'TSMC',               sector: 'Semiconductors',         groups: ['ai'],      type: 'equity',    color: '#9B8CFF' },

  // ── AI Pure Play ────────────────────────────────────────────────────────────
  { ticker: 'PLTR',  name: 'Palantir',           sector: 'Defense AI',             groups: ['ai_pure'], type: 'equity',    color: '#00B5B5' },
  { ticker: 'ARM',   name: 'ARM Holdings',       sector: 'Chip Architecture',      groups: ['ai_pure'], type: 'equity',    color: '#0091BD' },
  { ticker: 'SMCI',  name: 'Super Micro',        sector: 'AI Servers',             groups: ['ai_pure'], type: 'equity',    color: '#C8C800' },
  { ticker: 'ORCL',  name: 'Oracle',             sector: 'AI Cloud Database',      groups: ['ai_pure'], type: 'equity',    color: '#F80000' },
  { ticker: 'NOW',   name: 'ServiceNow',         sector: 'Enterprise AI',          groups: ['ai_pure'], type: 'equity',    color: '#81B5A1' },
  { ticker: 'CRM',   name: 'Salesforce',         sector: 'AI CRM',                 groups: ['ai_pure'], type: 'equity',    color: '#00A1E0' },

  // ── Space ───────────────────────────────────────────────────────────────────
  { ticker: 'RKLB',  name: 'Rocket Lab',         sector: 'Space Launch',           groups: ['space'],   type: 'equity',    color: '#C6422E' },
  { ticker: 'ASTS',  name: 'AST SpaceMobile',    sector: 'Space Connectivity',     groups: ['space'],   type: 'equity',    color: '#5B7DD8' },
  { ticker: 'LUNR',  name: 'Intuitive Machines', sector: 'Lunar Exploration',      groups: ['space'],   type: 'equity',    color: '#A9B4C0' },

  // ── Mega-Cap Tech ───────────────────────────────────────────────────────────
  { ticker: 'AAPL',  name: 'Apple',              sector: 'Technology',             groups: ['tech'],    type: 'equity',    color: '#A2AAAD' },
  { ticker: 'MSFT',  name: 'Microsoft',          sector: 'Technology',             groups: ['tech'],    type: 'equity',    color: '#00A4EF' },
  { ticker: 'GOOGL', name: 'Alphabet',           sector: 'Technology',             groups: ['tech'],    type: 'equity',    color: '#34A853' },
  { ticker: 'AMZN',  name: 'Amazon',             sector: 'Cloud / Consumer',       groups: ['tech'],    type: 'equity',    color: '#FF9900' },
  { ticker: 'META',  name: 'Meta',               sector: 'Social / AI',            groups: ['tech'],    type: 'equity',    color: '#0467DF' },
  { ticker: 'TSLA',  name: 'Tesla',              sector: 'EV / Robotics',          groups: ['tech'],    type: 'equity',    color: '#CC0000' },

  // ── Healthcare / Pharma ─────────────────────────────────────────────────────
  { ticker: 'NVO',   name: 'Novo Nordisk',       sector: 'GLP-1 / Pharma',        groups: ['health'],  type: 'equity',    color: '#0066CC' },

  // ── Major Banks ─────────────────────────────────────────────────────────────
  { ticker: 'JPM',  name: 'JPMorgan Chase',    sector: 'Global Banking',         groups: ['banks'],   type: 'equity',    color: '#003087' },
  { ticker: 'BAC',  name: 'Bank of America',   sector: 'Global Banking',         groups: ['banks'],   type: 'equity',    color: '#E31837' },
  { ticker: 'WFC',  name: 'Wells Fargo',       sector: 'Commercial Banking',     groups: ['banks'],   type: 'equity',    color: '#D71E28' },
  { ticker: 'C',    name: 'Citigroup',         sector: 'Global Banking',         groups: ['banks'],   type: 'equity',    color: '#1F6DB5' },
  { ticker: 'GS',   name: 'Goldman Sachs',     sector: 'Investment Banking',     groups: ['banks'],   type: 'equity',    color: '#7399C6' },
  { ticker: 'MS',   name: 'Morgan Stanley',    sector: 'Investment Banking',     groups: ['banks'],   type: 'equity',    color: '#003D7B' },
  { ticker: 'HSBC', name: 'HSBC Holdings',     sector: 'Global Banking',         groups: ['banks'],   type: 'equity',    color: '#DB0011' },
  { ticker: 'BCS',  name: 'Barclays',          sector: 'Global Banking',         groups: ['banks'],   type: 'equity',    color: '#00AEEF' },
  { ticker: 'DB',   name: 'Deutsche Bank',     sector: 'Global Banking',         groups: ['banks'],   type: 'equity',    color: '#0018A8' },
  { ticker: 'UBS',  name: 'UBS Group',         sector: 'Wealth Management',      groups: ['banks'],   type: 'equity',    color: '#E60000' },

  // ── Macro · ETFs ────────────────────────────────────────────────────────────
  { ticker: 'GLD',   name: 'Gold ETF',           sector: 'Commodities',            groups: ['macro'],   type: 'etf',       color: '#D4A853' },
  { ticker: 'SPY',   name: 'S&P 500 ETF',        sector: 'Index',                  groups: ['macro'],   type: 'etf',       color: '#53A7FF' },
  { ticker: 'QQQ',   name: 'Nasdaq 100 ETF',     sector: 'Index',                  groups: ['macro'],   type: 'etf',       color: '#9B8CFF' },
  { ticker: 'TLT',   name: '20Y Treasury ETF',   sector: 'Bonds',                  groups: ['macro'],   type: 'etf',       color: '#35D07F' },
  { ticker: 'SPCX',  name: 'SPAC & New Issue ETF', sector: 'SPACs / IPOs',        groups: ['macro'],   type: 'etf',       color: '#8B5CF6' },
];

export const GROUP_LABELS: Record<StockGroup, string> = {
  btc_treasury: 'Bitcoin Treasury',
  saylor:   'Saylor Ecosystem',
  btc:      'BTC-Adjacent',
  mining:   'Bitcoin Mining',
  ai:       'AI · Semiconductors',
  ai_pure:  'AI Pure Play',
  space:    'Space',
  tech:     'Mega-Cap Tech',
  health:   'Healthcare · Pharma',
  macro:    'Macro · ETFs',
  banks:    'Major Banks',
};

export const GROUP_ORDER: StockGroup[] = ['btc_treasury', 'saylor', 'btc', 'mining', 'ai', 'ai_pure', 'space', 'tech', 'health', 'macro', 'banks'];

export function getStock(ticker: string): WatchlistItem | undefined {
  return WATCHLIST.find((s) => s.ticker === ticker.toUpperCase());
}
