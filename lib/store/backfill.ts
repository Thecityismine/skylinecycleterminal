import { fetchBTCDailyPrice, fetchOnChainMetrics } from '@/lib/api/coinmetrics';
import { fetchFearGreedHistory }   from '@/lib/api/feargreed';
import { fetchStablecoinHistory }  from '@/lib/api/defillama';
import { utcDate } from '@/lib/store/observations';
import type { Observation } from '@/lib/store/observations';

// Seeds the store from vendor historical series, so the warehouse is useful on
// day one instead of in six months.
//
// Read the honesty caveat before using any of this in a claim. A backfilled row
// is real data but it is NOT a point-in-time observation: it carries every
// revision the vendor has made since, and it was never what Skyline knew on that
// date because Skyline did not exist on that date. Every row written here is
// flagged `backfilled: true`, and readSeries({ pointInTimeOnly: true }) drops
// them. Anything that claims a track record must pass that flag.
//
// What backfill is legitimately for: computing distributions, calibrating
// percentiles, charting long history, and giving the divergence work in the
// research memo a base to stand on. What it is not for: proving the terminal
// called something.

// ─── Metric ids ───────────────────────────────────────────────────────────────

export const BACKFILL_METRICS = {
  btcPrice:         'btc_price_usd',
  btcMarketCap:     'btc_market_cap_usd',
  btcTxCount:       'btc_tx_count',
  btcActiveAddr:    'btc_active_addresses',
  btcIssuance:      'btc_issuance_native',
  fearGreed:        'fear_greed',
  stablecoinSupply: 'stablecoin_supply_usd',
} as const;

export type BackfillSource = keyof typeof BACKFILL_METRICS | 'all';

// ─── Collection ───────────────────────────────────────────────────────────────

type Row = { metricDate: string; metric: string; value: number | null };

function toObservations(rows: Row[], source: string, observedDate: string): Observation[] {
  return rows.map((r) => ({
    metric:       r.metric,
    metricDate:   r.metricDate,
    observedDate,
    value:        r.value,
    source,
    backfilled:   true,
  }));
}

/**
 * Price history from Coin Metrics, back to `start`.
 *
 * Note the licence position flagged in the research memo: the Coin Metrics
 * community endpoint is CC BY-NC. Seeding a commercial product's history from it
 * carries the same problem as serving it live, so treat this as a development
 * seed until the feed is replaced or licensed.
 */
export async function backfillPrice(
  start = '2012-01-01',
  observedDate = utcDate(),
): Promise<Observation[]> {
  const points = await fetchBTCDailyPrice(start);
  return toObservations(
    points.map((p) => ({ metricDate: p.time, metric: BACKFILL_METRICS.btcPrice, value: p.price })),
    'coinmetrics:price',
    observedDate,
  );
}

/** Network activity from Coin Metrics: market cap, transactions, active addresses, issuance. */
export async function backfillOnChain(
  start = '2012-01-01',
  observedDate = utcDate(),
): Promise<Observation[]> {
  const points = await fetchOnChainMetrics(start);
  const rows: Row[] = [];
  for (const p of points) {
    rows.push({ metricDate: p.time, metric: BACKFILL_METRICS.btcMarketCap,  value: p.marketCap });
    rows.push({ metricDate: p.time, metric: BACKFILL_METRICS.btcTxCount,    value: p.txCnt });
    rows.push({ metricDate: p.time, metric: BACKFILL_METRICS.btcActiveAddr, value: p.adrActCnt });
    rows.push({ metricDate: p.time, metric: BACKFILL_METRICS.btcIssuance,   value: p.issTotNtv });
  }
  return toObservations(rows, 'coinmetrics:network', observedDate);
}

/** Fear & Greed, full history. Free and unrestricted. */
export async function backfillFearGreed(observedDate = utcDate()): Promise<Observation[]> {
  const points = await fetchFearGreedHistory();
  return toObservations(
    points.map((p) => ({ metricDate: p.time, metric: BACKFILL_METRICS.fearGreed, value: p.value })),
    'alternative.me',
    observedDate,
  );
}

/** Aggregate stablecoin supply from DefiLlama. Free, no key, commercially clean. */
export async function backfillStablecoins(observedDate = utcDate()): Promise<Observation[]> {
  const points = await fetchStablecoinHistory();
  return toObservations(
    points.map((p) => ({
      metricDate: p.time,
      metric: BACKFILL_METRICS.stablecoinSupply,
      value: p.stablecoinMC,
    })),
    'defillama:stablecoins',
    observedDate,
  );
}

export type BackfillPlan = {
  source: BackfillSource;
  rows: Observation[];
  errors: string[];
};

/**
 * Collect one or all backfill sources. Individual failures are collected rather
 * than thrown, because a vendor being down should seed what it can rather than
 * abandon the whole run.
 */
export async function collectBackfill(
  source: BackfillSource,
  start = '2012-01-01',
  observedDate = utcDate(),
): Promise<BackfillPlan> {
  const errors: string[] = [];
  const rows: Observation[] = [];

  const run = async (name: string, fn: () => Promise<Observation[]>) => {
    try {
      rows.push(...(await fn()));
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const wants = (k: BackfillSource) => source === 'all' || source === k;

  if (wants('btcPrice'))         await run('price',       () => backfillPrice(start, observedDate));
  if (wants('fearGreed'))        await run('feargreed',   () => backfillFearGreed(observedDate));
  if (wants('stablecoinSupply')) await run('stablecoins', () => backfillStablecoins(observedDate));
  if (
    wants('btcMarketCap') || wants('btcTxCount') ||
    wants('btcActiveAddr') || wants('btcIssuance')
  ) {
    await run('onchain', () => backfillOnChain(start, observedDate));
  }

  return { source, rows, errors };
}
