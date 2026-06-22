import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol   = searchParams.get('symbol')   ?? 'BTCUSDT';
  const limit    = searchParams.get('limit')    ?? '1000';
  const exchange = searchParams.get('exchange') ?? 'com'; // 'com' | 'us'

  const base = exchange === 'us'
    ? 'https://api.binance.us'
    : 'https://api.binance.com';

  try {
    const res = await fetch(
      `${base}/api/v3/depth?symbol=${encodeURIComponent(symbol)}&limit=${encodeURIComponent(limit)}`,
      { cache: 'no-store' },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Binance ${exchange} returned HTTP ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[/api/binance/depth]', err);
    return NextResponse.json({ error: 'Failed to fetch order book snapshot' }, { status: 500 });
  }
}
