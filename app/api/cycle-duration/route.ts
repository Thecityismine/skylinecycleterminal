import { NextResponse } from 'next/server';
import { fetchBTCDailyPrice, fetchOnChainMetrics, fetchCurrentLTHData } from '@/lib/api/coinmetrics';
import { fetchFearGreed } from '@/lib/api/feargreed';
import { fetchMVRV } from '@/lib/api/cryptoquant';
import { fetchStablecoinSupply } from '@/lib/api/defillama';
import { fetchHashrate } from '@/lib/api/mempool';
import { computeSkylineScore, buildHistoricalContext } from '@/lib/indicators/skylineScore';
import { buildCycleWindows, phaseFromDaysSinceLow, daysBetween, fmtDate } from '@/lib/cycles/durationModel';
import { buildValidationRows, averageAbsErrorFraction } from '@/lib/cycles/timingValidation';
import { buildConfirmationSignals } from '@/lib/cycles/confirmationSignals';
import { computeTimingConfidence } from '@/lib/cycles/confidenceScore';

export const revalidate = 3600;

export async function GET() {
  try {
    const [rawPrices, onChain, fg, mvrvData, stablecoin, hashrate, lthData, fullPrices] = await Promise.all([
      fetchBTCDailyPrice('2015-01-01'),
      fetchOnChainMetrics('2022-01-01'),
      fetchFearGreed(),
      fetchMVRV(),
      fetchStablecoinSupply(),
      fetchHashrate(),
      fetchCurrentLTHData(),
      fetchBTCDailyPrice('2012-01-01'),
    ]);

    const prices = rawPrices.map((p) => ({
      time: p.time,
      ts: new Date(p.time + 'T00:00:00Z').getTime(),
      price: p.price,
    }));

    const ctx = buildHistoricalContext(fullPrices);
    const skyline = computeSkylineScore(
      onChain,
      fg.value,
      {
        mvrvRatio: mvrvData?.mvrv ?? null,
        stablecoinSupply: stablecoin?.totalCirculating ?? null,
        hashratePoints: hashrate?.points ?? null,
        splyCur: lthData?.splyCur ?? null,
        splyAct1yr: lthData?.splyAct1yr ?? null,
      },
      ctx,
    );

    const cycles = buildCycleWindows();
    const validationRows = buildValidationRows(cycles);
    const avgError = averageAbsErrorFraction(validationRows);

    const current = cycles.find((c) => c.status === 'in-progress')!;
    const today = new Date().toISOString().slice(0, 10);
    const daysSinceLow = daysBetween(current.lowDate, today);
    const phase = phaseFromDaysSinceLow(daysSinceLow);

    const confirmation = buildConfirmationSignals(rawPrices, skyline);

    const ma20 = findConfirmationDetail(confirmation, '20w-reclaim');
    const ma200 = findConfirmationDetail(confirmation, '200w-ma');
    const priceStructureScore =
      (ma20?.status === 'confirming' ? 50 : 0) + (ma200?.status === 'confirming' ? 50 : 0);

    const confidence = computeTimingConfidence({
      avgAbsErrorFraction: avgError,
      confirmingCount: confirmation.confirmingCount,
      totalSignals: confirmation.total,
      skylineScore: skyline.score,
      phase,
      priceStructureScore,
    });

    return NextResponse.json({
      prices,
      currentPrice: prices.at(-1)?.price ?? null,
      cycles,
      validationRows,
      current: {
        cycleId: current.id,
        lowDate: current.lowDate,
        lowDateFmt: fmtDate(current.lowDate),
        lowPrice: current.lowPrice,
        daysSinceLow,
        phase,
        projectedHighDate: current.projectedHighDate,
        projectedHighDateFmt: fmtDate(current.projectedHighDate),
        projectedLowDate: current.projectedLowDate,
        projectedLowDateFmt: fmtDate(current.projectedLowDate),
      },
      skyline: {
        score: skyline.score,
        zone: skyline.zone,
        zoneLabel: skyline.zoneLabel,
        zoneColor: skyline.zoneColor,
      },
      confirmation,
      confidence,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/cycle-duration]', err);
    return NextResponse.json({ error: 'Failed to load cycle duration data' }, { status: 500 });
  }
}

function findConfirmationDetail(
  confirmation: ReturnType<typeof buildConfirmationSignals>,
  key: string,
) {
  return confirmation.signals.find((s) => s.key === key);
}
