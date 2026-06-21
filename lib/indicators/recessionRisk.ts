// ── NBER Recession Periods ────────────────────────────────────────────────────

export type RecessionPeriod = {
  start:          string;   // YYYY-MM-DD (NBER peak month start)
  end:            string;   // YYYY-MM-DD (NBER trough month end)
  label:          string;
  spxDrawdown:    number;   // SPX peak-to-trough % (from SPX peak, not NBER start)
  monthsTrough:   number;   // months from SPX peak to SPX trough
  monthsRecovery: number;   // months from SPX trough back to prior ATH
};

export const NBER_RECESSIONS: RecessionPeriod[] = [
  {
    start: '2001-03-01', end: '2001-11-30',
    label: 'Dot-Com Recession',
    spxDrawdown: -49.1, monthsTrough: 31, monthsRecovery: 56,
  },
  {
    start: '2007-12-01', end: '2009-06-30',
    label: 'Global Financial Crisis',
    spxDrawdown: -56.8, monthsTrough: 17, monthsRecovery: 49,
  },
  {
    start: '2020-02-01', end: '2020-04-30',
    label: 'COVID Recession',
    spxDrawdown: -33.9, monthsTrough: 1, monthsRecovery: 5,
  },
];

// ── Sliding MA ────────────────────────────────────────────────────────────────

export function slidingMA(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

// ── Signal Scoring (0 = low risk, 100 = high risk) ────────────────────────────

export function scoreYieldCurve(t10y2y: number): number {
  if (t10y2y > 1.5)  return 0;
  if (t10y2y > 1.0)  return 10;
  if (t10y2y > 0.5)  return 20;
  if (t10y2y > 0.0)  return 35;
  if (t10y2y > -0.5) return 60;
  return 80;
}

export function scoreSahm(sahm: number): number {
  if (sahm >= 0.50) return 100;
  if (sahm >= 0.35) return 70;
  if (sahm >= 0.20) return 40;
  return 10;
}

export function scoreHYSpread(oas: number): number {
  if (oas < 3.0) return 5;
  if (oas < 4.0) return 20;
  if (oas < 5.0) return 45;
  if (oas < 6.5) return 70;
  if (oas < 9.0) return 85;
  return 95;
}

export function scoreUnemployment(unrate: number, unrate12mAgo: number): number {
  const delta = unrate - unrate12mAgo;
  if (delta > 1.0)  return 85;
  if (delta > 0.5)  return 60;
  if (delta > 0.2)  return 35;
  if (delta > 0.0)  return 15;
  return 5;
}

export function scoreISM(ism: number): number {
  if (ism > 55) return 5;
  if (ism > 50) return 20;
  if (ism > 48) return 45;
  if (ism > 45) return 65;
  return 85;
}

export function scoreSPXTrend(price: number, ma200w: number | null): number {
  if (ma200w == null) return 25;
  const pct = (price / ma200w) - 1;
  if (pct > 0.30)  return 5;
  if (pct > 0.10)  return 15;
  if (pct > 0.0)   return 30;
  if (pct > -0.10) return 60;
  return 85;
}

export type RecessionScoreInputs = {
  t10y2y:       number;
  sahm:         number;
  hyOas:        number;
  unrate:       number;
  unrate12mAgo: number;
  ism:          number;
  spxPrice:     number;
  spx200wma:    number | null;
};

export function computeRecessionRiskScore(inputs: RecessionScoreInputs): number {
  return Math.round(
    scoreYieldCurve(inputs.t10y2y)                               * 0.20 +
    scoreSahm(inputs.sahm)                                       * 0.20 +
    scoreHYSpread(inputs.hyOas)                                  * 0.20 +
    scoreUnemployment(inputs.unrate, inputs.unrate12mAgo)        * 0.15 +
    scoreISM(inputs.ism)                                         * 0.15 +
    scoreSPXTrend(inputs.spxPrice, inputs.spx200wma)             * 0.10
  );
}

export type RiskLevel = 'low' | 'watch' | 'elevated' | 'severe';

export function riskLevel(score: number): RiskLevel {
  if (score < 25) return 'low';
  if (score < 50) return 'watch';
  if (score < 75) return 'elevated';
  return 'severe';
}

export const RISK_META: Record<RiskLevel, { label: string; color: string; desc: string }> = {
  low:      { label: 'Low Risk — Expansion',             color: '#35D07F',
    desc: 'Macro signals are broadly supportive. Credit conditions are healthy, employment is stable, and equity trend is intact.' },
  watch:    { label: 'Watch — Late Cycle',               color: '#E6B450',
    desc: 'Some signals are deteriorating. Monitor yield curve, credit spreads, and employment trends closely for further weakness.' },
  elevated: { label: 'Elevated Risk — Caution',          color: '#F97316',
    desc: 'Multiple signals are flashing warning. Historically, this combination has preceded recessions by 6–18 months.' },
  severe:   { label: 'Severe Stress — Recession Risk',   color: '#FF5C5C',
    desc: 'Broad-based deterioration across macro signals. Conditions consistent with recession or severe contraction.' },
};

// ── SPX Chart Point ───────────────────────────────────────────────────────────

export type SPXPoint = {
  time:   string;
  ts:     number;
  price:  number;
  ma50w:  number | null;   // 250-trading-day MA
  ma200w: number | null;   // 1000-trading-day MA
};
