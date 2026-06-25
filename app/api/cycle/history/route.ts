import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { computeHistoricalScore } from '@/lib/indicators/historicalScore';

export const revalidate = 3600;

export async function GET() {
  try {
    const prices = await fetchBTCDailyPrice('2012-01-01');
    const points = computeHistoricalScore(prices);
    return NextResponse.json({ points });
  } catch (err) {
    console.error('[/api/cycle/history]', err);
    return NextResponse.json({ error: 'Failed to compute score history' }, { status: 500 });
  }
}
