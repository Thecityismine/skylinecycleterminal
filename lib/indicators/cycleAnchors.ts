export type CycleAnchor = {
  cycleId:       string;
  label:         string;
  lowDate:       string;
  lowPrice:      number;
  highDate?:     string;
  highPrice?:    number;
  nextLowDate?:  string;
  nextLowPrice?: number;
};

export const CYCLE_ANCHORS: CycleAnchor[] = [
  {
    cycleId:      'cycle2015',
    label:        '2015–2018',
    lowDate:      '2015-01-14',
    lowPrice:     152,
    highDate:     '2017-12-17',
    highPrice:    19783,
    nextLowDate:  '2018-12-15',
    nextLowPrice: 3122,
  },
  {
    cycleId:      'cycle2018',
    label:        '2018–2022',
    lowDate:      '2018-12-15',
    lowPrice:     3122,
    highDate:     '2021-11-10',
    highPrice:    68990,
    nextLowDate:  '2022-11-21',
    nextLowPrice: 15476,
  },
  {
    cycleId:  'cycle2022',
    label:    '2022–Current',
    lowDate:  '2022-11-21',
    lowPrice: 15476,
  },
];

export const MODEL_LOW_TO_HIGH  = 1064;
export const MODEL_HIGH_TO_LOW  = 364;
export const PEAK_WINDOW_START  = 1000;
export const PEAK_WINDOW_END    = 1125;
export const BOTTOM_WINDOW_START = 1350;
export const BOTTOM_WINDOW_END   = 1500;

export function daysBetween(start: string, end: string): number {
  return Math.round(
    (new Date(end   + 'T00:00:00Z').getTime() -
     new Date(start + 'T00:00:00Z').getTime()) / 86_400_000
  );
}

export function addDays(dateStr: string, days: number): string {
  const ms = new Date(dateStr + 'T00:00:00Z').getTime() + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

type CompletedAnchor = Required<CycleAnchor>;

export type CompletedCycleStats = {
  cycleId:        string;
  label:          string;
  lowDate:        string;
  lowDateFmt:     string;
  lowPrice:       number;
  highDate:       string;
  highDateFmt:    string;
  highPrice:      number;
  nextLowDate:    string;
  nextLowDateFmt: string;
  nextLowPrice:   number;
  daysLowToHigh:  number;
  daysHighToLow:  number;
  daysTotal:      number;
};

export function getCompletedCycles(): CompletedCycleStats[] {
  return (CYCLE_ANCHORS.filter(
    (c): c is CompletedAnchor =>
      !!(c.highDate && c.highPrice && c.nextLowDate && c.nextLowPrice)
  )).map((c) => ({
    cycleId:        c.cycleId,
    label:          c.label,
    lowDate:        c.lowDate,
    lowDateFmt:     fmtDate(c.lowDate),
    lowPrice:       c.lowPrice,
    highDate:       c.highDate,
    highDateFmt:    fmtDate(c.highDate),
    highPrice:      c.highPrice,
    nextLowDate:    c.nextLowDate,
    nextLowDateFmt: fmtDate(c.nextLowDate),
    nextLowPrice:   c.nextLowPrice,
    daysLowToHigh:  daysBetween(c.lowDate, c.highDate),
    daysHighToLow:  daysBetween(c.highDate, c.nextLowDate),
    daysTotal:      daysBetween(c.lowDate, c.nextLowDate),
  }));
}

type TimingStats = {
  avg:    number;
  median: number;
  min:    number;
  max:    number;
  stddev: number;
};

function computeStats(arr: number[]): TimingStats {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const med = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sd  = Math.sqrt(arr.reduce((s, v) => s + (v - avg) ** 2, 0) / arr.length);
  return {
    avg:    Math.round(avg),
    median: med,
    min:    Math.min(...arr),
    max:    Math.max(...arr),
    stddev: Math.round(sd),
  };
}

export type ValidationMetrics = {
  completedCycles: number;
  lowToHigh:       TimingStats;
  highToLow:       TimingStats;
  total:           TimingStats;
};

export function getValidationMetrics(): ValidationMetrics {
  const completed = getCompletedCycles();
  return {
    completedCycles: completed.length,
    lowToHigh: computeStats(completed.map((c) => c.daysLowToHigh)),
    highToLow: computeStats(completed.map((c) => c.daysHighToLow)),
    total:     computeStats(completed.map((c) => c.daysTotal)),
  };
}

export type CyclePhase = 'expansion' | 'peak-risk' | 'distribution' | 'accumulation' | 'beyond-model';

export type ActiveCyclePosition = {
  cycleId:                    string;
  label:                      string;
  lowDate:                    string;
  lowDateFmt:                 string;
  lowPrice:                   number;
  daysSinceLow:               number;
  projectedHighDate:          string;
  projectedHighDateFmt:       string;
  projectedLowDate:           string;
  projectedLowDateFmt:        string;
  projectedHighDateMedian:    string;
  projectedHighDateMedianFmt: string;
  projectedLowDateMedian:     string;
  projectedLowDateMedianFmt:  string;
  peakWindowStartDate:        string;
  peakWindowEndDate:          string;
  bottomWindowStartDate:      string;
  bottomWindowEndDate:        string;
  peakWindowStartTs:          number;
  peakWindowEndTs:            number;
  bottomWindowStartTs:        number;
  bottomWindowEndTs:          number;
  currentPhase:               CyclePhase;
  timingDeviation:            number;
};

const toTs = (iso: string) => new Date(iso + 'T00:00:00Z').getTime();

export function getActiveCyclePosition(metrics: ValidationMetrics): ActiveCyclePosition {
  const active = CYCLE_ANCHORS[CYCLE_ANCHORS.length - 1];
  const today  = new Date().toISOString().slice(0, 10);
  const daysSinceLow = daysBetween(active.lowDate, today);

  const projectedHighDate       = addDays(active.lowDate, MODEL_LOW_TO_HIGH);
  const projectedLowDate        = addDays(active.lowDate, MODEL_LOW_TO_HIGH + MODEL_HIGH_TO_LOW);
  const projectedHighDateMedian = addDays(active.lowDate, metrics.lowToHigh.median);
  const projectedLowDateMedian  = addDays(active.lowDate, metrics.lowToHigh.median + metrics.highToLow.median);

  const peakWindowStartDate   = addDays(active.lowDate, PEAK_WINDOW_START);
  const peakWindowEndDate     = addDays(active.lowDate, PEAK_WINDOW_END);
  const bottomWindowStartDate = addDays(active.lowDate, BOTTOM_WINDOW_START);
  const bottomWindowEndDate   = addDays(active.lowDate, BOTTOM_WINDOW_END);

  let currentPhase: CyclePhase;
  if (daysSinceLow < PEAK_WINDOW_START)         currentPhase = 'expansion';
  else if (daysSinceLow <= PEAK_WINDOW_END)     currentPhase = 'peak-risk';
  else if (daysSinceLow < BOTTOM_WINDOW_START)  currentPhase = 'distribution';
  else if (daysSinceLow <= BOTTOM_WINDOW_END)   currentPhase = 'accumulation';
  else                                          currentPhase = 'beyond-model';

  return {
    cycleId: active.cycleId,
    label:   active.label,
    lowDate: active.lowDate,
    lowDateFmt: fmtDate(active.lowDate),
    lowPrice:   active.lowPrice,
    daysSinceLow,
    projectedHighDate,
    projectedHighDateFmt:       fmtDate(projectedHighDate),
    projectedLowDate,
    projectedLowDateFmt:        fmtDate(projectedLowDate),
    projectedHighDateMedian,
    projectedHighDateMedianFmt: fmtDate(projectedHighDateMedian),
    projectedLowDateMedian,
    projectedLowDateMedianFmt:  fmtDate(projectedLowDateMedian),
    peakWindowStartDate,
    peakWindowEndDate,
    bottomWindowStartDate,
    bottomWindowEndDate,
    peakWindowStartTs:   toTs(peakWindowStartDate),
    peakWindowEndTs:     toTs(peakWindowEndDate),
    bottomWindowStartTs: toTs(bottomWindowStartDate),
    bottomWindowEndTs:   toTs(bottomWindowEndDate),
    currentPhase,
    timingDeviation: daysSinceLow - metrics.lowToHigh.median,
  };
}
