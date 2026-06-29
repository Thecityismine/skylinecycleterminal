import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import {
  CYCLE_ANCHORS,
  getCompletedCycles,
  getValidationMetrics,
  getActiveCyclePosition,
} from '@/lib/indicators/cycleAnchors';

export const revalidate = 3600;

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
