import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { calculateValuationPoints, getCyclePosition, classifyZone } from '@/lib/indicators/valuationCycle';

export const revalidate = 86400;

export async function GET() {
  try {
    const daily  = await fetchBTCDailyPrice('2012-01-01');
    const points = calculateValuationPoints(daily);
    const cycle  = getCyclePosition();

    const last = points[points.length - 1] ?? null;

    return NextResponse.json({
      points,
      cycle,
      current: last && {
        time:                 last.time,
        close:                last.close,
        ma200:                last.ma200,
        priceToMa200:         last.priceToMa200,
        deviation:            last.deviation,
        daysUntilNextHalving: last.daysUntilNextHalving,
        zone:                 classifyZone(last.deviation),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
