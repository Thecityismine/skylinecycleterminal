import { fetchBTCDailyPrice } from './coinmetrics';

export type EtfDailyFlow = {
  time: string;
  totalNetFlowUsd: number;
  btcClose: number;
  ibit?: number;
  fbtc?: number;
  arkb?: number;
  bitb?: number;
  hodl?: number;
  ezbc?: number;
  btcw?: number;
  brrr?: number;
  gbtc?: number;
  gbtcMini?: number;
};

export type EtfIssuer = {
  key: keyof EtfDailyFlow;
  ticker: string;
  issuer: string;
  color: string;
};

export const ETF_ISSUERS: EtfIssuer[] = [
  { key: 'ibit',     ticker: 'IBIT', issuer: 'BlackRock',    color: '#1F6DB5' },
  { key: 'fbtc',     ticker: 'FBTC', issuer: 'Fidelity',     color: '#35D07F' },
  { key: 'arkb',     ticker: 'ARKB', issuer: 'ARK/21Shares', color: '#FF6B35' },
  { key: 'bitb',     ticker: 'BITB', issuer: 'Bitwise',      color: '#9333EA' },
  { key: 'gbtc',     ticker: 'GBTC', issuer: 'Grayscale',    color: '#F85149' },
  { key: 'hodl',     ticker: 'HODL', issuer: 'VanEck',       color: '#0091BD' },
  { key: 'btcw',     ticker: 'BTCW', issuer: 'WisdomTree',   color: '#00A3E0' },
  { key: 'brrr',     ticker: 'BRRR', issuer: 'Valkyrie',     color: '#E6B450' },
  { key: 'ezbc',     ticker: 'EZBC', issuer: 'Franklin',     color: '#8B5CF6' },
  { key: 'gbtcMini', ticker: 'BTC',  issuer: 'Grayscale Mini', color: '#F87171' },
];

const MONTH_MAP: Record<string, string> = {
  jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
  jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
};

function parseDate(raw: string): string | null {
  // "12 Jun 2026" or "12-Jun-2026"
  const m = raw.trim().match(/(\d{1,2})[\s\-]+(\w{3})[\s\-]+(\d{4})/i);
  if (!m) return null;
  const month = MONTH_MAP[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
}

function parseMillions(raw: string): number | undefined {
  const s = raw.replace(/<[^>]+>/g, '').replace(/,/g, '').trim();
  if (!s || s === '-') return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n * 1_000_000;
}

function extractCells(row: string): string[] {
  return [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, '').trim());
}

function parseFarside(html: string): Omit<EtfDailyFlow, 'btcClose'>[] {
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const rows = [...tableMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1]);
  if (rows.length < 2) return [];

  // Find header row — look for row containing "IBIT" or "TOTAL"
  let headerIdx = 0;
  let headerCells: string[] = [];
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const cells = extractCells(rows[i]).map(c => c.toUpperCase());
    if (cells.some(c => c === 'IBIT' || c === 'TOTAL' || c === 'FBTC')) {
      headerCells = cells;
      headerIdx = i;
      break;
    }
  }
  if (headerCells.length === 0) return [];

  const col = (name: string) => headerCells.indexOf(name);

  const results: Omit<EtfDailyFlow, 'btcClose'>[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const cells = extractCells(rows[r]);
    if (cells.length < 3) continue;

    const time = parseDate(cells[0]);
    if (!time) continue;

    const get = (name: string): number | undefined => {
      const idx = col(name);
      if (idx < 1 || idx >= cells.length) return undefined;
      return parseMillions(cells[idx]);
    };

    // Try TOTAL column, fall back to summing issuers
    let total = get('TOTAL');
    if (total == null) {
      const parts = ['IBIT','FBTC','ARKB','BITB','HODL','EZBC','BTCW','BRRR','GBTC','BTC']
        .map(k => get(k) ?? 0);
      total = parts.reduce((s, v) => s + v, 0);
    }

    results.push({
      time,
      totalNetFlowUsd: total,
      ibit:     get('IBIT'),
      fbtc:     get('FBTC'),
      arkb:     get('ARKB'),
      bitb:     get('BITB'),
      hodl:     get('HODL'),
      ezbc:     get('EZBC'),
      btcw:     get('BTCW'),
      brrr:     get('BRRR'),
      gbtc:     get('GBTC'),
      gbtcMini: get('BTC'),
    });
  }

  return results
    .filter(r => !isNaN(r.totalNetFlowUsd))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export async function fetchEtfFlows(): Promise<EtfDailyFlow[]> {
  try {
    const res = await fetch('https://farside.co.uk/bitcoin-etf-flow-all-data/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://farside.co.uk/',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`Farside HTTP ${res.status}`);

    const html = await res.text();
    const flows = parseFarside(html);
    if (flows.length === 0) throw new Error('Farside parse returned 0 rows');

    // Merge BTC daily price from CoinMetrics
    const start = flows[0].time;
    const prices = await fetchBTCDailyPrice('btc', start);
    const priceMap = new Map(prices.map(p => [p.time, p.price]));

    return flows.map(f => ({
      ...f,
      btcClose: priceMap.get(f.time) ?? 0,
    }));
  } catch (err) {
    console.error('[etfFlows] fetch failed:', err);
    return [];
  }
}
