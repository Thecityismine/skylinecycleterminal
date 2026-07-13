import { fetchDailyPrice } from './coinmetrics';
import { COL_MAP } from './etfFlows';
import type { EtfDailyFlow } from './etfFlows';

// Fallback ETF flow source for when Farside is unreachable (Cloudflare blocks
// Node's fetch client with a JS challenge). SoSoValue's free/open API has no
// such protection, but its free tier is more limited than scraping Farside:
//   - historicalInflowChart only returns the trailing ~300 days (not full
//     history back to the Jan 2024 ETF launch)
//   - per-issuer breakdown is only available for the current day, not
//     historically — so every row except the most recent has issuer fields
//     left undefined. Downstream code already treats missing issuer fields
//     as "no data for this issuer that day," so this degrades gracefully.

const SOSO_BASE = 'https://api.sosovalue.xyz/openapi/v2/etf';

type SosoHistoryRow = { date: string; totalNetInflow: number };
type SosoIssuerRow  = { ticker: string; dailyNetInflow: { value: string } };
type SosoCurrent    = { dailyNetInflow?: { value: string }; list?: SosoIssuerRow[] };

async function sosoPost<T>(path: string): Promise<T> {
  const res = await fetch(`${SOSO_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ type: 'us-btc-spot' }),
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SoSoValue ${path} HTTP ${res.status}`);
  const json = await res.json() as { code: number; msg?: string; data?: T };
  if (json.code !== 0 || json.data == null) throw new Error(`SoSoValue ${path} error: ${json.msg ?? 'no data'}`);
  return json.data;
}

export async function fetchSoSoValueEtfFlows(): Promise<EtfDailyFlow[]> {
  const [history, current] = await Promise.all([
    sosoPost<SosoHistoryRow[]>('historicalInflowChart'),
    sosoPost<SosoCurrent>('currentEtfDataMetrics'),
  ]);

  const historyRows = history
    .map((d) => ({ time: d.date, totalNetFlowUsd: d.totalNetInflow }))
    .sort((a, b) => a.time.localeCompare(b.time));

  if (historyRows.length === 0) throw new Error('SoSoValue returned no historical rows');

  const todayIssuers: Partial<EtfDailyFlow> = {};
  for (const item of current.list ?? []) {
    const key = COL_MAP[item.ticker];
    if (key) (todayIssuers as Record<string, number>)[key] = Number(item.dailyNetInflow.value);
  }

  const lastIdx = historyRows.length - 1;
  // The live snapshot can be a few minutes fresher than the historical chart's
  // last daily close, so prefer it for today's total when both are present.
  const todayTotal = current.dailyNetInflow?.value != null
    ? Number(current.dailyNetInflow.value)
    : historyRows[lastIdx].totalNetFlowUsd;

  const start  = historyRows[0].time;
  const prices = await fetchDailyPrice('btc', start);
  const priceMap = new Map(prices.map((p) => [p.time, p.price]));

  return historyRows.map((row, i) => ({
    ...row,
    totalNetFlowUsd: i === lastIdx ? todayTotal : row.totalNetFlowUsd,
    ...(i === lastIdx ? todayIssuers : {}),
    btcClose: priceMap.get(row.time) ?? 0,
  }));
}
