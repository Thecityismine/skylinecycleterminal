import { fetchDailyPrice } from './coinmetrics';

export type EtfDailyFlow = {
  time: string;
  totalNetFlowUsd: number;
  btcClose: number;
  ibit?: number;
  fbtc?: number;
  bitb?: number;
  arkb?: number;
  btco?: number;
  ezbc?: number;
  brrr?: number;
  hodl?: number;
  btcw?: number;
  msbt?: number;
  gbtc?: number;
  btcMini?: number;
};

export type EtfIssuer = {
  key: keyof EtfDailyFlow;
  ticker: string;
  issuer: string;
  color: string;
};

// Matches the actual columns Farside publishes (verified from live data)
export const ETF_ISSUERS: EtfIssuer[] = [
  { key: 'ibit',    ticker: 'IBIT', issuer: 'BlackRock',        color: '#1F6DB5' },
  { key: 'fbtc',    ticker: 'FBTC', issuer: 'Fidelity',         color: '#35D07F' },
  { key: 'bitb',    ticker: 'BITB', issuer: 'Bitwise',          color: '#9333EA' },
  { key: 'arkb',    ticker: 'ARKB', issuer: 'ARK/21Shares',     color: '#FF6B35' },
  { key: 'btco',    ticker: 'BTCO', issuer: 'Invesco Galaxy',   color: '#0091BD' },
  { key: 'ezbc',    ticker: 'EZBC', issuer: 'Franklin',         color: '#8B5CF6' },
  { key: 'brrr',    ticker: 'BRRR', issuer: 'Valkyrie',         color: '#E6B450' },
  { key: 'hodl',    ticker: 'HODL', issuer: 'VanEck',           color: '#22D3EE' },
  { key: 'btcw',    ticker: 'BTCW', issuer: 'WisdomTree',       color: '#00A3E0' },
  { key: 'msbt',    ticker: 'MSBT', issuer: 'ProShares',        color: '#A78BFA' },
  { key: 'gbtc',    ticker: 'GBTC', issuer: 'Grayscale',        color: '#F85149' },
  { key: 'btcMini', ticker: 'BTC',  issuer: 'Grayscale Mini',   color: '#F87171' },
];

// Column name → EtfDailyFlow key mapping (handles Farside column names)
const COL_MAP: Record<string, keyof EtfDailyFlow> = {
  IBIT: 'ibit', FBTC: 'fbtc', BITB: 'bitb', ARKB: 'arkb',
  BTCO: 'btco', EZBC: 'ezbc', BRRR: 'brrr', HODL: 'hodl',
  BTCW: 'btcw', MSBT: 'msbt', GBTC: 'gbtc', BTC: 'btcMini',
};

const MONTH_MAP: Record<string, string> = {
  jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06',
  jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12',
};

function parseDate(raw: string): string | null {
  const m = raw.trim().match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
  if (!m) return null;
  const month = MONTH_MAP[m[2].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
}

function parseMillions(raw: string): number | undefined {
  const s = raw.replace(/<[^>]+>/g, '').replace(/,/g, '').trim();
  if (!s || s === '-' || s === '' || s === 'N/A') return undefined;
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n * 1_000_000;
}

function parseFarside(html: string): Omit<EtfDailyFlow, 'btcClose'>[] {
  // Extract all tabletext spans (Farside's CSS class for data cells)
  const allSpans = [...html.matchAll(/<span[^>]*class="tabletext"[^>]*>([^<]*)<\/span>/gi)]
    .map(m => m[1].trim());

  if (allSpans.length === 0) return [];

  // Find header row — look for 'Date' followed by ETF tickers
  let headerStart = -1;
  for (let i = 0; i < allSpans.length - 3; i++) {
    if (allSpans[i] === 'Date' && allSpans[i + 1] === 'IBIT') {
      headerStart = i;
      break;
    }
  }
  if (headerStart < 0) return [];

  // Read headers until we hit 'Total'
  const headers: string[] = [];
  let i = headerStart;
  while (i < allSpans.length && allSpans[i] !== 'Total') {
    headers.push(allSpans[i].toUpperCase());
    i++;
  }
  if (i < allSpans.length) {
    headers.push('TOTAL');
    i++;
  }

  const colCount = headers.length;

  // Parse data rows
  const results: Omit<EtfDailyFlow, 'btcClose'>[] = [];
  const dataStart = headerStart + colCount;

  for (let j = dataStart; j + colCount - 1 < allSpans.length; j += colCount) {
    const time = parseDate(allSpans[j]);
    if (!time) continue;

    const row: Omit<EtfDailyFlow, 'btcClose'> = { time, totalNetFlowUsd: 0 };

    let total: number | undefined;
    for (let c = 1; c < colCount; c++) {
      const col = headers[c];
      const val = parseMillions(allSpans[j + c]);
      if (col === 'TOTAL') {
        total = val;
      } else {
        const key = COL_MAP[col];
        if (key) (row as Record<string, unknown>)[key] = val;
      }
    }

    // Use Farside's Total if present, otherwise sum issuers
    if (total != null) {
      row.totalNetFlowUsd = total;
    } else {
      let sum = 0;
      for (const k of Object.values(COL_MAP)) {
        const v = (row as Record<string, unknown>)[k] as number | undefined;
        if (v != null) sum += v;
      }
      row.totalNetFlowUsd = sum;
    }

    if (!isNaN(row.totalNetFlowUsd)) results.push(row);
  }

  return results.sort((a, b) => a.time.localeCompare(b.time));
}

const FARSIDE_URL = 'https://farside.co.uk/bitcoin-etf-flow-all-data/';
const FARSIDE_ENC = encodeURIComponent(FARSIDE_URL);

// When the ETF page runs in Edge Runtime (Cloudflare network), it fetches Farside
// directly. Cloudflare-to-Cloudflare requests bypass the WAF block that affects
// AWS Lambda IPs. Browser-like headers are sent as a second layer of defence.
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

// External CORS proxy fallbacks (tried if direct Farside fetch fails)
const CORS_PROXIES = [
  `https://api.allorigins.win/get?url=${FARSIDE_ENC}`,
  `https://corsproxy.io/?url=${FARSIDE_ENC}`,
];

async function tryFetch(url: string, timeout = 8000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // allorigins.win wraps HTML in JSON { contents, status }
    if (text.trimStart().startsWith('{') && text.includes('"contents"')) {
      const json = JSON.parse(text) as { contents?: string; status?: { http_code?: number } };
      if (json.status?.http_code && json.status.http_code !== 200) return null;
      return json.contents ?? null;
    }
    return text;
  } catch {
    return null;
  }
}

async function fetchFarsideHtml(): Promise<string> {
  // 1. Direct fetch (works when running on Edge/Cloudflare; blocked from AWS Lambda)
  const direct = await tryFetch(FARSIDE_URL, 10000);
  if (direct && direct.length > 5000 && direct.includes('IBIT')) return direct;

  // 2. External CORS proxies as fallback
  for (const proxy of CORS_PROXIES) {
    const html = await tryFetch(proxy, 8000);
    if (html && html.length > 5000 && html.includes('IBIT')) return html;
  }

  throw new Error('All Farside fetch strategies failed');
}

export async function fetchEtfFlows(): Promise<EtfDailyFlow[]> {
  try {
    const html   = await fetchFarsideHtml();
    const flows  = parseFarside(html);
    if (flows.length === 0) throw new Error('Farside parse returned 0 rows');

    const start  = flows[0].time;
    const prices = await fetchDailyPrice('btc', start);
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
