import { NextRequest, NextResponse } from 'next/server';
import { fetchWeeklyHistory, fetchFundamentals, EMPTY_FUNDAMENTALS } from '@/lib/api/yahoo';
import { buildEquityData } from '@/lib/indicators/equityScore';
import { getStock } from '@/lib/data/watchlist';

export const revalidate = 3600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const sym   = ticker.toUpperCase();
  const stock = getStock(sym) ?? {
    ticker: sym, name: sym, sector: 'Unknown',
    group: 'tech' as const, type: 'equity' as const, color: '#A9B4C0',
  };

  // Fetch both independently — fundamentals failure should not kill chart data
  const [chartResult, fundResult] = await Promise.allSettled([
    fetchWeeklyHistory(sym),
    fetchFundamentals(sym),
  ]);

  if (chartResult.status === 'rejected') {
    console.error(`equities/${sym} chart:`, chartResult.reason?.message);
    return NextResponse.json(
      { error: `Price data unavailable: ${chartResult.reason?.message}` },
      { status: 500 },
    );
  }

  const closes = chartResult.value;
  if (!closes.length) {
    return NextResponse.json({ error: 'No price data returned' }, { status: 404 });
  }

  let fund = EMPTY_FUNDAMENTALS;
  let fundamentalsAvailable = false;

  if (fundResult.status === 'fulfilled') {
    fund = fundResult.value;
    fundamentalsAvailable = true;
  } else {
    console.warn(`equities/${sym} fundamentals:`, fundResult.reason?.message);
  }

  const data = buildEquityData(
    stock.ticker, stock.name, stock.sector, stock.type, stock.color,
    closes, fund,
  );

  return NextResponse.json({ ...data, fundamentalsAvailable });
}
