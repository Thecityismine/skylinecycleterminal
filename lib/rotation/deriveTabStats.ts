export type RotationPoint = {
  time:       string;
  ts:         number;
  value:      number;
  ma50:       number | null;
  ma100:      number | null;
  ma200:      number | null;
  cloudUpper: number | null;
  cloudLower: number | null;
  momentum:   number | null;
  waveWt1:    number | null;
  waveWt2:    number | null;
};

export type DerivedStats = {
  currentValue:    number;
  athValue:        number;
  distanceFromATH: number; // %
  maValue:         number | null;
  distanceFromMA:  number | null; // %
  aboveMA:         boolean | null;
  trend:           'Bullish' | 'Neutral' | 'Bearish';
  momentumLabel:   'Rising' | 'Falling' | 'Flat';
  momentumValue:   number | null;
};

export function deriveTabStats(points: RotationPoint[], maPeriod: 50 | 100 | 200): DerivedStats {
  const last = points[points.length - 1];
  const ath = points.reduce((m, p) => Math.max(m, p.value), 0);
  const maKey = maPeriod === 50 ? 'ma50' : maPeriod === 100 ? 'ma100' : 'ma200';
  const maValue = last ? last[maKey] : null;
  const distanceFromMA = maValue != null && maValue > 0 && last
    ? ((last.value - maValue) / maValue) * 100
    : null;
  const momentumValue = last?.momentum ?? null;

  return {
    currentValue:    last?.value ?? 0,
    athValue:        ath,
    distanceFromATH: ath > 0 && last ? ((last.value - ath) / ath) * 100 : 0,
    maValue,
    distanceFromMA,
    aboveMA:         distanceFromMA != null ? distanceFromMA >= 0 : null,
    trend:           distanceFromMA == null ? 'Neutral' : distanceFromMA > 3 ? 'Bullish' : distanceFromMA < -3 ? 'Bearish' : 'Neutral',
    momentumLabel:   momentumValue == null ? 'Flat' : momentumValue > 2 ? 'Rising' : momentumValue < -2 ? 'Falling' : 'Flat',
    momentumValue,
  };
}
