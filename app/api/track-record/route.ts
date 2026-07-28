import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice } from '@/lib/api/coinmetrics';
import { computeHistoricalScore, downsampleWeekly } from '@/lib/indicators/historicalScore';
import { buildTrackRecord, cycleTurns } from '@/lib/indicators/trackRecord';

export const revalidate = 3600;

// Pinned deliberately: a percentile is always relative to a reference set, so
// the start date is a stated part of the methodology rather than an incidental
// default. Measured sensitivity is low — moving it to 2010 shifts the five
// anchor readings by at most 3 points and changes no zones.
const HISTORY_START = '2012-01-01';

export async function GET() {
  try {
    const prices = await fetchBTCDailyPrice(HISTORY_START);

    // Point-in-time, undownsampled: a turning point has to be read on its actual
    // date, not on whichever weekly sample happens to land nearby.
    const daily  = computeHistoricalScore(prices, { mode: 'point-in-time', downsample: false });
    const record = buildTrackRecord(daily);

    const turnDates = cycleTurns().map((t) => t.date);

    return NextResponse.json({
      ...record,
      series:       downsampleWeekly(daily, turnDates),
      mode:         'point-in-time',
      historyStart: HISTORY_START,
    });
  } catch (err) {
    console.error('[/api/track-record]', err);
    return NextResponse.json({ error: 'Failed to compute track record' }, { status: 500 });
  }
}
