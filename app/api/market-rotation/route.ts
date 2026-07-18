import { NextResponse } from 'next/server';
import { fetchMarketRotationData } from '@/lib/api/marketRotation';
import { fetchMacroData } from '@/lib/api/fred';
import {
  calculateEMA,
  calculateRotationScore,
  getRegime,
  buildCycleTimeline,
  findHistoricalSimilarity,
} from '@/lib/indicators/marketRotation';
import {
  detectSwingPoints,
  detectCHOCH,
  buildTrendCloud,
  calculateMomentum,
  calculateWaveOscillator,
  calculateMacroOscillator,
} from '@/lib/indicators/rotationOverlays';
import { ROTATION_TABS } from '@/lib/rotation/tabConfig';

export const revalidate = 86400; // 24 hours — matches the underlying CoinGecko fetch cache

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resolution = searchParams.get('res') === 'daily' ? 'daily' : 'weekly';

    const [rotation, macro] = await Promise.all([
      fetchMarketRotationData(resolution),
      fetchMacroData().catch(() => null),
    ]);

    const macroOscillator = macro ? calculateMacroOscillator(macro.dxy.series, macro.m2Series) : [];

    const tabs = ROTATION_TABS.map((cfg) => {
      const series = rotation.points.map((p) => ({ time: p.time, ts: p.ts, value: cfg.getValue(p) }));
      const values = series.map((s) => s.value);

      const maByPeriod: Record<50 | 100 | 200, (number | null)[]> = {
        50:  calculateEMA(values, 50),
        100: calculateEMA(values, 100),
        200: calculateEMA(values, 200),
      };
      const activeMA = maByPeriod[cfg.defaultMA];

      const lastIdx = series.length - 1;
      const lookback = 12;
      const priorIdx = Math.max(0, lastIdx - lookback);

      const score = lastIdx >= 0
        ? calculateRotationScore({
            value:      values[lastIdx],
            ma:         activeMA[lastIdx],
            priorValue: values[priorIdx] ?? null,
            priorMA:    activeMA[priorIdx] ?? null,
          })
        : 50;

      const regime = getRegime(score, cfg.regimeTable);

      const needsSwings = cfg.overlays.includes('swing') || cfg.overlays.includes('choch');
      const swings = needsSwings ? detectSwingPoints(series) : [];
      const choch = cfg.overlays.includes('choch') ? detectCHOCH(swings) : [];
      const cloud = cfg.overlays.includes('cloud') ? buildTrendCloud(series) : [];
      const momentum = cfg.overlays.includes('momentum') ? calculateMomentum(series) : [];
      const wave = cfg.overlays.includes('wave') ? calculateWaveOscillator(series) : [];

      const timeline = buildCycleTimeline(series);
      const similarity = findHistoricalSimilarity(series);

      const points = series.map((s, i) => ({
        time:       s.time,
        ts:         s.ts,
        value:      s.value,
        ma50:       maByPeriod[50][i],
        ma100:      maByPeriod[100][i],
        ma200:      maByPeriod[200][i],
        cloudUpper: cloud[i]?.upper ?? null,
        cloudLower: cloud[i]?.lower ?? null,
        momentum:   momentum[i] ?? null,
        waveWt1:    wave[i]?.wt1 ?? null,
        waveWt2:    wave[i]?.wt2 ?? null,
      }));

      return {
        key:         cfg.key,
        points,
        score,
        regimeKey:   regime.key,
        regimeLabel: regime.label,
        regimeColor: regime.color,
        swings,
        choch,
        timeline,
        similarity,
      };
    });

    return NextResponse.json({
      asOf:              rotation.asOf,
      resolution,
      current:           rotation.current,
      largeCapCoinCount: rotation.largeCapCoinCount,
      macroOscillator,
      tabs,
    });
  } catch (err) {
    console.error('[/api/market-rotation]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
