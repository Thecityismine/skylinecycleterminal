import type { PricePoint } from '@/lib/api/coinmetrics';
import type { StablecoinHistoryPoint } from '@/lib/api/defillama';

// ~19.8M BTC in circulation — used to approximate total market cap from BTC price
const BTC_CIRCULATING = 19_800_000;

export type StablecoinDominancePoint = {
  time: string;
  ts: number;
  stablecoinMC: number;   // USD (raw)
  btcPrice: number;
  dominance: number;      // % of approx total crypto market cap
  ma30: number | null;
  ma90: number | null;
};

export type StablecoinRegime = {
  label: string;
  color: string;
  description: string;
};

export type StablecoinDominanceResult = {
  points: StablecoinDominancePoint[];
  current: {
    dominance: number | null;
    ma30: number | null;
    ma90: number | null;
    stablecoinMC: number | null;
    btcPrice: number | null;
    dom30dChange: number | null;
    supply30dChange: number | null;
    supply90dChange: number | null;
  };
  regime: StablecoinRegime;
  liquidityScore: number;
};

function movingAverage(vals: (number | null)[], window: number, idx: number): number | null {
  if (idx < window - 1) return null;
  const slice = vals.slice(idx - window + 1, idx + 1).filter((v): v is number => v != null);
  if (slice.length < Math.floor(window * 0.6)) return null;
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

function computeRegime(
  dominance: number | null,
  dom30dChange: number | null,
  supply30dChange: number | null,
): StablecoinRegime {
  if (dominance == null) {
    return { label: 'Unknown', color: '#8B949E', description: 'Insufficient data.' };
  }

  const rising  = dom30dChange != null && dom30dChange >  0.5;
  const falling = dom30dChange != null && dom30dChange < -0.5;
  const supplyGrowing = supply30dChange != null && supply30dChange > 2;

  if (falling && supplyGrowing) {
    return {
      label: 'Liquidity Expansion',
      color: '#35D07F',
      description:
        'Stablecoin supply growing while dominance falls. New capital entering crypto — historically the most constructive liquidity pattern.',
    };
  }
  if (falling) {
    return {
      label: 'Capital Rotating Into Crypto',
      color: '#A3E635',
      description:
        'Stablecoin dominance declining. Risk appetite improving and capital moving back into BTC and crypto assets.',
    };
  }
  if (rising && dominance > 10) {
    return {
      label: 'Defensive Rotation',
      color: '#F97316',
      description:
        'Dominance rising from elevated levels. Capital moving into dollar-like assets. Check BTC trend for confirmation.',
    };
  }
  if (rising) {
    return {
      label: 'Risk-Off Tendency',
      color: '#E6B450',
      description:
        'Stablecoin dominance rising. Can reflect market contraction or stablecoin supply expansion — context matters.',
    };
  }
  if (dominance < 6) {
    return {
      label: 'Risk-On / Low Stablecoin Share',
      color: '#35D07F',
      description:
        'Low stablecoin dominance. Historically associated with bull market expansion phases.',
    };
  }
  if (dominance > 14) {
    return {
      label: 'High Defensive Positioning',
      color: '#FF5C5C',
      description:
        'Elevated stablecoin dominance. Capital remains defensive relative to historical norms.',
    };
  }
  return {
    label: 'Liquidity Balanced',
    color: '#F2B84B',
    description:
      'Stablecoin dominance in neutral range. No strong directional signal — confirm with BTC trend and supply data.',
  };
}

function computeLiquidityScore(
  dom30dChange: number | null,
  dom90dChange: number | null,
  supply30dChangePct: number | null,
): number {
  // Rising dominance → bearish (low score); falling → bullish (high score)
  const dom30  = dom30dChange  != null ? Math.max(0, Math.min(100, 50 - dom30dChange  * 14)) : 50;
  const dom90  = dom90dChange  != null ? Math.max(0, Math.min(100, 50 - dom90dChange  * 8))  : 50;
  const supply = supply30dChangePct != null ? Math.max(0, Math.min(100, 50 + supply30dChangePct * 2)) : 50;
  return Math.round(dom30 * 0.40 + dom90 * 0.30 + supply * 0.30);
}

export function buildStablecoinDominancePoints(
  stablecoinHistory: StablecoinHistoryPoint[],
  btcPrices: PricePoint[],
  currentTotalMC: number,
  btcDominancePct: number,
): StablecoinDominanceResult {
  // Index BTC prices by date
  const btcMap = new Map(btcPrices.map((p) => [p.time, p.price]));

  // Approximation factor: total_mc ≈ btc_mc / btcDominanceFraction
  // btc_mc = btcPrice × BTC_CIRCULATING
  const btcDominanceFraction = btcDominancePct / 100;

  const rawPoints: StablecoinDominancePoint[] = [];

  for (const { time, ts, stablecoinMC } of stablecoinHistory) {
    const btcPrice = btcMap.get(time);
    if (!btcPrice || btcPrice <= 0) continue;

    // Approximate total crypto market cap using BTC price and dominance
    const approxTotalMC = (btcPrice * BTC_CIRCULATING) / btcDominanceFraction;
    const dominance = (stablecoinMC / approxTotalMC) * 100;

    rawPoints.push({ time, ts, stablecoinMC, btcPrice, dominance, ma30: null, ma90: null });
  }

  // Calibrate: scale so the most recent point matches the true current dominance
  // (stablecoin_mc_current / currentTotalMC × 100)
  if (rawPoints.length > 0) {
    const last = rawPoints[rawPoints.length - 1];
    const trueDominance = (last.stablecoinMC / currentTotalMC) * 100;
    const scaleFactor   = rawPoints.length > 1 ? trueDominance / (last.dominance || trueDominance) : 1;
    for (const p of rawPoints) {
      p.dominance = p.dominance * scaleFactor;
    }
  }

  // Compute rolling MAs
  const domVals = rawPoints.map((p) => p.dominance);
  const points  = rawPoints.map((p, i) => ({
    ...p,
    ma30: movingAverage(domVals, 30, i),
    ma90: movingAverage(domVals, 90, i),
  }));

  const last  = points[points.length - 1] ?? null;
  const p30   = points.length > 30 ? points[points.length - 31] : null;
  const p90   = points.length > 90 ? points[points.length - 91] : null;

  const dom30dChange   = last && p30   ? last.dominance   - p30.dominance   : null;
  const dom90dChange   = last && p90   ? last.dominance   - p90.dominance   : null;
  const supply30dChange = last && p30  ? ((last.stablecoinMC - p30.stablecoinMC) / p30.stablecoinMC) * 100 : null;
  const supply90dChange = last && p90  ? ((last.stablecoinMC - p90.stablecoinMC) / p90.stablecoinMC) * 100 : null;

  const regime         = computeRegime(last?.dominance ?? null, dom30dChange, supply30dChange);
  const liquidityScore = computeLiquidityScore(dom30dChange, dom90dChange, supply30dChange);

  return {
    points,
    current: {
      dominance:       last?.dominance       ?? null,
      ma30:            last?.ma30            ?? null,
      ma90:            last?.ma90            ?? null,
      stablecoinMC:    last?.stablecoinMC    ?? null,
      btcPrice:        last?.btcPrice        ?? null,
      dom30dChange,
      supply30dChange,
      supply90dChange,
    },
    regime,
    liquidityScore,
  };
}
