import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';

export const revalidate = 300; // 5-minute cache — same as /api/market

export async function GET() {
  try {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    const startTime = start.toISOString().slice(0, 10);

    const prices = await fetchBTCDailyPrice(startTime);
    return NextResponse.json({ prices });
  } catch (err) {
    console.error('[/api/price]', err);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}
