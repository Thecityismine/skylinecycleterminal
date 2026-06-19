import { NextResponse } from 'next/server';
import { fetchDailyPrice } from '@/lib/api/coinmetrics';

// Dynamic because it reads query params (?asset=, ?start=)
// Underlying CoinMetrics fetch is cached at 24hr via Next.js fetch cache
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const asset = searchParams.get('asset') === 'eth' ? 'eth' : 'btc';
    const start = searchParams.get('start') ?? '2010-01-01';

    const prices = await fetchDailyPrice(asset, start);
    return NextResponse.json({ prices });
  } catch (err) {
    console.error('[/api/price]', err);
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 });
  }
}
