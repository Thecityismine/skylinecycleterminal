import type { OnChainPoint } from '@/lib/api/coinmetrics';

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

// ─── Zone configuration ───────────────────────────────────────────────────────

export const ZONE_CONFIG: Record<ScoreZone, { label: string; color: string }> = {
  accumulate:   { label: 'Accumulate',       color: '#3B82F6' },
  build:        { label: 'Hold / Build',      color: '#35D07F' },
  caution:      { label: 'Caution',           color: '#E6B450' },
  distribution: { label: 'Distribution Risk', color: '#FF5C5C' },
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function normalize(v: number, lo: number, hi: number): number {
  return clamp(((v - lo) / (hi - lo)) * 100, 0, 100);
}

function simpleMA(arr: number[], period: number): number | null {
  if (arr.length < period) return null;
  const slice = arr.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
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
    signal: 'Neutral', source, weight: 12.5, available: false,
  };
}

// ─── Indicator 1: Pi Cycle Top ────────────────────────────────────────────────
// 111DMA / (2 × 350DMA) → approaches 1.0 at cycle tops

function piCycleIndicator(prices: number[]): IndicatorResult {
  const ma111 = simpleMA(prices, 111);
  const ma350 = simpleMA(prices, 350);
  if (ma111 == null || ma350 == null) return unavailable('Pi Cycle Top', 'CoinMetrics (calc)');

  const ratio = ma111 / (2 * ma350);
  const score = normalize(ratio, 0.3, 1.0);

  return {
    name: 'Pi Cycle Top', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(3)} (111DMA / 2×350DMA)`,
    signal: signalLabel(score), source: 'CoinMetrics (calc)',
    weight: 12.5, available: true,
  };
}

// ─── Indicator 2: MVRV Proxy ──────────────────────────────────────────────────
// MVRV Ratio requires CapRealUSD (not in free API).
// Proxy: price deviation above 200-day MA as a realized-value stand-in.
// When price >> 200DMA, coins are well above cost basis → higher MVRV proxy.

function mvrvProxyIndicator(prices: number[]): IndicatorResult {
  const ma200 = simpleMA(prices, 200);
  const current = prices[prices.length - 1];
  if (ma200 == null || current == null) return unavailable('MVRV (proxy)', 'CoinMetrics (calc)');

  const ratio = current / ma200;
  // Historical: 0.5 (deep bear) → 4.0 (cycle top)
  const score = normalize(ratio, 0.5, 4.0);

  return {
    name: 'MVRV (proxy)', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(2)}× 200DMA ($${Math.round(ma200).toLocaleString()})`,
    signal: signalLabel(score), source: 'CoinMetrics (calc)',
    weight: 12.5, available: true,
  };
}

// ─── Indicator 3: Puell Multiple ──────────────────────────────────────────────
// Daily miner revenue / 365d MA of daily miner revenue
// Using IssTotNtv × price to approximate IssTotUSD

function puellIndicator(data: Array<{ price: number | null; issTotNtv: number | null }>): IndicatorResult {
  // Compute approximate daily issuance in USD
  const issTotUSD = data
    .filter((d): d is { price: number; issTotNtv: number } => d.price != null && d.issTotNtv != null)
    .map((d) => d.issTotNtv * d.price);

  const ma365 = simpleMA(issTotUSD, 365);
  const current = issTotUSD[issTotUSD.length - 1];
  if (ma365 == null || current == null || ma365 === 0) return unavailable('Puell Multiple', 'CoinMetrics');

  const puell = current / ma365;
  // Historical: 0.3 (deep bear) → 4.0 (cycle top)
  const score = normalize(puell, 0.3, 4.0);

  return {
    name: 'Puell Multiple', score, rawValue: puell,
    rawLabel: `${puell.toFixed(2)}×`,
    signal: signalLabel(score), source: 'CoinMetrics',
    weight: 12.5, available: true,
  };
}

// ─── Indicator 4: 2Y MA Multiplier ───────────────────────────────────────────
// Price / 730d MA — accumulate below 1×, distribute above 5×

function twoYearMAIndicator(prices: number[]): IndicatorResult {
  const ma730 = simpleMA(prices, 730);
  const current = prices[prices.length - 1];
  if (ma730 == null || current == null) return unavailable('2Y MA Multiplier', 'CoinMetrics (calc)');

  const multiplier = current / ma730;
  const score = normalize(multiplier, 0.8, 5.0);

  return {
    name: '2Y MA Multiplier', score, rawValue: multiplier,
    rawLabel: `${multiplier.toFixed(2)}× ($${Math.round(ma730).toLocaleString()})`,
    signal: signalLabel(score), source: 'CoinMetrics (calc)',
    weight: 12.5, available: true,
  };
}

// ─── Indicator 5: Log Regression (Bitcoin Power Law) ─────────────────────────
// log10(price) = 5.8 × log10(daysSinceGenesis) − 17.3

function logRegressionIndicator(currentPrice: number): IndicatorResult {
  const genesis = new Date('2009-01-03').getTime();
  const daysSinceGenesis = (Date.now() - genesis) / 86_400_000;
  const fairValue = Math.pow(10, 5.8 * Math.log10(daysSinceGenesis) - 17.3);
  const ratio = currentPrice / fairValue;
  const score = normalize(ratio, 0.4, 3.0);

  return {
    name: 'Log Regression', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(2)}× ($${Math.round(fairValue).toLocaleString()} fair value)`,
    signal: signalLabel(score), source: 'Power Law (calc)',
    weight: 12.5, available: true,
  };
}

// ─── Indicator 6: NVT Signal (TxCnt approximation) ───────────────────────────
// Market Cap / 90d MA of daily transaction count — network value vs. usage

function nvtIndicator(data: Array<{ marketCap: number | null; txCnt: number | null }>): IndicatorResult {
  const valid = data.filter(
    (d): d is { marketCap: number; txCnt: number } => d.marketCap != null && d.txCnt != null && d.txCnt > 0
  );
  if (valid.length < 90) return unavailable('NVT Signal', 'CoinMetrics');

  const txCounts = valid.map((d) => d.txCnt);
  const ma90 = simpleMA(txCounts, Math.min(90, txCounts.length));
  if (ma90 == null || ma90 === 0) return unavailable('NVT Signal', 'CoinMetrics');

  const nvt = valid[valid.length - 1].marketCap / ma90;
  // NVT via TxCnt: ranges differ from volume-based NVT, calibrate empirically
  // Typical: <3M = undervalued, >30M = overvalued (marketCap / txCnt basis)
  const score = normalize(nvt, 3_000_000, 30_000_000);

  return {
    name: 'NVT Signal', score, rawValue: nvt,
    rawLabel: `${(nvt / 1_000_000).toFixed(1)}M (MC/TxCnt)`,
    signal: signalLabel(score), source: 'CoinMetrics',
    weight: 12.5, available: true,
  };
}

// ─── Indicator 7: Fear & Greed ────────────────────────────────────────────────

function fearGreedIndicator(value: number): IndicatorResult {
  return {
    name: 'Fear & Greed', score: value, rawValue: value,
    rawLabel: `${value} / 100`,
    signal: signalLabel(value), source: 'Alternative.me',
    weight: 12.5, available: true,
  };
}

// ─── Indicator 8: Active Addresses Trend ────────────────────────────────────
// 30d MA / 365d MA — growing network activity is bullish

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
    weight: 12.5, available: true,
  };
}

// ─── Composite score ─────────────────────────────────────────────────────────

export function computeSkylineScore(
  onChain: OnChainPoint[],
  fearGreedValue: number
): CycleScoreResult {
  const prices    = onChain.filter((d) => d.price    != null).map((d) => d.price!);
  const adrVals   = onChain.filter((d) => d.adrActCnt != null).map((d) => d.adrActCnt!);
  const currentPrice = prices[prices.length - 1] ?? 0;

  const indicators: IndicatorResult[] = [
    piCycleIndicator(prices),
    mvrvProxyIndicator(prices),
    puellIndicator(onChain),
    twoYearMAIndicator(prices),
    logRegressionIndicator(currentPrice),
    nvtIndicator(onChain.map((d) => ({ marketCap: d.marketCap, txCnt: d.txCnt }))),
    fearGreedIndicator(fearGreedValue),
    activeAddressesIndicator(adrVals),
  ];

  // Only weight available indicators to keep the composite meaningful
  const available   = indicators.filter((i) => i.available);
  const totalWeight = available.reduce((s, i) => s + i.weight, 0);
  const weighted    = available.reduce((s, i) => s + i.score * i.weight, 0);
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
