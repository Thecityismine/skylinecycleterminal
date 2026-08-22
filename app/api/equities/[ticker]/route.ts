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
  const listed = getStock(sym);

  // Tickers outside the watchlist are still passed through to Yahoo, which is
  // deliberate — a real symbol we have not curated should still resolve. But a
  // typo reaches this far too, so an upstream miss on an unlisted symbol is
  // reported as 404 (no such ticker) rather than 500 (our data source is down).
  const stock = listed ?? {
    ticker: sym, name: sym, sector: 'Unknown',
    groups: ['tech'] as const, type: 'equity' as const, color: '#A9B4C0',
  };

  // Fetch both independently — fundamentals failure should not kill chart data
  const [chartResult, fundResult] = await Promise.allSettled([
    fetchWeeklyHistory(sym),
    fetchFundamentals(sym),
  ]);

  if (chartResult.status === 'rejected') {
    if (!listed) {
      return NextResponse.json({ error: `No ticker named "${sym}"` }, { status: 404 });
    }
    console.error(`equities/${sym} chart:`, chartResult.reason?.message);
    return NextResponse.json(
      { error: `Price data unavailable: ${chartResult.reason?.message}` },
      { status: 500 },
    );
  }

  let closes = chartResult.value;
  if (!closes.length) {
    return NextResponse.json(
      { error: listed ? 'No price data returned' : `No ticker named "${sym}"` },
      { status: 404 },
    );
  }

  // Drop history from before a total change of business (see `historyStart` in
  // the watchlist) so ATH, drawdown and the trend percentiles are computed only
  // over the current company's life. Ignored if it would leave nothing.
  const historyStart = 'historyStart' in stock ? stock.historyStart : undefined;
  if (historyStart) {
    const trimmed = closes.filter((c) => c.time >= historyStart);
    if (trimmed.length) closes = trimmed;
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
