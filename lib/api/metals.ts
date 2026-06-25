import { fredGetFrom } from './fred';
import { fetchWeeklyHistory } from './yahoo';

export type MetalDataPoint = { date: string; value: number };

async function yahooWeekly(ticker: string): Promise<MetalDataPoint[]> {
  try {
    const weeks = await fetchWeeklyHistory(ticker);
    return weeks.map(w => ({ date: w.time, value: w.close }));
  } catch {
    return [];
  }
}

// Gold: XAU/USD via Yahoo Finance gold futures (GC=F)
export async function fetchGoldHistory(): Promise<MetalDataPoint[]> {
  return yahooWeekly('GC=F');
}

// Silver: XAG/USD via Yahoo Finance silver futures (SI=F)
export async function fetchSilverHistory(): Promise<MetalDataPoint[]> {
  return yahooWeekly('SI=F');
}

// 10Y Inflation-Indexed Treasury yield (real yield), daily since 2003
export async function fetchRealYield10Y(): Promise<MetalDataPoint[]> {
  return fredGetFrom('DFII10', '2003-01-01');
}
