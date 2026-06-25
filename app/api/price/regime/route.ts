import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { computeRegime } from '@/lib/indicators/regimeHelpers';

export const revalidate = 3600;

export async function GET() {
  try {
    const prices = await fetchBTCDailyPrice('2012-01-01');
    const result = computeRegime(prices);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/price/regime]', err);
    return NextResponse.json({ error: 'Failed to compute market regime' }, { status: 500 });
  }
}
