// Generates the daily @SkylineCycle posts from live terminal data.
//
// The copy is templated rather than written fresh each day. That is the point:
// a model writing the sentence from scratch every morning drifts in tone over
// months and can quote a number that is not in the payload. Templates cannot.
//
// Voice rules encoded here come from marketing/x-daily-templates.md:
// data first, opinion second; descriptive never directive; no forecasts, no
// price targets; informational only.

import type { CycleScoreResult, IndicatorResult } from '@/lib/indicators/skylineScore';

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const WEEKDAYS: Weekday[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Weekday in America/New_York, which is the schedule the account posts on. */
export function weekdayInNewYork(now = new Date()): Weekday {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(now);
  return s as Weekday;
}

export function dateInNewYork(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);
}

// ─── Post 1: the daily Score post ────────────────────────────────────────────

// Which indicator leads on which day, so consecutive posts do not repeat.
// First available wins; if none of the preferred ones are reporting, any
// available indicator is used rather than skipping the post.
const LENS: Record<Weekday, string[]> = {
  Mon: ['MVRV Ratio', 'Log Regression'],
  Tue: ['Active Addresses', 'NVT Signal'],
  Wed: ['2Y MA Multiplier', 'Pi Cycle Top'],
  Thu: ['Puell Multiple', 'Hash Rate Ribbon'],
  Fri: ['Fear & Greed'],
  Sat: ['Stablecoin Supply'],
  Sun: [],
};

// The API's own `signal` field says "Strong Buy" / "Sell". That is directive
// language and must never reach a post. These describe where the reading sits
// instead, which is the same information without the instruction.
function positionPhrase(indicatorScore: number): string {
  if (indicatorScore < 20) return 'deep in its historical value range';
  if (indicatorScore < 38) return 'below its historical midpoint';
  if (indicatorScore < 62) return 'near its historical midpoint';
  if (indicatorScore < 80) return 'above its historical midpoint';
  return 'high in its historical range';
}

const ZONE_PHRASE: Record<string, string> = {
  accumulate: 'the coldest quartile of the range',
  build: 'the lower half of the range',
  caution: 'the upper half of the range',
  distribution: 'the hottest quartile of the range',
};

/** rawLabel carries a parenthetical gloss; the leading value is enough for a post. */
function shortValue(raw: string): string {
  return raw.split(' (')[0].trim();
}

function pickIndicator(cycle: CycleScoreResult, day: Weekday): IndicatorResult | null {
  const available = cycle.indicators.filter((i) => i.available);
  for (const name of LENS[day]) {
    const hit = available.find((i) => i.name === name);
    if (hit) return hit;
  }
  return available[0] ?? null;
}

export function zoneWord(zone: string): string {
  if (zone === 'accumulate') return 'Accumulation';
  if (zone === 'build') return 'Build';
  if (zone === 'caution') return 'Caution';
  return 'Distribution';
}

export function buildScorePost(cycle: CycleScoreResult, day: Weekday, withCta: boolean): string {
  const score = Math.round(cycle.score);
  const reporting = cycle.indicators.filter((i) => i.available).length;

  let sentence: string;
  if (day === 'Sun') {
    sentence = `Composite of ${reporting} reporting indicators, sitting in ${ZONE_PHRASE[cycle.zone] ?? 'its historical range'}.`;
  } else {
    const ind = pickIndicator(cycle, day);
    sentence = ind
      ? `${ind.name} at ${shortValue(ind.rawLabel)}, ${positionPhrase(ind.score)}.`
      : `Composite of ${reporting} reporting indicators.`;
  }

  const lines = [
    "Today's Skyline Score",
    '',
    String(score),
    zoneWord(cycle.zone),
    '',
    sentence,
  ];
  if (withCta) lines.push('', 'Full cycle read → skylinecycleterminal.com');
  return lines.join('\n');
}

// ─── Post 2: the rotating second post ────────────────────────────────────────

export type SecondPost = { title: string; body: string } | { skipped: string };

type Macro = { macroScore: number; m2YoY: number; dxy: { current: number; change1M: number } };
type OnChain = { current: { mvrvProxy: number | null; puell: number | null; nvt: number | null; addresses: number | null } };
type Signals = { btcAbove2yma: boolean; btcAbove200wma: boolean; btcAbove200dma: boolean; piCycleRatio: number };
type Market = { fearGreedValue: number; fearGreedLabel: string };
type Altseason = { score: number; regimeLabel: string; btcDominance: number };

const n1 = (v: number) => v.toFixed(1);
const n2 = (v: number) => v.toFixed(2);

export function buildLiquidityPost(m: Macro): SecondPost {
  return {
    title: 'Liquidity',
    body: [
      'Global Liquidity',
      '',
      `Macro score ${Math.round(m.macroScore)} / 100`,
      '',
      `Dollar index at ${n1(m.dxy.current)}, M2 growing ${n1(m.m2YoY)}% year over year.`,
    ].join('\n'),
  };
}

export function buildOnChainPost(o: OnChain): SecondPost {
  const c = o.current;
  const rows: string[] = [];
  if (c.mvrvProxy != null) rows.push(`MVRV proxy: ${n2(c.mvrvProxy)}`);
  if (c.puell != null) rows.push(`Puell Multiple: ${n2(c.puell)}`);
  if (c.addresses != null) rows.push(`Active addresses (30d avg): ${Math.round(c.addresses)}k`);
  return { title: 'On-chain', body: ['On-chain', '', ...rows].join('\n') };
}

export function buildStructurePost(s: Signals): SecondPost {
  const anchors = [
    `${s.btcAbove2yma ? 'Above' : 'Below'} the 2-year MA`,
    `${s.btcAbove200wma ? 'above' : 'below'} the 200-week`,
  ].join(', ');
  return {
    title: 'Market structure',
    body: [
      'Market Structure',
      '',
      anchors,
      '',
      `Pi Cycle ratio at ${n2(s.piCycleRatio)}.`,
    ].join('\n'),
  };
}

export function buildSentimentPost(m: Market): SecondPost {
  return {
    title: 'Sentiment',
    body: [
      'Fear & Greed',
      '',
      `${m.fearGreedValue} / 100 · ${m.fearGreedLabel}`,
      '',
      'Crowd sentiment, measured daily.',
    ].join('\n'),
  };
}

export function buildRotationPost(a: Altseason): SecondPost {
  return {
    title: 'Rotation',
    body: [
      'Altseason Index',
      '',
      `${Math.round(a.score)} / 100 · ${a.regimeLabel}`,
      '',
      `Bitcoin dominance at ${n1(a.btcDominance)}%.`,
    ].join('\n'),
  };
}

export function buildSundayPost(): SecondPost {
  return {
    title: 'Weekly email',
    body: [
      'Skyline Weekly goes out today.',
      '',
      'The current Score, what changed this week, and one thing worth understanding.',
      '',
      'Subscribe → skylinecycleterminal.com',
    ].join('\n'),
  };
}

// ─── Notes ───────────────────────────────────────────────────────────────────

const BOUNDARIES = [0, 25, 50, 75, 100];

export function boundaryNote(score: number): string {
  const nearest = BOUNDARIES.reduce((a, b) => (Math.abs(b - score) < Math.abs(a - score) ? b : a));
  const distance = Math.abs(nearest - score);
  // A phase change is the highest-value post of the month, and this generator
  // cannot see yesterday's score, so it flags proximity rather than claiming one.
  const flag = distance <= 3 ? '  ← WITHIN 3 POINTS, watch for a phase change' : '';
  return `Score ${score} is ${distance} point${distance === 1 ? '' : 's'} from the ${nearest} boundary.${flag}`;
}

export function unavailableNote(cycle: CycleScoreResult): string {
  const out = cycle.indicators.filter((i) => !i.available).map((i) => i.name);
  return out.length ? `Not reporting today: ${out.join(', ')}. Excluded from the score.` : 'All indicators reporting.';
}

/** Roughly one post in five carries a link, keyed off the date so it is stable within a day. */
export function ctaToday(isoDate: string): boolean {
  const day = Number(isoDate.slice(-2));
  return day % 5 === 0;
}
