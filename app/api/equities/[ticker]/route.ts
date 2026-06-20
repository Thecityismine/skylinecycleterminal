import { NextRequest, NextResponse } from 'next/server';
import { fetchWeeklyHistory, fetchFundamentals } from '@/lib/api/yahoo';
import { buildEquityData } from '@/lib/indicators/equityScore';
import { getStock, WATCHLIST } from '@/lib/data/watchlist';

export const revalidate = 3600;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> },
) {
  const { ticker } = await params;
  const sym   = ticker.toUpperCase();
  const stock = getStock(sym) ?? {
    ticker: sym, name: sym, sector: 'Unknown', group: 'tech' as const, type: 'equity' as const, color: '#A9B4C0',
  };

  try {
    const [closes, fund] = await Promise.all([
      fetchWeeklyHistory(sym),
      fetchFundamentals(sym),
    ]);

    if (!closes.length) {
      return NextResponse.json({ error: 'No price data' }, { status: 404 });
    }

    const data = buildEquityData(
      stock.ticker, stock.name, stock.sector, stock.type, stock.color,
      closes, fund,
    );

    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`equities/${sym}`, err?.message);
    return NextResponse.json({ error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
