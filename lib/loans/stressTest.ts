import { collateralValue, ltv } from './ltv';
import { getLtvZone } from './riskScore';
import type { LtvZone } from './riskScore';

export type StressRow = {
  btcPrice:         number;
  collateralValue:  number;
  ltv:              number; // decimal
  zone:             LtvZone;
};

export function buildPriceStressRows(
  prices: number[],
  loanBalance: number,
  btcCollateral: number,
  zones: LtvZone[],
): StressRow[] {
  return prices
    .filter((p) => p > 0)
    .sort((a, b) => b - a)
    .map((btcPrice) => {
      const cv = collateralValue(btcCollateral, btcPrice);
      const ltvValue = ltv(loanBalance, cv);
      return { btcPrice, collateralValue: cv, ltv: ltvValue, zone: getLtvZone(ltvValue, zones) };
    });
}

// Evenly-spaced default price ladder spanning from the entry price down past
// the liquidation price, so the table always shows the full risk curve.
export function defaultStressPrices(entryPrice: number, liquidationPriceValue: number, steps = 7): number[] {
  if (entryPrice <= 0) return [];
  const floor = Math.max(0, liquidationPriceValue * 0.85);
  const span = entryPrice - floor;
  if (span <= 0) return [entryPrice];
  const step = span / (steps - 1);
  return Array.from({ length: steps }, (_, i) => Math.round((entryPrice - step * i) / 100) * 100);
}

export type CurvePoint = { btcPrice: number; ltv: number };

export function buildLtvCurvePoints(
  loanBalance: number,
  btcCollateral: number,
  minPrice: number,
  maxPrice: number,
  steps = 60,
): CurvePoint[] {
  if (btcCollateral <= 0 || maxPrice <= minPrice) return [];
  const step = (maxPrice - minPrice) / (steps - 1);
  return Array.from({ length: steps }, (_, i) => {
    const btcPrice = minPrice + step * i;
    const cv = collateralValue(btcCollateral, btcPrice);
    return { btcPrice, ltv: ltv(loanBalance, cv) };
  });
}
