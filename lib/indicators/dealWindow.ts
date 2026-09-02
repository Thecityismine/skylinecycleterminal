import type { HousingData, FredPoint } from '@/lib/api/fredHousing';
import { ordinal } from '@/lib/format';

// The Deal Window — when to start preparing, as distinct from when to buy.
//
// Every other indicator on this page answers "what are conditions now". This one
// answers a different and more actionable question: how far through the sequence
// that precedes a buying window are we, and therefore is this a moment to build
// a list or a moment to write offers.
//
// It is deliberately NOT another weighted composite. A composite hides sequence,
// and sequence is the whole point. Housing turns in a repeatable order:
//
//   transactions freeze -> inventory builds -> sellers cut -> prices soften
//   -> credit stops tightening -> distress creates supply -> financing improves
//   -> builders turn up
//
// Each of those is a checkpoint below with a data test. What matters is not the
// count but WHERE the sequence stops, because the gap between the last fired
// checkpoint and the next one is the preparation time available.
//
// THE LAST CHECKPOINT IS A WARNING, NOT A GOAL. Builders turning up is the point
// at which the turn becomes visible to everyone; if you are still preparing when
// it fires, the crowd is already arriving. The useful window is checkpoints five
// through seven, which is exactly the stretch that feels worst to act in — the
// data is still bad and nothing has confirmed.

export type Checkpoint = {
  key:      string;
  /** Position in the historical sequence, 1-8. */
  order:    number;
  title:    string;
  /** What this checkpoint is testing for, in plain terms. */
  test:     string;
  fired:    boolean | null;
  /** The measured value that decided it. */
  reading:  string;
  /** Why this one comes where it does in the sequence. */
  because:  string;
};

export type DealWindow = {
  /** How many checkpoints have fired. */
  fired:       number;
  /** How many could be evaluated at all. */
  evaluated:   number;
  total:       number;
  stage:       string;
  color:       string;
  /** The single action line — the answer to "what do I do now". */
  action:      string;
  /** What has not happened yet, and what it would look like. */
  waitingOn:   string;
  checkpoints: Checkpoint[];
};

const latest = (s: FredPoint[]): number | null => (s.length ? s[s.length - 1].value : null);

/** Percentile of the newest observation within the series' own history. */
function percentile(s: FredPoint[]): number | null {
  if (s.length < 24) return null;
  const cur = s[s.length - 1].value;
  const sorted = s.map((p) => p.value).sort((a, b) => a - b);
  return (sorted.filter((v) => v < cur).length / sorted.length) * 100;
}

/** Change over the trailing `n` observations. Units are the series' own. */
function change(s: FredPoint[], n: number): number | null {
  if (s.length <= n) return null;
  return s[s.length - 1].value - s[s.length - 1 - n].value;
}

/** Highest value seen in the trailing `n` observations. */
function trailingMax(s: FredPoint[], n: number): number | null {
  if (!s.length) return null;
  return Math.max(...s.slice(-n).map((p) => p.value));
}

/** Mean of the trailing `n` observations. */
function trailingMean(s: FredPoint[], n: number): number | null {
  const w = s.slice(-n);
  if (!w.length) return null;
  return w.reduce((a, p) => a + p.value, 0) / w.length;
}

/**
 * Joins the 30-year mortgage to the 10-year Treasury by date and returns the
 * spread series.
 *
 * Both are roughly weekly/daily but published on different calendars, so only
 * exact date matches are kept. That loses observations and keeps the series
 * honest, which is the right trade for something used to detect an inflection.
 */
function spreadSeries(mortgage: FredPoint[], treasury: FredPoint[]): FredPoint[] {
  const t = new Map(treasury.map((p) => [p.date, p.value]));
  const out: FredPoint[] = [];
  for (const m of mortgage) {
    const y = t.get(m.date);
    if (y != null) out.push({ date: m.date, value: m.value - y });
  }
  return out;
}

export type DealWindowInputs = {
  data: HousingData;
  /** Real 12-month price change from the cycle series, in percent. */
  realChange12: number | null;
  /** Homebuilder composite, 0-100. */
  builders:     number | null;
  /** Homebuilder 26-week relative strength, to tell rising from merely low. */
  buildersRel:  number | null;
};

export function computeDealWindow(inp: DealWindowInputs): DealWindow {
  const { data, realChange12, builders, buildersRel } = inp;

  const cp: Checkpoint[] = [];
  const add = (c: Checkpoint) => cp.push(c);

  // ── 1. Transactions freeze ───────────────────────────────────────────────
  // First domino. Volume dies well before price does, because sellers withdraw
  // rather than cut. Nothing else in the sequence can start until it happens.
  const salesPct = percentile(data.newHomeSales);
  add({
    key: 'frozen', order: 1,
    title: 'Transactions have frozen',
    test:  'New-home sales below the middle of their own history',
    fired: salesPct == null ? null : salesPct < 50,
    reading: salesPct == null ? 'no data' : `${ordinal(Math.round(salesPct))} percentile of 1963-present`,
    because: 'Volume dies before price does. Sellers withdraw before they cut.',
  });

  // ── 2. Inventory builds ──────────────────────────────────────────────────
  const supplyPct = percentile(data.monthsSupply);
  add({
    key: 'inventory', order: 2,
    title: 'Inventory has built up',
    test:  'Months-supply in the top quarter of its history',
    fired: supplyPct == null ? null : supplyPct >= 75,
    reading: supplyPct == null ? 'no data'
      : `${latest(data.monthsSupply)?.toFixed(1)} months · ${ordinal(Math.round(supplyPct))} percentile`,
    because: 'Unsold inventory is what eventually forces the negotiation.',
  });

  // ── 3. Sellers capitulate ────────────────────────────────────────────────
  const cutsPct = percentile(data.priceReduced);
  add({
    key: 'capitulation', order: 3,
    title: 'Sellers are cutting',
    test:  'Listings with price reductions in the top third of the record',
    fired: cutsPct == null ? null : cutsPct >= 67,
    reading: cutsPct == null ? 'no data' : `${ordinal(Math.round(cutsPct))} percentile of 2016-present`,
    because: 'The first admission that the asking price was wrong.',
  });

  // ── 4. Real prices soften ────────────────────────────────────────────────
  add({
    key: 'softening', order: 4,
    title: 'Prices are softening in real terms',
    test:  'Case-Shiller falling over twelve months after inflation',
    fired: realChange12 == null ? null : realChange12 < 0,
    reading: realChange12 == null ? 'no data' : `${realChange12 > 0 ? '+' : ''}${realChange12.toFixed(1)}% over 12 months, real`,
    because: 'Purchasing power is where the adjustment shows up first — often while nominal prices are still flat.',
  });

  // ── 5. Credit stops tightening ───────────────────────────────────────────
  // The hinge of the whole sequence, and the one almost nobody watches.
  // Requires that banks were tightening recently, so a permanently quiet reading
  // cannot fire it — the checkpoint is an INFLECTION, not a level.
  const sloos     = data.lendingStandards;
  const sloosNow  = latest(sloos);
  const sloosPeak = trailingMax(sloos, 12);
  const sloosTurned =
    sloosNow == null || sloosPeak == null ? null
    : sloosPeak > 10 && sloosNow <= 5;
  add({
    key: 'credit', order: 5,
    title: 'Banks have stopped tightening',
    test:  'Net tightening back near zero after a genuine tightening episode',
    fired: sloosTurned,
    reading: sloosNow == null ? 'no data'
      : `${sloosNow.toFixed(1)}% net tightening, down from ${sloosPeak?.toFixed(1)}% peak`,
    because: 'Financing has to exist before a deal can close. This turns before price and is rarely reported.',
  });

  // ── 6. Distress creates supply ───────────────────────────────────────────
  // Deals come from sellers who have to sell. Rising delinquency from a low base
  // counts; a high but falling rate is the tail of the last cycle, not this one.
  const delinq    = data.mortgageDelinq;
  const delinqNow = latest(delinq);
  const delinqUp  = change(delinq, 4);
  add({
    key: 'distress', order: 6,
    title: 'Distress is creating deal flow',
    test:  'Mortgage delinquency rising over the trailing year',
    fired: delinqUp == null ? null : delinqUp > 0.1,
    reading: delinqNow == null ? 'no data'
      : `${delinqNow.toFixed(2)}%, ${delinqUp == null ? '—' : `${delinqUp > 0 ? '+' : ''}${delinqUp.toFixed(2)}pp`} over four quarters`,
    because: 'Discounts come from sellers who must sell, not from sellers who would prefer to.',
  });

  // ── 7. Financing improves ────────────────────────────────────────────────
  // The spread, not the rate. A mortgage rate falling with the 10-year tells you
  // about the bond market; the spread narrowing tells you lenders want the loan.
  const spread     = spreadSeries(data.mortgage30, data.treasury10);
  const spreadNow  = latest(spread);
  const spreadMean = trailingMean(spread, 156);
  add({
    key: 'financing', order: 7,
    title: 'Lenders are competing again',
    test:  'Mortgage-to-Treasury spread below its own three-year average',
    fired: spreadNow == null || spreadMean == null ? null : spreadNow < spreadMean,
    reading: spreadNow == null ? 'no data'
      : `${spreadNow.toFixed(2)}pp vs ${spreadMean?.toFixed(2)}pp three-year average`,
    because: 'Strips out the Fed. A narrowing spread is lenders competing for the loan.',
  });

  // ── 8. Builders turn up ──────────────────────────────────────────────────
  // The warning line. This is when the turn becomes legible to everyone.
  const buildersUp =
    builders == null ? null : builders >= 45 && (buildersRel == null || buildersRel > -5);
  add({
    key: 'builders', order: 8,
    title: 'Builders have turned up',
    test:  'Homebuilder composite recovered and no longer lagging the index',
    fired: buildersUp,
    reading: builders == null ? 'no data'
      : `${Math.round(builders)}/100${buildersRel == null ? '' : ` · ${buildersRel > 0 ? '+' : ''}${buildersRel.toFixed(1)}% vs SPY`}`,
    because: 'The consensus signal. If you are still preparing when this fires, you are late.',
  });

  const evaluated = cp.filter((c) => c.fired != null).length;
  const fired     = cp.filter((c) => c.fired === true).length;

  // Stage is read off the count, but the action line is read off WHICH ones
  // fired — specifically whether the credit hinge has turned, because that is
  // what separates "conditions are bad" from "a window is opening".
  const creditTurned   = cp.find((c) => c.key === 'credit')?.fired === true;
  const buildersFired  = cp.find((c) => c.key === 'builders')?.fired === true;

  let stage: string;
  let color: string;
  let action: string;

  if (buildersFired && fired >= 6) {
    stage  = 'Consensus Arriving';
    color  = '#F97316';
    action = 'The turn is visible to everyone now. Deals still exist but the discount is compressing, and competition for them is rising. This is the stretch to be finishing, not starting.';
  } else if (fired >= 6) {
    stage  = 'Window Open';
    color  = '#35D07F';
    action = 'Most of the sequence has completed and builders have not yet confirmed, which is the combination that has historically produced the best entries. Deploy into prepared positions rather than starting the search now.';
  } else if (fired >= 4 && creditTurned) {
    stage  = 'Window Opening';
    color  = '#22D3EE';
    action = 'Credit has turned while the rest of the data is still poor. This is the preparation window: line up financing, build the target list, and get relationships in place. It will not feel like the right time, which is the point.';
  } else if (fired >= 3) {
    stage  = 'Build Your List';
    color  = '#E6B450';
    action = 'The setup is forming but financing conditions have not turned. Do the unglamorous work now — underwriting criteria, lender conversations, market selection — so that the later checkpoints find you ready rather than researching.';
  } else {
    stage  = 'Too Early';
    color  = '#6F7A86';
    action = 'The cycle has not created the conditions that produce deals. Preparation here is cheap but idle; there is no edge in forcing it.';
  }

  const pending = cp.filter((c) => c.fired === false).sort((a, b) => a.order - b.order);
  const waitingOn = pending.length
    ? `Next in sequence: ${pending[0].title.toLowerCase()} — ${pending[0].test.toLowerCase()}. Currently ${pending[0].reading}.`
    : 'Every checkpoint has fired. The sequence is complete, which also means it is no longer early.';

  return {
    fired, evaluated, total: cp.length,
    stage, color, action, waitingOn,
    checkpoints: cp.sort((a, b) => a.order - b.order),
  };
}
