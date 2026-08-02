// Macro Terminal — narrative, checklist, scenarios and historical eras.
//
// Every sentence produced here is generated from the live scored data by a
// deterministic rule set. Nothing is hand-written per-day and nothing is
// forecast: the report states what the current readings are and what they have
// historically meant. Scenario weights are a transparent function of the Macro
// Risk Score, not a prediction of what will happen.

import type { PricePoint } from '@/lib/api/coinmetrics';
import type { MacroRiskResult, Section, Metric, SectionKey } from '@/lib/indicators/macroRisk';
import { GREEN, AMBER, ORANGE, RED, GREY } from '@/lib/indicators/macroRisk';

// ── Bitcoin reference levels ──────────────────────────────────────────────────

export type BtcContext = {
  price:    number | null;
  ma100w:   number | null;
  ma200w:   number | null;
  ath:      number | null;
  drawdown: number | null;   // % from ATH
  low52w:   number | null;
};

export function buildBtcContext(history: PricePoint[]): BtcContext {
  if (!history.length) {
    return { price: null, ma100w: null, ma200w: null, ath: null, drawdown: null, low52w: null };
  }
  const closes = history.map(p => p.price);
  const price  = closes[closes.length - 1];
  const mean   = (n: number) =>
    closes.length < n ? null : closes.slice(-n).reduce((s, v) => s + v, 0) / n;

  const ath      = Math.max(...closes);
  const low52w   = closes.length >= 365 ? Math.min(...closes.slice(-365)) : Math.min(...closes);
  const drawdown = ath > 0 ? ((price - ath) / ath) * 100 : null;

  return { price, ma100w: mean(700), ma200w: mean(1400), ath, drawdown, low52w };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const bySection = (r: MacroRiskResult, key: SectionKey): Section | undefined =>
  r.sections.find(s => s.key === key);

/** Metrics that are pulling the score down (supportive) or up (hostile). */
function split(r: MacroRiskResult): { helping: Metric[]; hurting: Metric[] } {
  const all = r.sections.flatMap(s => s.metrics).filter(m => m.risk != null);
  const helping = all.filter(m => m.risk! < 35).sort((a, b) => a.risk! - b.risk!);
  const hurting = all.filter(m => m.risk! > 62).sort((a, b) => b.risk! - a.risk!);
  return { helping, hurting };
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// ── Macro summary (the paragraph under the gauge) ─────────────────────────────

export function buildMacroSummary(r: MacroRiskResult, btc: BtcContext): string {
  if (r.score == null) return 'Macro data is currently unavailable. Section scores will populate once the upstream sources respond.';

  const liq    = bySection(r, 'liquidity');
  const credit = bySection(r, 'credit');
  const eq     = bySection(r, 'equities');
  const usd    = bySection(r, 'dollar');

  // Where Bitcoin sits against its own long-term structure.
  const valuation =
    btc.price == null || btc.ma200w == null ? 'Bitcoin\'s position against its long-term averages is unavailable'
    : btc.price < btc.ma200w  ? 'Bitcoin is trading below its 200-week moving average, a level historically associated with deep cycle value'
    : btc.ma100w != null && btc.price < btc.ma100w ? 'Bitcoin is trading between its 200-week and 100-week moving averages, the band that has framed prior accumulation phases'
    : btc.drawdown != null && btc.drawdown < -25 ? `Bitcoin is roughly ${Math.abs(btc.drawdown).toFixed(0)}% below its all-time high while holding above its long-term averages`
    : 'Bitcoin is trading above its long-term moving averages';

  const liqClause =
    liq?.risk == null ? ''
    : liq.risk < 40 ? 'Liquidity conditions are expanding, which has historically been the precondition for the next phase of the cycle'
    : liq.risk < 60 ? 'Liquidity conditions are mixed and have not yet turned decisively in either direction'
    : 'Liquidity is still being withdrawn, and Bitcoin has never sustained a major advance against that backdrop';

  const stressClause = (() => {
    const parts: string[] = [];
    if (credit?.risk != null && credit.risk > 55) parts.push('credit spreads');
    if (eq?.risk != null && eq.risk > 55) parts.push('equity market structure');
    if (usd?.risk != null && usd.risk > 55) parts.push('the dollar and real yields');
    if (!parts.length) return '';
    const list = parts.length === 1 ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    return `Pressure is concentrated in ${list}`;
  })();

  const closing =
    r.score >= 70 ? 'On this evidence there is still meaningful scope for a risk-off event to push valuations lower before the next long-term expansion begins.'
    : r.score >= 55 ? 'On this evidence the broader financial system has not fully reset, and patience is better rewarded than urgency.'
    : r.score >= 45 ? 'On this evidence macro is neither the reason to buy nor the reason to wait — the cycle signals carry more weight here than the macro backdrop does.'
    : r.score >= 30 ? 'On this evidence the macro backdrop is starting to work with Bitcoin rather than against it.'
    : 'On this evidence the macro backdrop is actively supportive, which historically coincides with the expansion phase of the cycle.';

  return [
    `${valuation}.`,
    liqClause ? `${liqClause}.` : '',
    stressClause ? `${stressClause}.` : '',
    closing,
  ].filter(Boolean).join(' ');
}

// ── Daily macro report ────────────────────────────────────────────────────────

export type MacroReport = {
  helping:     Array<{ label: string; detail: string }>;
  hurting:     Array<{ label: string; detail: string }>;
  biggestRisk: string;
  bottomLine:  string;
};

export function buildMacroReport(r: MacroRiskResult, btc: BtcContext): MacroReport {
  const { helping, hurting } = split(r);

  const biggestRisk = (() => {
    if (!hurting.length) {
      return 'No individual macro signal is currently in the high-risk band. The main risk to this read is that conditions change faster than monthly and quarterly data can register.';
    }
    const worst = hurting[0];
    const eq    = bySection(r, 'equities');
    const spxRisk = eq?.metrics.find(m => m.key === 'spxtrend')?.risk ?? null;

    const equityCaveat = spxRisk != null && spxRisk > 50
      ? ' Equity trend is already deteriorating, which shortens the distance between a macro shock and forced selling in crypto.'
      : ' If the S&P enters a significant correction from here, Bitcoin may revisit lower valuation zones despite historically attractive on-chain metrics.';

    return `${worst.label} is the most stretched input on the board at ${worst.display} (${lower(worst.status)}).${equityCaveat}`;
  })();

  const bottomLine = (() => {
    if (r.score == null) return 'Insufficient data to form a view.';
    const cheapish = btc.price != null && btc.ma200w != null && btc.price < btc.ma200w * 1.35;
    if (r.score >= 70) {
      return cheapish
        ? 'Long-term accumulation signals are improving, but broader financial markets have not yet reset. Current macro conditions favour patience over urgency.'
        : 'Macro conditions are hostile and Bitcoin is not yet at a level where long-term valuation models offer much cushion. This is the least attractive combination of the two.';
    }
    if (r.score >= 55) {
      return 'Macro is a headwind rather than a crisis. Conditions like these have historically produced choppy, range-bound markets rather than sustained trends in either direction.';
    }
    if (r.score >= 45) {
      return 'Macro is close to neutral. With the broader system neither helping nor hurting decisively, cycle-position signals should carry the most weight in a decision here.';
    }
    if (r.score >= 30) {
      return 'The macro backdrop is turning supportive. Historically, liquidity improving while valuation signals are still attractive has been the most favourable overlap of the cycle.';
    }
    return 'Macro conditions are broadly supportive. The risk in this environment is complacency rather than contraction — this is the part of the cycle where positioning gets crowded.';
  })();

  return {
    helping: helping.slice(0, 5).map(m => ({ label: m.label, detail: `${m.display} — ${lower(m.status)}` })),
    hurting: hurting.slice(0, 5).map(m => ({ label: m.label, detail: `${m.display} — ${lower(m.status)}` })),
    biggestRisk,
    bottomLine,
  };
}

// ── Checklist ─────────────────────────────────────────────────────────────────

export type ChecklistItem = {
  label:  string;
  light:  'green' | 'amber' | 'orange' | 'red' | 'grey';
  color:  string;
  status: string;
};

export function buildChecklist(r: MacroRiskResult): ChecklistItem[] {
  return r.sections.map(s => {
    const light: ChecklistItem['light'] =
      s.risk == null ? 'grey'
      : s.risk < 25 ? 'green'
      : s.risk < 50 ? 'amber'
      : s.risk < 75 ? 'orange'
      : 'red';
    const color = { green: GREEN, amber: AMBER, orange: ORANGE, red: RED, grey: GREY }[light];
    return { label: s.title, light, color, status: s.status };
  });
}

// ── Scenario engine ───────────────────────────────────────────────────────────

export type Scenario = {
  name:        string;
  probability: number;         // %
  color:       string;
  drivers:     string[];
  btcFraming:  string;
  note:        string;
};

/**
 * Weights are a transparent function of the Macro Risk Score: the base case
 * always carries 50%, and the remaining 50% is split between the bull and bear
 * paths in proportion to how far the score sits from neutral. These are
 * planning weights for thinking about ranges — not forecasts.
 */
export function buildScenarios(r: MacroRiskResult, btc: BtcContext): Scenario[] {
  const score = r.score ?? 50;
  const bearShare = Math.max(0, Math.min(1, score / 100));
  const bear = Math.round(50 * bearShare);
  const bull = 50 - bear;

  const fmtUsd = (v: number | null) =>
    v == null ? 'n/a' : `$${Math.round(v).toLocaleString('en-US')}`;

  const liq = bySection(r, 'liquidity');
  const cr  = bySection(r, 'credit');

  return [
    {
      name: 'Base Case',
      probability: 50,
      color: AMBER,
      drivers: [
        liq?.risk != null && liq.risk >= 50
          ? 'Liquidity stays restrictive without contracting sharply'
          : 'Liquidity keeps improving at its current pace',
        'Equities correct but avoid a disorderly unwind',
        cr?.risk != null && cr.risk >= 50
          ? 'Credit spreads widen gradually rather than gapping'
          : 'Credit spreads stay contained',
      ],
      btcFraming: btc.ma100w != null && btc.ma200w != null
        ? `Range-bound between the 200-week average (${fmtUsd(btc.ma200w)}) and the 100-week average (${fmtUsd(btc.ma100w)})`
        : 'Range-bound around current long-term averages',
      note: 'The market chops while the macro backdrop resolves. Historically the most common outcome and the least discussed.',
    },
    {
      name: 'Bull Case',
      probability: bull,
      color: GREEN,
      drivers: [
        'Global liquidity expands and central bank balance sheets stop shrinking',
        'The dollar weakens and real yields fall',
        'Equities hold their trend, credit spreads compress',
      ],
      btcFraming: btc.ath != null
        ? `Cycle resumes; prior all-time high (${fmtUsd(btc.ath)}) becomes the reference level rather than the ceiling`
        : 'Cycle resumes with the prior high as reference',
      note: 'Requires liquidity to lead. In every prior cycle the liquidity turn came first and price followed with a lag of months, not days.',
    },
    {
      name: 'Bear Case',
      probability: bear,
      color: RED,
      drivers: [
        'A significant equity bear market forces broad deleveraging',
        'Credit contracts and funding stress spreads',
        'Liquidity withdrawal continues into the drawdown',
      ],
      btcFraming: btc.ma200w != null
        ? `Bitcoin revisits long-term valuation support — the 200-week average currently sits at ${fmtUsd(btc.ma200w)}${btc.low52w != null ? `, with the 52-week low at ${fmtUsd(btc.low52w)}` : ''}`
        : 'Bitcoin revisits long-term valuation support',
      note: 'This is the scenario on-chain metrics alone will not warn you about. Cheap can get cheaper when the whole system is deleveraging.',
    },
  ];
}

// ── Historical macro eras ─────────────────────────────────────────────────────

export type MacroEra = {
  period:    string;
  event:     string;
  liquidity: string;
  outcome:   string;
  color:     string;
  current?:  boolean;
};

/**
 * Curated history — the point is to let someone connect a macro cause to a
 * Bitcoin effect at a glance. The final row is filled from live data.
 */
export const MACRO_ERAS: MacroEra[] = [
  {
    period: '2014–2015', event: 'Fed ends QE3, dollar surges',
    liquidity: 'Liquidity flat, DXY +25%',
    outcome: 'BTC bear — 85% drawdown into the 2015 low',
    color: RED,
  },
  {
    period: '2016–2017', event: 'BOJ and ECB expand aggressively',
    liquidity: 'Global liquidity expanding',
    outcome: 'BTC bull — cycle top December 2017',
    color: GREEN,
  },
  {
    period: '2018–2019', event: 'Fed quantitative tightening',
    liquidity: 'Balance sheet shrinking',
    outcome: 'BTC bear — 84% drawdown, base built through 2019',
    color: RED,
  },
  {
    period: '2020', event: 'COVID — emergency easing',
    liquidity: 'Largest liquidity expansion on record',
    outcome: 'BTC bull — crash then historic expansion',
    color: GREEN,
  },
  {
    period: '2022', event: 'Fed hikes into inflation, QT restarts',
    liquidity: 'Liquidity falling, real yields surge',
    outcome: 'BTC bear — 77% drawdown despite strong on-chain value signals',
    color: RED,
  },
  {
    period: '2023–2024', event: 'Rate peak, then policy pivot',
    liquidity: 'Liquidity stabilises, dollar tops',
    outcome: 'BTC recovery — accumulation into the next expansion',
    color: GREEN,
  },
];

export function currentEra(r: MacroRiskResult, btc: BtcContext): MacroEra {
  const liq = bySection(r, 'liquidity');
  const eq  = bySection(r, 'equities');
  const year = new Date().getUTCFullYear();

  return {
    period: `${year} — Current`,
    event: eq?.risk != null && eq.risk >= 55
      ? 'Equities late cycle, macro stress building'
      : eq?.risk != null && eq.risk < 35
      ? 'Equities in trend, macro backdrop stable'
      : 'Equities mixed, macro backdrop unresolved',
    liquidity: liq?.status ?? 'Liquidity unavailable',
    outcome: btc.price != null && btc.ma200w != null && btc.price < btc.ma200w
      ? 'BTC below the 200-week average — historically deep-value territory'
      : btc.drawdown != null && btc.drawdown < -20
      ? `BTC ${Math.abs(btc.drawdown).toFixed(0)}% below all-time high — accumulation range`
      : 'BTC holding above long-term averages',
    color: r.color,
    current: true,
  };
}
