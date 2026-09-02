import type { HousingData, FredPoint, Depth } from '@/lib/api/fredHousing';
import { HOUSING_SERIES } from '@/lib/api/fredHousing';

// The Real Estate Opportunity Score.
//
// DIRECTION, stated once because everything below depends on it:
//
//     0   = seller's market. Expensive, tight, hard to buy well.
//     100 = buyer's market. Cheap, loose, historically good entry.
//
// This is the opposite polarity to lib/indicators/macroRisk.ts, where high means
// hostile. Kept that way deliberately: "opportunity" reading high is the
// intuitive direction for a score a person uses to decide whether to deploy
// capital, and it matches the Skyline Cycle Score, where a low number means BTC
// is cheap... which is the OPPOSITE again. That inconsistency is real and worth
// knowing about; see the note on `btcOpportunity` below for how they are made
// comparable on the page.
//
// SCORING IS PERCENTILE-BASED, not threshold-based. A table saying "over 6
// months of supply is a buyer's market" sounds authoritative and misleads:
// months-supply of new homes has a 63-year median of 5.5 and spent the whole of
// 2008-2011 above 8. What matters is where today sits in that distribution, not
// which side of a round number it falls on. Percentiles also survive a series
// being rebased, which absolute thresholds do not.

export type Polarity = 'high_is_opportunity' | 'low_is_opportunity';

export type Metric = {
  key:      string;
  label:    string;
  /** Formatted for display, e.g. "9.6 months". */
  display:  string;
  /** 0-100 contribution, already polarity-corrected. Null when unavailable. */
  score:    number | null;
  /** Where the raw reading sits in its own history, 0-100. Null when shallow. */
  percentile: number | null;
  depth:    Depth;
  source:   string;
  /** One line on why this matters for the buy-or-wait decision. */
  note:     string;
};

export type Pillar = {
  key:     string;
  title:   string;
  weight:  number;
  score:   number | null;
  metrics: Metric[];
  /** Share of this pillar's weight that actually reported, 0-1. */
  coverage: number;
  blurb:   string;
};

export type RealEstateScore = {
  score:    number | null;
  label:    string;
  color:    string;
  pillars:  Pillar[];
  coverage: number;
  /** Computed affordability, surfaced because it drives the valuation pillar. */
  affordability: {
    medianPrice:      number | null;
    mortgageRate:     number | null;
    medianIncome:     number | null;
    monthlyPayment:   number | null;
    paymentToIncome:  number | null;
    priceToIncome:    number | null;
  };
};

// ── Primitives ────────────────────────────────────────────────────────────────

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const last = (s: FredPoint[]): number | null => (s.length ? s[s.length - 1].value : null);

/** Percentile rank of `v` within `series`, 0-100. */
function percentile(series: FredPoint[], v: number): number | null {
  if (series.length < 24) return null;
  const sorted = series.map((p) => p.value).sort((a, b) => a - b);
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
  return (lo / sorted.length) * 100;
}

/**
 * A metric scored on where it sits in its own history.
 *
 * `polarity` says which end is the opportunity. Months of supply is
 * high_is_opportunity — lots of unsold inventory is a buyer's condition. The
 * 30-year rate is also high_is_opportunity, which reads oddly until you
 * remember this score measures how good a moment it is to BUY, and high rates
 * are what suppress competition and soften prices. You refinance a rate; you do
 * not refinance a price.
 */
function scored(
  key: string,
  meta: { id: string; label: string; depth: Depth; source: string },
  series: FredPoint[],
  polarity: Polarity,
  format: (v: number) => string,
  note: string,
): Metric {
  const v = last(series);
  if (v == null) {
    return { key, label: meta.label, display: '—', score: null, percentile: null, depth: meta.depth, source: meta.source, note };
  }
  const p = percentile(series, v);
  const score = p == null ? null : polarity === 'high_is_opportunity' ? p : 100 - p;
  return {
    key,
    label: meta.label,
    display: format(v),
    score,
    percentile: p,
    depth: meta.depth,
    source: meta.source,
    note,
  };
}

/** Weighted mean over the metrics that reported, plus the share that did. */
function blend(items: Array<[number | null, number]>): { value: number | null; coverage: number } {
  let sum = 0, weight = 0, total = 0;
  for (const [v, w] of items) {
    total += w;
    if (v == null) continue;
    sum += v * w;
    weight += w;
  }
  return { value: weight === 0 ? null : sum / weight, coverage: total === 0 ? 0 : weight / total };
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fMonths = (v: number) => `${v.toFixed(1)} months`;
const fPct    = (v: number) => `${v.toFixed(1)}%`;
const fCount  = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : `${Math.round(v / 1000)}k`);
const fDays   = (v: number) => `${Math.round(v)} days`;
const fIndex  = (v: number) => v.toFixed(1);
const fThou   = (v: number) => `${Math.round(v).toLocaleString()}k`;

// ── Affordability, computed ───────────────────────────────────────────────────

/**
 * Monthly principal and interest on an 80% LTV, 30-year loan.
 *
 * Deliberately excludes taxes and insurance. Both vary enormously by state and
 * FRED has no national monthly series for either, so including a guess would
 * make the number look more precise while being less true. The spec asks for
 * them; this is the honest subset.
 */
function monthlyPayment(price: number, annualRatePct: number): number {
  const principal = price * 0.8;
  const r = annualRatePct / 100 / 12;
  const n = 360;
  if (r <= 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// ── The score ─────────────────────────────────────────────────────────────────

export function computeRealEstateScore(d: HousingData): RealEstateScore {
  const S = HOUSING_SERIES;

  // ── Affordability inputs, used by the valuation pillar ─────────────────────
  const medianPrice  = last(d.medianPrice);
  const mortgageRate = last(d.mortgage30);
  const medianIncome = last(d.medianIncome);

  const payment = medianPrice != null && mortgageRate != null
    ? monthlyPayment(medianPrice, mortgageRate)
    : null;

  const paymentToIncome = payment != null && medianIncome != null && medianIncome > 0
    ? (payment * 12) / medianIncome * 100
    : null;

  const priceToIncome = medianPrice != null && medianIncome != null && medianIncome > 0
    ? medianPrice / medianIncome
    : null;

  // Payment-to-income scored against its own history rather than a fixed "30%
  // rule". The rule of thumb is a lending guideline, not a distribution, and the
  // question here is whether today is cheap RELATIVE TO THE PAST, not whether a
  // given household qualifies.
  const ptiSeries: FredPoint[] = [];
  if (d.medianPrice.length && d.mortgage30.length && d.medianIncome.length) {
    // Income is annual; carry the most recent annual value forward across the
    // months that follow it. Interpolating would invent monthly precision the
    // Census does not publish.
    const incomeAt = (date: string): number | null => {
      let found: number | null = null;
      for (const p of d.medianIncome) { if (p.date <= date) found = p.value; else break; }
      return found;
    };
    const rateAt = (date: string): number | null => {
      let found: number | null = null;
      for (const p of d.mortgage30) { if (p.date <= date) found = p.value; else break; }
      return found;
    };
    for (const p of d.medianPrice) {
      const inc = incomeAt(p.date);
      const rate = rateAt(p.date);
      if (inc == null || rate == null || inc <= 0) continue;
      ptiSeries.push({ date: p.date, value: (monthlyPayment(p.value, rate) * 12) / inc * 100 });
    }
  }

  const ptiMetric: Metric = (() => {
    const meta = { id: 'computed', label: 'Payment to income', depth: 'deep' as Depth, source: 'Computed · Census + Freddie Mac' };
    if (paymentToIncome == null) {
      return { key: 'pti', ...meta, display: '—', score: null, percentile: null, note: 'Cost of the median house as a share of median income.' };
    }
    const p = percentile(ptiSeries, paymentToIncome);
    return {
      key: 'pti',
      ...meta,
      display: `${paymentToIncome.toFixed(1)}%`,
      // Low payment-to-income is the opportunity.
      score: p == null ? null : 100 - p,
      percentile: p,
      note: 'Cost of the median house as a share of median income, at the prevailing 30-year rate. Computed rather than taken from FIXHAI, which FRED serves as a rolling twelve months.',
    };
  })();

  // ── Pillar 1 · Valuation (25%) ────────────────────────────────────────────
  const valuationMetrics: Metric[] = [
    ptiMetric,
    scored('caseShiller', S.caseShiller, d.caseShiller, 'low_is_opportunity', fIndex,
      'National house prices. High in its own history means paying near the top of the range.'),
    scored('mortgage30', S.mortgage30, d.mortgage30, 'high_is_opportunity', fPct,
      'High rates suppress competition and soften prices. You can refinance a rate; you cannot refinance a price.'),
  ];
  const valuation = blend([
    [valuationMetrics[0].score, 0.45],
    [valuationMetrics[1].score, 0.30],
    [valuationMetrics[2].score, 0.25],
  ]);

  // ── Pillar 2 · Supply & demand (25%) ──────────────────────────────────────
  const supplyMetrics: Metric[] = [
    scored('monthsSupply', S.monthsSupply, d.monthsSupply, 'high_is_opportunity', fMonths,
      'Unsold inventory measured in months of sales. The single cleanest read on who has negotiating power.'),
    scored('activeListings', S.activeListings, d.activeListings, 'high_is_opportunity', fCount,
      'Homes actively for sale. Only ten years of history, so its percentile is indicative rather than definitive.'),
    scored('daysOnMarket', S.daysOnMarket, d.daysOnMarket, 'high_is_opportunity', fDays,
      'How long the median listing sits. Rising means sellers are meeting the market rather than the reverse.'),
    scored('priceReduced', S.priceReduced, d.priceReduced, 'high_is_opportunity', fCount,
      'Listings that have cut their asking price — the earliest visible sign sellers are capitulating.'),
  ];
  const supply = blend([
    [supplyMetrics[0].score, 0.40],
    [supplyMetrics[1].score, 0.20],
    [supplyMetrics[2].score, 0.20],
    [supplyMetrics[3].score, 0.20],
  ]);

  // ── Pillar 3 · Credit (20%) ───────────────────────────────────────────────
  //
  // Polarity here is the subtle one. Tight credit and rising delinquency score
  // as OPPORTUNITY, which sounds backwards until you notice that the best entry
  // prices have historically coincided with the hardest financing. The catch is
  // real and belongs on the page rather than buried in the number: the moment
  // the house is cheapest is frequently the moment you cannot get the loan.
  const creditMetrics: Metric[] = [
    scored('lendingStandards', S.lendingStandards, d.lendingStandards, 'high_is_opportunity', fPct,
      'Net share of banks tightening. High means credit is hard to get — which is when prices are usually softest, and when you may not qualify.'),
    scored('mortgageDelinq', S.mortgageDelinq, d.mortgageDelinq, 'high_is_opportunity', fPct,
      'Delinquency rate. Rising distress produces motivated sellers and, eventually, forced ones.'),
  ];
  const credit = blend([
    [creditMetrics[0].score, 0.55],
    [creditMetrics[1].score, 0.45],
  ]);

  // ── Pillar 4 · Cycle (15%) ────────────────────────────────────────────────
  const cycleMetrics: Metric[] = [
    scored('buildingPermits', S.buildingPermits, d.buildingPermits, 'low_is_opportunity', fThou,
      'Permits lead starts, which lead completions. Falling permits mark builders pulling back before the data says why.'),
    scored('housingStarts', S.housingStarts, d.housingStarts, 'low_is_opportunity', fThou,
      'Construction underway. Weak starts today are tomorrow\'s supply shortage.'),
    scored('newHomeSales', S.newHomeSales, d.newHomeSales, 'low_is_opportunity', fThou,
      'New-home transactions. Volume cracks before price does.'),
  ];
  const cycle = blend([
    [cycleMetrics[0].score, 0.40],
    [cycleMetrics[1].score, 0.30],
    [cycleMetrics[2].score, 0.30],
  ]);

  // ── Pillar 5 · Sentiment (15%) ────────────────────────────────────────────
  const sentimentMetrics: Metric[] = [
    scored('consumerSentiment', S.consumerSentiment, d.consumerSentiment, 'low_is_opportunity', fIndex,
      'Households are most reluctant to buy near lows and most eager near highs. Low sentiment is the opportunity.'),
    scored('rentalVacancy', S.rentalVacancy, d.rentalVacancy, 'high_is_opportunity', fPct,
      'Rental vacancy. High vacancy means weak rent support, which caps what an investor can pay.'),
  ];
  const sentiment = blend([
    [sentimentMetrics[0].score, 0.60],
    [sentimentMetrics[1].score, 0.40],
  ]);

  const pillars: Pillar[] = [
    { key: 'valuation', title: 'Valuation',        weight: 0.25, score: valuation.value, metrics: valuationMetrics, coverage: valuation.coverage,
      blurb: 'What the median house costs against what households earn, and at what financing cost.' },
    { key: 'supply',    title: 'Supply & Demand',  weight: 0.25, score: supply.value,    metrics: supplyMetrics,    coverage: supply.coverage,
      blurb: 'Who holds negotiating power right now. Inventory and time-on-market move before price does.' },
    { key: 'credit',    title: 'Credit',           weight: 0.20, score: credit.value,    metrics: creditMetrics,    coverage: credit.coverage,
      blurb: 'How hard it is to borrow. Tight credit scores as opportunity because that is when prices soften — and when you may not qualify.' },
    { key: 'cycle',     title: 'Construction Cycle', weight: 0.15, score: cycle.value,   metrics: cycleMetrics,     coverage: cycle.coverage,
      blurb: 'Where builders are in their own cycle. Permits and starts lead the price data by quarters.' },
    { key: 'sentiment', title: 'Sentiment',        weight: 0.15, score: sentiment.value, metrics: sentimentMetrics, coverage: sentiment.coverage,
      blurb: 'How households feel. Reliably worst near the bottom, which is what makes it useful inverted.' },
  ];

  const overall = blend(pillars.map((p) => [p.score, p.weight] as [number | null, number]));
  const score = overall.value == null ? null : clamp(overall.value);

  return {
    score,
    label: labelFor(score),
    color: colorFor(score),
    pillars,
    coverage: overall.coverage,
    affordability: {
      medianPrice,
      mortgageRate,
      medianIncome,
      monthlyPayment: payment,
      paymentToIncome,
      priceToIncome,
    },
  };
}

// ── Bands ─────────────────────────────────────────────────────────────────────

export function labelFor(score: number | null): string {
  if (score == null) return 'Unavailable';
  if (score <= 20) return 'Extreme Seller\'s Market';
  if (score <= 40) return 'Seller\'s Market';
  if (score <= 60) return 'Balanced';
  if (score <= 80) return 'Buyer\'s Market';
  return 'Deep Value';
}

export function colorFor(score: number | null): string {
  if (score == null) return '#6F7A86';
  if (score <= 20) return '#FF5C5C';
  if (score <= 40) return '#F97316';
  if (score <= 60) return '#E6B450';
  if (score <= 80) return '#35D07F';
  return '#22D3EE';
}

// ── Cross-asset quadrant ──────────────────────────────────────────────────────

export type Quadrant = {
  key:   'both_cheap' | 'btc_cheap' | 're_cheap' | 'both_rich';
  title: string;
  read:  string;
};

/**
 * Places the pair on the allocation matrix.
 *
 * `btcOpportunity` must already be polarity-corrected. The Skyline Cycle Score
 * runs the other way — low means BTC is cheap — so the caller inverts it before
 * passing it in. Doing that conversion at the boundary rather than inside here
 * keeps one place to look when the numbers disagree with intuition.
 */
export function quadrantFor(reScore: number, btcOpportunity: number): Quadrant {
  const reCheap  = reScore >= 55;
  const btcCheap = btcOpportunity >= 55;

  if (reCheap && btcCheap) return {
    key: 'both_cheap',
    title: 'Both cheap',
    read: 'The rare one. Housing and Bitcoin are both reading toward the low end of their own histories at the same time. Historically this has needed a credit event to produce, and it has not lasted long.',
  };
  if (btcCheap) return {
    key: 'btc_cheap',
    title: 'Bitcoin cheap, housing expensive',
    read: 'Bitcoin is reading cheap while housing has not reset. Bitcoin can be cheap without the broader cycle having finished — a housing and credit deterioration from here would likely take Bitcoin lower with it before the real low.',
  };
  if (reCheap) return {
    key: 're_cheap',
    title: 'Housing cheap, Bitcoin expensive',
    read: 'Housing is reading cheap while Bitcoin is extended. Historically this is late in the housing reset and late in the Bitcoin cycle — the two rarely bottom together, and this is the ordering that favours property.',
  };
  return {
    key: 'both_rich',
    title: 'Both expensive',
    read: 'Neither asset is reading cheap against its own history. This is the condition where cash carries an option value that does not show up as a return.',
  };
}
