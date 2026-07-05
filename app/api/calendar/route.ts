import { NextResponse } from 'next/server';
import { fetchDailyPrice } from '@/lib/api/coinmetrics';
import {
  buildMonthlyCandles,
  buildMonthlyPerformance,
  buildMonthSummaries,
  buildCyclePhaseMap,
  getCyclePhase,
  calculateYTDReturn,
  MONTH_NAMES,
} from '@/lib/indicators/seasonality';
import type { CyclePhase } from '@/lib/indicators/seasonality';

export const revalidate = 86400; // 24-hour cache — monthly data doesn't need frequent recalculation

const ASSET_START: Record<string, string> = {
  btc: '2011-01-01',
  eth: '2015-08-01',
};

export type HeatmapRow = {
  year:              number;
  cyclePhase:        CyclePhase;
  monthly:           (number | null)[]; // returns, 12 entries, index 0 = Jan
  monthlyVolatility: (number | null)[]; // high/low range %, 12 entries, index 0 = Jan
  yearReturn:        number | null;     // compounded return across available months
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetParam = (searchParams.get('asset') ?? 'btc').toLowerCase();
  const asset = assetParam === 'eth' ? 'eth' : 'btc';

  try {
    const daily = await fetchDailyPrice(asset, ASSET_START[asset]);
    if (daily.length === 0) {
      return NextResponse.json({ error: `No price data available for ${asset}` }, { status: 502 });
    }

    const candles = buildMonthlyCandles(daily);
    const perf    = buildMonthlyPerformance(candles);
    const monthSummaries = buildMonthSummaries(perf);

    const now          = new Date();
    const currentYear  = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    const years = Array.from(new Set(candles.map((c) => c.year))).sort((a, b) => a - b);

    const returnByYear     = new Map<number, Map<number, number>>();
    const volatilityByYear = new Map<number, Map<number, number>>();
    for (const p of perf) {
      if (!returnByYear.has(p.year)) returnByYear.set(p.year, new Map());
      if (!volatilityByYear.has(p.year)) volatilityByYear.set(p.year, new Map());
      returnByYear.get(p.year)!.set(p.month, p.returnPct);
      volatilityByYear.get(p.year)!.set(p.month, p.volatilityPct);
    }

    const heatmap: HeatmapRow[] = years.map((year) => {
      const monthMap = returnByYear.get(year);
      const volMap   = volatilityByYear.get(year);
      const monthly: (number | null)[] = Array.from({ length: 12 }, (_, i) =>
        monthMap?.get(i + 1) ?? null
      );
      const monthlyVolatility: (number | null)[] = Array.from({ length: 12 }, (_, i) =>
        volMap?.get(i + 1) ?? null
      );
      const known = monthly.filter((v): v is number => v !== null);
      const yearReturn = known.length > 0
        ? (known.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100
        : null;
      return { year, cyclePhase: getCyclePhase(year), monthly, monthlyVolatility, yearReturn };
    });

    // YTD — current year open price (first candle of currentYear) vs latest price
    const yearOpenCandle = candles.find((c) => c.year === currentYear && c.month === 1);
    const latestPrice = daily[daily.length - 1].price;
    const ytd = yearOpenCandle
      ? {
          yearOpenPrice:  yearOpenCandle.open,
          currentPrice:   latestPrice,
          ytdReturnPct:   calculateYTDReturn(yearOpenCandle.open, latestPrice),
        }
      : null;

    const currentCyclePhase = getCyclePhase(currentYear);
    const nextCyclePhase    = getCyclePhase(currentYear + 1);

    const cyclePhaseMap = buildCyclePhaseMap(years[0] ?? currentYear, currentYear + 4);

    return NextResponse.json({
      asset,
      currentYear,
      currentMonth,
      currentCyclePhase,
      nextCyclePhase,
      years,
      monthNames: MONTH_NAMES,
      heatmap,
      monthSummaries,
      ytd,
      cyclePhaseMap,
      latestPrice,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to build seasonality calendar' },
      { status: 502 }
    );
  }
}
