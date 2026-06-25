import { fredGetFrom } from './fred';

export type MetalDataPoint = { date: string; value: number };

// Gold: London PM fix, daily since 1968
export async function fetchGoldHistory(): Promise<MetalDataPoint[]> {
  return fredGetFrom('GOLDAMGBD228NLBM', '1970-01-01');
}

// Silver: IMF Global price, monthly since 1980
export async function fetchSilverHistory(): Promise<MetalDataPoint[]> {
  return fredGetFrom('SLVPRUSD', '1970-01-01');
}

// 10Y Inflation-Indexed Treasury yield (real yield), daily since 2003
export async function fetchRealYield10Y(): Promise<MetalDataPoint[]> {
  return fredGetFrom('DFII10', '2003-01-01');
}
