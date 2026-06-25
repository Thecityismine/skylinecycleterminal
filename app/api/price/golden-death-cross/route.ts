import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import {
  buildChartPoints,
  toWeeklyCloses,
  detectCrosses,
  addReturns,
  detectRegime,
  maSlope,
  trendConfidenceScore,
  calculateSMA,
} from '@/lib/indicators/goldenDeathCross';

export const revalidate = 3600;

export async function GET() {
  try {
    // Fetch full history for accurate 200D / 40W SMAs
    const raw = await fetchBTCDailyPrice('2012-01-01');
    const daily = raw
      .filter((p) => p.price > 0)
      .map((p) => ({
        time:  p.time,
        ts:    new Date(p.time + 'T00:00:00Z').getTime(),
        price: p.price,
      }));

    // â”€â”€ Daily 50D / 200D â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const dailyPoints = buildChartPoints(daily, 50, 200);

    // Cross detection on full history
    const rawCrosses   = detectCrosses(dailyPoints);
    const crossEvents  = addReturns(rawCrosses, daily);

    // Chart data: last 4 years of daily points (enough for context)
    const cutoff4y = Date.now() - 4 * 365 * 86400_000;
    const chartDaily = dailyPoints.filter((p) => p.ts >= cutoff4y);

    // â”€â”€ Weekly 10W / 40W â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const weekly      = toWeeklyCloses(daily);
    const weeklyPrices = weekly.map((w) => w.close);
    const wma10        = calculateSMA(weeklyPrices, 10);
    const wma40        = calculateSMA(weeklyPrices, 40);

    const weeklyPoints = weekly.map((w, i) => {
      const m10  = wma10[i];
      const m40  = wma40[i];
      const spread = m10 !== null && m40 !== null && m40 !== 0
        ? +((m10 - m40) / m40 * 100).toFixed(3)
        : null;
      return { time: w.time, ts: w.ts, price: w.close, ma50: m10, ma200: m40, spread };
    });

    // Weekly crosses
    const weeklyRaw    = detectCrosses(weeklyPoints);
    const weeklyCrosses = addReturns(weeklyRaw, weekly.map((w) => ({ ts: w.ts, price: w.close })));

    // Chart data: last 4 years weekly
    const chartWeekly = weeklyPoints.filter((p) => p.ts >= cutoff4y);

    // â”€â”€ Current metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const last = dailyPoints[dailyPoints.length - 1];
    const ma50  = last?.ma50  ?? null;
    const ma200 = last?.ma200 ?? null;
    const price = last?.price ?? 0;

    const idx = dailyPoints.length - 1;
    const ma50vals  = dailyPoints.map((p) => p.ma50);
    const ma200vals = dailyPoints.map((p) => p.ma200);
    const slope50   = maSlope(ma50vals,  idx, 30);
    const slope200  = maSlope(ma200vals, idx, 30);
    const spread    = last?.spread ?? null;

    // 90-day price momentum
    const d90 = Date.now() - 90 * 86400_000;
    const p90 = daily.find((p) => p.ts >= d90);
    const return90d = p90 ? +((price - p90.price) / p90.price * 100).toFixed(1) : null;

    // Regime
    const latestCross = crossEvents.length > 0 ? crossEvents[crossEvents.length - 1] : undefined;
    const regime      = detectRegime(latestCross, ma50, ma200, Date.now());

    // Confidence
    const confidence = ma50 && ma200
      ? trendConfidenceScore({ price, ma50, ma200, slope50, slope200, spread: spread ?? 0, return90d })
      : 50;

    // â”€â”€ Response â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return NextResponse.json({
      current: {
        price,
        ma50:       ma50   !== null ? +ma50.toFixed(0)   : null,
        ma200:      ma200  !== null ? +ma200.toFixed(0)  : null,
        spread:     spread !== null ? +spread.toFixed(2) : null,
        slope50,
        slope200,
        regime,
        confidence,
        daysSinceLastCross: latestCross
          ? Math.floor((Date.now() - latestCross.ts) / 86400_000)
          : null,
        lastCrossType: latestCross?.type ?? null,
        lastCrossDate: latestCross?.time ?? null,
        return90d,
        priceVsMa50:  ma50  ? +((price - ma50)  / ma50  * 100).toFixed(1) : null,
        priceVsMa200: ma200 ? +((price - ma200) / ma200 * 100).toFixed(1) : null,
      },
      chartDaily,
      chartWeekly,
      crossEvents,
      weeklyCrosses,
    });
  } catch (err) {
    console.error('[/api/price/golden-death-cross]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
