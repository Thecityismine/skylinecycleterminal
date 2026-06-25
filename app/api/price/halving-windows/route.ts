import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { buildHalvingWindows } from '@/lib/indicators/halvingWindows';

export const revalidate = 3600;

export async function GET() {
  try {
    // Fetch from 2010 so H1 accumulation window (mid-2011) has data
    const daily = await fetchBTCDailyPrice('2010-07-01');
    const valid  = daily.filter((p) => p.price > 0);

    const windows = buildHalvingWindows(valid);

    // Weekly downsample for chart rendering
    const points = valid
      .filter((_, i, arr) => i % 7 === 0 || i === arr.length - 1)
      .map((p) => ({
        time:  p.time,
        ts:    new Date(p.time + 'T00:00:00Z').getTime(),
        price: p.price,
      }));

    return NextResponse.json({ points, windows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
