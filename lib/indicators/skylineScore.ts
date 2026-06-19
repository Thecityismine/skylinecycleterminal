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
  weight: number;      // 10 per indicator (10 indicators × 10% = 100%)
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
  mvrvRatio?:       number | null;
  stablecoinSupply?: number | null;   // USD total from DeFiLlama
  hashratePoints?:  Array<{ timestamp: number; avgHashrate: number }> | null;
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
    signal: 'Neutral', source, weight: 10, available: false,
  };
}

// ─── Indicator 1: Pi Cycle Top ───────────────────────────────────────────────
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
    weight: 10, available: true,
  };
}

// ─── Indicator 2: MVRV Ratio ─────────────────────────────────────────────────
// Real from CryptoQuant when available; proxy (price/200DMA) as fallback.

function mvrvIndicator(prices: number[], realMVRV: number | null): IndicatorResult {
  if (realMVRV != null && realMVRV > 0) {
    const score = normalize(realMVRV, 0.5, 5.0);
    return {
      name: 'MVRV Ratio', score, rawValue: realMVRV,
      rawLabel: `${realMVRV.toFixed(2)}×`,
      signal: signalLabel(score), source: 'CryptoQuant',
      weight: 10, available: true,
    };
  }

  // Proxy: price / 200DMA (free-tier fallback)
  const ma200   = simpleMA(prices, 200);
  const current = prices[prices.length - 1];
  if (ma200 == null || current == null) return unavailable('MVRV Ratio', 'CoinMetrics (calc)');

  const ratio = current / ma200;
  const score = normalize(ratio, 0.5, 4.0);

  return {
    name: 'MVRV Ratio', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(2)}× 200DMA (proxy)`,
    signal: signalLabel(score), source: 'CoinMetrics (calc)',
    weight: 10, available: true,
  };
}

// ─── Indicator 3: Puell Multiple ─────────────────────────────────────────────
// Daily miner revenue / 365d MA — using IssTotNtv × price (free-tier approximation)

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
// Price / 730d MA — accumulate below 1×, distribute above 5×

function twoYearMAIndicator(prices: number[]): IndicatorResult {
  const ma730   = simpleMA(prices, 730);
  const current = prices[prices.length - 1];
  if (ma730 == null || current == null) return unavailable('2Y MA Multiplier', 'CoinMetrics (calc)');

  const multiplier = current / ma730;
  const score = normalize(multiplier, 0.8, 5.0);

  return {
    name: '2Y MA Multiplier', score, rawValue: multiplier,
    rawLabel: `${multiplier.toFixed(2)}× ($${Math.round(ma730).toLocaleString()})`,
    signal: signalLabel(score), source: 'CoinMetrics (calc)',
    weight: 10, available: true,
  };
}

// ─── Indicator 5: Log Regression (Bitcoin Power Law) ─────────────────────────
// log10(price) = 5.8 × log10(daysSinceGenesis) − 17.3

function logRegressionIndicator(currentPrice: number): IndicatorResult {
  const genesis = new Date('2009-01-03').getTime();
  const days    = (Date.now() - genesis) / 86_400_000;
  const fair    = Math.pow(10, 5.8 * Math.log10(days) - 17.3);
  const ratio   = currentPrice / fair;
  const score   = normalize(ratio, 0.4, 3.0);

  return {
    name: 'Log Regression', score, rawValue: ratio,
    rawLabel: `${ratio.toFixed(2)}× ($${Math.round(fair).toLocaleString()} fair value)`,
    signal: signalLabel(score), source: 'Power Law (calc)',
    weight: 10, available: true,
  };
}

// ─── Indicator 6: NVT Signal ─────────────────────────────────────────────────
// Market Cap / 90d MA of TxCnt — network value vs. actual usage

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

function fearGreedIndicator(value: number): IndicatorResult {
  return {
    name: 'Fear & Greed', score: value, rawValue: value,
    rawLabel: `${value} / 100`,
    signal: signalLabel(value), source: 'Alternative.me',
    weight: 10, available: true,
  };
}

// ─── Indicator 8: Active Addresses Trend ─────────────────────────────────────
// 30d MA / 365d MA — growing network participation is bullish

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
// High stablecoin % of BTC MC = lots of dry powder on sidelines = early/mid cycle
// Low stablecoin % = all capital deployed = late cycle risk

function stablecoinIndicator(stablecoinUSD: number | null, btcMarketCap: number | null): IndicatorResult {
  if (!stablecoinUSD || !btcMarketCap || btcMarketCap === 0) {
    return unavailable('Stablecoin Supply', 'DeFiLlama');
  }

  const ratio = stablecoinUSD / btcMarketCap;
  // ratio ~0.35 = lots of dry powder (bear/early bull) → score 0 (accumulate)
  // ratio ~0.08 = all deployed (bull peak) → score 100 (distribute)
  const score = clamp(100 - normalize(ratio, 0.08, 0.35), 0, 100);

  return {
    name: 'Stablecoin Supply', score, rawValue: ratio,
    rawLabel: `$${(stablecoinUSD / 1e9).toFixed(0)}B (${(ratio * 100).toFixed(1)}% of BTC MC)`,
    signal: signalLabel(score), source: 'DeFiLlama',
    weight: 10, available: true,
  };
}

// ─── Indicator 10: Hash Rate Ribbon ──────────────────────────────────────────
// 60d MA / 365d MA of BTC hash rate
// Ribbon < 1 = miner capitulation = historically excellent accumulation signal
// Ribbon > 1.2 = hash rate expanding = miners bullish, confident

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
  // ribbon 0.85 (capitulation → strong buy) → score 0
  // ribbon 1.4  (expanded expansion)        → score 100
  const score = normalize(ribbon, 0.85, 1.4);

  return {
    name: 'Hash Rate Ribbon', score, rawValue: ribbon,
    rawLabel: `${ribbon.toFixed(3)} (60d / 365d MA)`,
    signal: signalLabel(score), source: 'Mempool.space',
    weight: 10, available: true,
  };
}

// ─── Composite score ──────────────────────────────────────────────────────────

export function computeSkylineScore(
  onChain: OnChainPoint[],
  fearGreedValue: number,
  extra: ExtraData = {}
): CycleScoreResult {
  const prices    = onChain.filter((d) => d.price     != null).map((d) => d.price!);
  const adrVals   = onChain.filter((d) => d.adrActCnt != null).map((d) => d.adrActCnt!);
  const btcMC     = onChain.filter((d) => d.marketCap != null).at(-1)?.marketCap ?? null;
  const curPrice  = prices[prices.length - 1] ?? 0;

  const indicators: IndicatorResult[] = [
    piCycleIndicator(prices),
    mvrvIndicator(prices, extra.mvrvRatio ?? null),
    puellIndicator(onChain),
    twoYearMAIndicator(prices),
    logRegressionIndicator(curPrice),
    nvtIndicator(onChain.map((d) => ({ marketCap: d.marketCap, txCnt: d.txCnt }))),
    fearGreedIndicator(fearGreedValue),
    activeAddressesIndicator(adrVals),
    stablecoinIndicator(extra.stablecoinSupply ?? null, btcMC),
    hashRateRibbonIndicator(extra.hashratePoints ?? null),
  ];

  // Equal-weight average over only available indicators
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
