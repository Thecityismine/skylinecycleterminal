export type DrawdownPoint = {
  time:     string;
  ts:       number;
  close:    number;
  ath:      number;
  drawdown: number;  // ≤ 0, percentage
};

export type DrawdownCycle = {
  label:           string;
  athDate:         string;
  bottomDate:      string;
  maxDrawdown:     number;
  daysToLow:       number;
  daysToRecovery:  number | null;
};

// Hardcoded from CoinMetrics-consistent daily-close data
export const HISTORICAL_CYCLES: DrawdownCycle[] = [
  {
    label: '2011',
    athDate: '2011-06-08', bottomDate: '2011-11-18',
    maxDrawdown: -93.8, daysToLow: 163, daysToRecovery: 490,
  },
  {
    label: '2013–2015',
    athDate: '2013-12-04', bottomDate: '2015-01-14',
    maxDrawdown: -86.9, daysToLow: 406, daysToRecovery: 727,
  },
  {
    label: '2017–2018',
    athDate: '2017-12-17', bottomDate: '2018-12-15',
    maxDrawdown: -84.2, daysToLow: 363, daysToRecovery: 740,
  },
  {
    label: '2021–2022',
    athDate: '2021-11-10', bottomDate: '2022-11-21',
    maxDrawdown: -77.5, daysToLow: 376, daysToRecovery: 490,
  },
];

export function calculateDrawdownFromATH(
  data: { time: string; price: number }[],
): DrawdownPoint[] {
  let runningATH = 0;
  return data.map(point => {
    runningATH = Math.max(runningATH, point.price);
    const drawdown = runningATH > 0
      ? ((point.price - runningATH) / runningATH) * 100
      : 0;
    return {
      time:     point.time,
      ts:       new Date(point.time + 'T00:00:00Z').getTime(),
      close:    point.price,
      ath:      runningATH,
      drawdown: Number(drawdown.toFixed(2)),
    };
  });
}

export type DrawdownRegimeMeta = {
  label: string;
  color: string;
  desc:  string;
};

export const DRAWDOWN_REGIMES: Array<
  DrawdownRegimeMeta & { min: number; max: number }
> = [
  { min: -15,  max: 0,    label: 'Near Highs',       color: '#35D07F', desc: 'Bitcoin is trading within 15% of its all-time high.' },
  { min: -30,  max: -15,  label: 'Normal Correction', color: '#E6B450', desc: 'Healthy pullback within a bull market. Common during consolidation phases.' },
  { min: -50,  max: -30,  label: 'Deep Pullback',     color: '#F97316', desc: 'Significant correction. Prior cycles have found medium-term support in this range.' },
  { min: -70,  max: -50,  label: 'Bear Market',       color: '#FF5C5C', desc: 'Full bear market conditions. Long-term accumulation zone in prior cycles.' },
  { min: -100, max: -70,  label: 'Capitulation Zone', color: '#B91C1C', desc: 'Historically extreme downside. All prior cycle lows have occurred in this range.' },
];

export function getDrawdownRegime(drawdown: number): DrawdownRegimeMeta & { min: number; max: number } {
  return (
    DRAWDOWN_REGIMES.find(r => drawdown >= r.min && drawdown < (r.max === 0 ? 0.001 : r.max))
    ?? DRAWDOWN_REGIMES[DRAWDOWN_REGIMES.length - 1]
  );
}

// % of all historical daily closes that had a LESS SEVERE drawdown than today
// Higher = more historically severe current conditions
// e.g., 72 means 72% of all days had a milder drawdown than today
export function drawdownSeverityPct(allDrawdowns: number[], current: number): number {
  if (allDrawdowns.length === 0) return 0;
  const betterDays = allDrawdowns.filter(d => d > current).length;
  return Math.round((betterDays / allDrawdowns.length) * 100);
}

// % gain from current price needed to reach ATH
export function recoveryNeededPct(ath: number, currentPrice: number): number {
  if (currentPrice <= 0) return 0;
  return ((ath / currentPrice) - 1) * 100;
}

// Find the date when the running ATH was last set (= date of current ATH)
export function findATHDate(points: DrawdownPoint[]): string | null {
  let ath = 0;
  let athDate: string | null = null;
  for (const p of points) {
    if (p.close > ath) {
      ath = p.close;
      athDate = p.time;
    }
  }
  return athDate;
}
