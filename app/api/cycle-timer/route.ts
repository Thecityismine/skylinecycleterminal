import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import {
  CYCLE_ANCHORS,
  getCompletedCycles,
  getValidationMetrics,
  getActiveCyclePosition,
} from '@/lib/indicators/cycleAnchors';

// Always rendered fresh. These pages get shared, and `revalidate` is
// stale-while-revalidate: the first visitor after expiry is served the previous
// render while a new one builds behind them, so on a low-traffic page every
// visit shows old data and staleness is unbounded.
//
// fetchCache is required alongside it. force-dynamic is documented as
// equivalent to setting every fetch to no-store, which would re-fetch full
// vendor history on each view. default-cache restores the per-fetch
// `next: { revalidate }` in lib/api/*, so the route recomputes per request
// while the vendor call stays cached.
export const dynamic = 'force-dynamic';
export const fetchCache = 'default-cache';
export async function GET() {
  try {
    const raw     = await fetchBTCDailyPrice('2015-01-01');
    const metrics = getValidationMetrics();

    return Response.json({
      prices: raw.map((p) => ({
        time:  p.time,
        ts:    new Date(p.time + 'T00:00:00Z').getTime(),
        price: p.price,
      })),
      anchors:          CYCLE_ANCHORS,
      completedCycles:  getCompletedCycles(),
      validationMetrics: metrics,
      activeCycle:      getActiveCyclePosition(metrics),
    });
  } catch {
    return Response.json({ error: 'Failed to load cycle data' }, { status: 500 });
  }
}
