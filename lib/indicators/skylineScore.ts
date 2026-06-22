import type { OnChainPoint, PricePoint } from '@/lib/api/coinmetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoreZone = 'accumulate' | 'build' | 'caution' | 'distribution';

export type IndicatorResult = {
  name: string;
  score: number;       // 0–100
  rawValue: number;
  rawLabel: string;
  signal: string;
  source: string;
  weight: number;
  available: boolean;
};

export type CycleScoreResult = {
  score: number;
  zone: ScoreZone;
  zoneLabel: string;
  zoneColor: string;
  indicators: IndicatorResult[];
  computedAt: string;
};

export type ExtraData = {
  mvrvRatio?:        number | null;
  stablecoinSupply?: number | null;
  hashratePoints?:   Array<{ timestamp: number; avgHashrate: number }> | null;
  splyCur?:          number | null;
  splyAct1yr?:       number | null;
};

// Pre-computed historical series for self-calibrating percentile normalization.
// Built once per day from full price history (2012–present) and passed into
// computeSkylineScore so every price-multiple indicator knows its own distribution.
export type HistoricalContext = {
  piCycleSeries:    number[];   // 111DMA / (2 × 350DMA) for every valid day
  mvrvProxySeries:  number[];   // price / 200DMA for every valid day
  twoYMASeries:     number[];   // price / 730DMA for every valid day
  powerLawSeries:   number[];   // price / powerLawFair for every valid day
};

// ─── Zone config ─────────────────────────────────────────────────────────────

export const ZONE_CONFIG: Record<ScoreZone, { label: string; color: string }> = {
  accumulate:   { label: 'Accumulate',       color: '#3B82F6' },
  build:        { label: 'Hold / Build',      color: '#35D07F' },
  caution:      { label: 'Caution',           color: '#E6B450' },
  distribution: { label: 'Distribution Risk', color: '#FF5C5C' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function normalize(v: number, lo: number, hi: number): number {
  return clamp(((v - lo) / (hi - lo)) * 100, 0, 100);
}

// Full-array SMA — returns null until period is satisfied
function smaArr(values: number[], period: number): (number | null)[] {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= period) sum -= values[i - period];
    return i >= period - 1 ? sum / period : null;
  });
}

function simpleMA(arr: number[], period: number): number | null {
  if (arr.length < period) return null;
  const slice = arr.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

// Percentile: where does `current` sit within `history`? Returns 0–100.
// This is the core of self-calibration — no fixed ranges, no manual tuning.
// As Bitcoin's multiples compress each cycle, the distribution shifts with them.
function percentileScore(current: number, history: number[]): number {
  if (history.length < 30) return 50; // not enough history yet
  const below = history.filter((v) => v <= current).length;
  return Math.round((below / history.length) * 100);
}

function signalLabel(score: number): string {
  if (score < 20) return 'Strong Buy';
  if (score < 38) return 'Buy';
  if (score < 62) return 'Neutral';
  if (score < 80) return 'Caution';
  return 'Sell';
}

function zoneFromScore(score: number): ScoreZone {
  if (score < 25) return 'accumulate';
  if (score < 50) return 'build';
  if (score < 75) return 'caution';
  return 'distribution';
}

function unavailable(name: string, source: string): IndicatorResult {
  return {
    name, score: 50, rawValue: 0, rawLabel: 'Insufficient data',
    signal: 'Neutral', source, weight: 10, available: false,
  };
}

const GENESIS_MS = new Date('2009-01-03').getTime();

function powerLawAtDate(dateStr: string): number {
  const days = (new Date(dateStr + 'T00:00:00').getTime() - GENESIS_MS) / 86_400_000;
  return Math.pow(10, 5.8 * Math.log10(Math.max(days, 1)) - 17.3);
}

// ─── Build calibration context (called once per day from the API route) ───────

// Takes the full BTC daily price history (2012–present) and pre-computes the
// distribution of each price-multiple indicator. These distributions are then
// used to score the current reading as a percentile — fully self-calibrating.
export function buildHistoricalContext(fullPrices: PricePoint[]): HistoricalContext {
  const prices = fullPrices.map((p) => p.price);
  const ma111  = smaArr(prices, 111);
  const ma200  = smaArr(prices, 200);
  const ma350  = smaArr(prices, 350);
  const ma730  = smaArr(prices, 730);

  const piCycleSeries:   number[] = [];
  const mvrvProxySeries: number[] = [];
  const twoYMASeries:    number[] = [];
  const powerLawSeries:  number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const p = prices[i];
    const a111 = ma111[i], a200 = ma200[i], a350 = ma350[i], a730 = ma730[i];

    if (a111 != null && a350 != null && a350 > 0)
      piCycleSeries.push(a111 / (2 * a350));

    if (a200 != null && a200 > 0)
      mvrvProxySeries.push(p / a200);

    if (a730 != null && a730 > 0)
      twoYMASeries.push(p / a730);

    const fair = powerLawAtDate(fullPrices[i].time);
    if (fair > 0 && p > 0)
      powerLawSeries.push(p / fair);
  }

  return { piCycleSeries, mvrvProxySeries, twoYMASeries, powerLawSeries };
}

// ─── Indicator 1: Pi Cycle Top ────────────────────────────────────────────────
// 111DMA / (2 × 350DMA). Approaches 1.0 at historical cycle tops.
// Percentile-scored: where does this ratio sit within all of BTC history?

function piCycleIndicator(prices: number[], ctx?: HistoricalContext): IndicatorResult {
  const ma111 = simpleMA(prices, 111);
  const ma350 = simpleMA(prices, 350);
  if (ma111 == null || ma350 == null) return unavailable('Pi Cycle Top', 'CoinMetrics (calc)');

  const ratio = ma111 / (2 * ma350);
  const score = ctx?.piCycleSeries.length
    ? percentileScore(ratio, ctx.piCycleSeries)
    : normalize(ratio, 0.3, 1.0);

  return {
    name: 'Pi Cycle Top', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(3)} (111DMA / 2×350DMA)`,
    signal: signalLabel(score), source: 'CoinMetrics (calc)',
    weight: 10, available: true,
  };
}

// ─── Indicator 2: MVRV Ratio ─────────────────────────────────────────────────
// Real MVRV from CryptoQuant when available (fixed range is fine — it's a
// standardized on-chain ratio not affected by diminishing price returns).
// Proxy (price/200DMA) uses percentile to self-calibrate.

function mvrvIndicator(prices: number[], realMVRV: number | null, ctx?: HistoricalContext): IndicatorResult {
  if (realMVRV != null && realMVRV > 0) {
    const score = normalize(realMVRV, 0.5, 5.0);
    return {
      name: 'MVRV Ratio', score, rawValue: realMVRV,
      rawLabel: `${realMVRV.toFixed(2)}×`,
      signal: signalLabel(score), source: 'CryptoQuant',
      weight: 10, available: true,
    };
  }

  const ma200   = simpleMA(prices, 200);
  const current = prices[prices.length - 1];
  if (ma200 == null || current == null) return unavailable('MVRV Ratio', 'CoinMetrics (calc)');

  const ratio = current / ma200;
  const score = ctx?.mvrvProxySeries.length
    ? percentileScore(ratio, ctx.mvrvProxySeries)
    : normalize(ratio, 0.5, 4.0);

  return {
    name: 'MVRV Ratio', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(2)}× 200DMA (proxy)`,
    signal: signalLabel(score), source: 'CoinMetrics (calc)',
    weight: 10, available: true,
  };
}

// ─── Indicator 3: Puell Multiple ─────────────────────────────────────────────
// Miner revenue / 365d MA. Already a ratio-of-ratios — self-calibrating.

function puellIndicator(data: Array<{ price: number | null; issTotNtv: number | null }>): IndicatorResult {
  const issTotUSD = data
    .filter((d): d is { price: number; issTotNtv: number } => d.price != null && d.issTotNtv != null)
    .map((d) => d.issTotNtv * d.price);

  const ma365   = simpleMA(issTotUSD, 365);
  const current = issTotUSD[issTotUSD.length - 1];
  if (ma365 == null || current == null || ma365 === 0) return unavailable('Puell Multiple', 'CoinMetrics');

  const puell = current / ma365;
  const score = normalize(puell, 0.3, 4.0);

  return {
    name: 'Puell Multiple', score, rawValue: puell,
    rawLabel: `${puell.toFixed(2)}×`,
    signal: signalLabel(score), source: 'CoinMetrics',
    weight: 10, available: true,
  };
}

// ─── Indicator 4: 2Y MA Multiplier ───────────────────────────────────────────
// Price / 730d MA. Percentile-scored so diminishing cycle multiples don't
// permanently under-read as the market matures.

function twoYearMAIndicator(prices: number[], ctx?: HistoricalContext): IndicatorResult {
  const ma730   = simpleMA(prices, 730);
  const current = prices[prices.length - 1];
  if (ma730 == null || current == null) return unavailable('2Y MA Multiplier', 'CoinMetrics (calc)');

  const multiplier = current / ma730;
  const score = ctx?.twoYMASeries.length
    ? percentileScore(multiplier, ctx.twoYMASeries)
    : normalize(multiplier, 0.8, 5.0);

  return {
    name: '2Y MA Multiplier', score, rawValue: multiplier,
    rawLabel: `${multiplier.toFixed(2)}× ($${Math.round(ma730).toLocaleString()})`,
    signal: signalLabel(score), source: 'CoinMetrics (calc)',
    weight: 10, available: true,
  };
}

// ─── Indicator 5: Log Regression (Bitcoin Power Law) ─────────────────────────
// price / powerLawFair. Percentile-scored so that the score reflects where
// the current deviation sits in the full historical distribution.

function logRegressionIndicator(currentPrice: number, ctx?: HistoricalContext): IndicatorResult {
  const days = (Date.now() - GENESIS_MS) / 86_400_000;
  const fair = Math.pow(10, 5.8 * Math.log10(days) - 17.3);
  const ratio = currentPrice / fair;
  const score = ctx?.powerLawSeries.length
    ? percentileScore(ratio, ctx.powerLawSeries)
    : normalize(ratio, 0.4, 3.0);

  return {
    name: 'Log Regression', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(2)}× ($${Math.round(fair).toLocaleString()} fair value)`,
    signal: signalLabel(score), source: 'Power Law (calc)',
    weight: 10, available: true,
  };
}

// ─── Indicator 6: NVT Signal ─────────────────────────────────────────────────
// Market Cap / 90d MA of TxCnt.

function nvtIndicator(data: Array<{ marketCap: number | null; txCnt: number | null }>): IndicatorResult {
  const valid = data.filter(
    (d): d is { marketCap: number; txCnt: number } => d.marketCap != null && d.txCnt != null && d.txCnt > 0
  );
  if (valid.length < 90) return unavailable('NVT Signal', 'CoinMetrics');

  const txCounts = valid.map((d) => d.txCnt);
  const ma90 = simpleMA(txCounts, Math.min(90, txCounts.length));
  if (ma90 == null || ma90 === 0) return unavailable('NVT Signal', 'CoinMetrics');

  const nvt   = valid[valid.length - 1].marketCap / ma90;
  const score = normalize(nvt, 3_000_000, 30_000_000);

  return {
    name: 'NVT Signal', score, rawValue: nvt,
    rawLabel: `${(nvt / 1_000_000).toFixed(1)}M (MC/TxCnt)`,
    signal: signalLabel(score), source: 'CoinMetrics',
    weight: 10, available: true,
  };
}

// ─── Indicator 7: Fear & Greed ────────────────────────────────────────────────
// Already 0–100, inherently self-calibrating.

function fearGreedIndicator(value: number): IndicatorResult {
  return {
    name: 'Fear & Greed', score: value, rawValue: value,
    rawLabel: `${value} / 100`,
    signal: signalLabel(value), source: 'Alternative.me',
    weight: 10, available: true,
  };
}

// ─── Indicator 8: Active Addresses Trend ─────────────────────────────────────
// 30d MA / 365d MA. Ratio-of-ratios — self-calibrating.

function activeAddressesIndicator(adrActCnt: number[]): IndicatorResult {
  const ma30  = simpleMA(adrActCnt, 30);
  const ma365 = simpleMA(adrActCnt, 365);
  if (ma30 == null || ma365 == null || ma365 === 0) return unavailable('Active Addresses', 'CoinMetrics');

  const ratio = ma30 / ma365;
  const score = normalize(ratio, 0.6, 1.4);

  return {
    name: 'Active Addresses', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(2)}× (30d / 365d MA)`,
    signal: signalLabel(score), source: 'CoinMetrics',
    weight: 10, available: true,
  };
}

// ─── Indicator 9: Stablecoin Supply vs BTC Market Cap ────────────────────────
// Ratio-based — self-calibrating.

function stablecoinIndicator(stablecoinUSD: number | null, btcMarketCap: number | null): IndicatorResult {
  if (!stablecoinUSD || !btcMarketCap || btcMarketCap === 0) {
    return unavailable('Stablecoin Supply', 'DeFiLlama');
  }

  const ratio = stablecoinUSD / btcMarketCap;
  const score = clamp(100 - normalize(ratio, 0.08, 0.35), 0, 100);

  return {
    name: 'Stablecoin Supply', score, rawValue: ratio,
    rawLabel: `$${(stablecoinUSD / 1e9).toFixed(0)}B (${(ratio * 100).toFixed(1)}% of BTC MC)`,
    signal: signalLabel(score), source: 'DeFiLlama',
    weight: 10, available: true,
  };
}

// ─── Indicator 10: Hash Rate Ribbon ──────────────────────────────────────────
// 60d MA / 365d MA. Ratio-of-ratios — self-calibrating.

function hashRateRibbonIndicator(
  points: Array<{ timestamp: number; avgHashrate: number }> | null
): IndicatorResult {
  if (!points || points.length < 365) return unavailable('Hash Rate Ribbon', 'Mempool.space');

  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const rates  = sorted.map((p) => p.avgHashrate);

  const ma60  = simpleMA(rates, 60);
  const ma365 = simpleMA(rates, 365);
  if (ma60 == null || ma365 == null || ma365 === 0) return unavailable('Hash Rate Ribbon', 'Mempool.space');

  const ribbon = ma60 / ma365;
  const score  = normalize(ribbon, 0.85, 1.4);

  return {
    name: 'Hash Rate Ribbon', score, rawValue: ribbon,
    rawLabel: `${ribbon.toFixed(3)} (60d / 365d MA)`,
    signal: signalLabel(score), source: 'Mempool.space',
    weight: 10, available: true,
  };
}

// ─── Indicator 11: Reserve Risk ───────────────────────────────────────────────
// Price component uses MVRV proxy percentile so it self-calibrates with the
// market. Supply activity component (activeRatio) retains a fixed range —
// that ratio doesn't exhibit the same cycle-to-cycle compression.

function reserveRiskIndicator(
  prices:     number[],
  splyCur:    number | null,
  splyAct1yr: number | null,
  ctx?:       HistoricalContext,
): IndicatorResult {
  if (splyCur == null || splyAct1yr == null || splyCur === 0) {
    return unavailable('Reserve Risk', 'CoinMetrics');
  }

  const ma200        = simpleMA(prices, 200);
  const currentPrice = prices[prices.length - 1];
  if (ma200 == null || currentPrice == null || ma200 === 0) {
    return unavailable('Reserve Risk', 'CoinMetrics');
  }

  const dormantRatio = (splyCur - splyAct1yr) / splyCur;
  const activeRatio  = 1 - dormantRatio;
  const priceMult    = currentPrice / ma200;

  let score: number;
  if (ctx?.mvrvProxySeries.length) {
    // Price component: percentile-scored (self-calibrating)
    const priceScore  = percentileScore(priceMult, ctx.mvrvProxySeries);
    // Supply activity: fixed range (0.12 dormant-heavy → 0.38 active-heavy)
    const activeScore = normalize(activeRatio, 0.12, 0.38);
    score = Math.round(priceScore * 0.65 + activeScore * 0.35);
  } else {
    const rrProxy = activeRatio * priceMult;
    score = normalize(rrProxy, 0.30, 1.80);
  }

  return {
    name:      'Reserve Risk',
    score,
    rawValue:  dormantRatio,
    rawLabel:  `${(dormantRatio * 100).toFixed(1)}% supply dormant >1yr`,
    signal:    signalLabel(score),
    source:    'CoinMetrics',
    weight:    10,
    available: true,
  };
}

// ─── Composite score ──────────────────────────────────────────────────────────

export function computeSkylineScore(
  onChain: OnChainPoint[],
  fearGreedValue: number,
  extra: ExtraData = {},
  ctx?: HistoricalContext,
): CycleScoreResult {
  const prices   = onChain.filter((d) => d.price     != null).map((d) => d.price!);
  const adrVals  = onChain.filter((d) => d.adrActCnt != null).map((d) => d.adrActCnt!);
  const btcMC    = onChain.filter((d) => d.marketCap != null).at(-1)?.marketCap ?? null;
  const curPrice = prices[prices.length - 1] ?? 0;

  const indicators: IndicatorResult[] = [
    piCycleIndicator(prices, ctx),
    mvrvIndicator(prices, extra.mvrvRatio ?? null, ctx),
    puellIndicator(onChain),
    twoYearMAIndicator(prices, ctx),
    logRegressionIndicator(curPrice, ctx),
    nvtIndicator(onChain.map((d) => ({ marketCap: d.marketCap, txCnt: d.txCnt }))),
    fearGreedIndicator(fearGreedValue),
    activeAddressesIndicator(adrVals),
    stablecoinIndicator(extra.stablecoinSupply ?? null, btcMC),
    hashRateRibbonIndicator(extra.hashratePoints ?? null),
    reserveRiskIndicator(prices, extra.splyCur ?? null, extra.splyAct1yr ?? null, ctx),
  ];

  const avail       = indicators.filter((i) => i.available);
  const totalWeight = avail.reduce((s, i) => s + i.weight, 0);
  const weighted    = avail.reduce((s, i) => s + i.score * i.weight, 0);
  const score       = Math.round(totalWeight > 0 ? weighted / totalWeight : 50);

  const zone     = zoneFromScore(score);
  const zoneInfo = ZONE_CONFIG[zone];

  return {
    score,
    zone,
    zoneLabel:  zoneInfo.label,
    zoneColor:  zoneInfo.color,
    indicators,
    computedAt: new Date().toISOString(),
  };
}
