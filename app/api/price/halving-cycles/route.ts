import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';

export const revalidate = 3600;

export async function GET() {
  try {
    const daily = await fetchBTCDailyPrice('2012-01-01');
    // Weekly downsample â€” keep one point per 7 days + always include the last point
    const weekly = daily
      .filter((p) => p.price > 0)
      .filter((_, i, arr) => i % 7 === 0 || i === arr.length - 1)
      .map((p) => ({ time: p.time, ts: new Date(p.time + 'T00:00:00Z').getTime(), price: p.price }));
    return NextResponse.json({ points: weekly });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
