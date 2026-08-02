// Macro Risk Score: does the broader financial system help or fight Bitcoin?
//
// Direction convention (uniform across every metric, section, and the composite):
//
//     0   = macro conditions are SUPPORTIVE of Bitcoin
//     100 = macro conditions are HOSTILE to Bitcoin
//
// Every number on the Macro Terminal points the same way, so a rising bar always
// means "worse for BTC" regardless of which section it sits in. That includes
// Liquidity, which is expressed as *Liquidity Risk* (high = liquidity draining)
// rather than as a bullishness score.
//
// This score is deliberately independent of the Skyline Cycle Score. The Cycle
// Score answers "is Bitcoin cheap relative to its own history?" This one answers
// "is the rest of the world likely to help or hurt over the coming months?"

import type { MacroTerminalData, Pt } from '@/lib/api/macroTerminal';

// ── Primitives ────────────────────────────────────────────────────────────────

export type Cadence = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type Metric = {
  key:     string;
  label:   string;
  display: string;          // formatted value, or '—' when unavailable
  risk:    number | null;   // 0–100, null when the series is unavailable
  status:  string;
  color:   string;
  note:    string;          // why this matters for Bitcoin
  source:  string;
  cadence: Cadence;
  asOf:    string | null;
};

export type SectionKey =
  | 'liquidity' | 'equities' | 'credit' | 'dollar' | 'volatility' | 'psychology';

export type Section = {
  key:      SectionKey;
  title:    string;
  blurb:    string;
  risk:     number | null;
  status:   string;
  color:    string;
  weight:   number;
  metrics:  Metric[];
  coverage: string | null;   // permanent gaps: metrics with no free data source
  /** Share of this section's metric weight that actually returned data, 0–1. */
  dataShare: number;
};

export const GREEN  = '#35D07F';
export const AMBER  = '#E6B450';
export const ORANGE = '#F97316';
export const RED    = '#FF5C5C';
export const GREY   = '#6F7A86';

export function riskColor(risk: number | null): string {
  if (risk == null) return GREY;
  if (risk < 25) return GREEN;
  if (risk < 50) return AMBER;
  if (risk < 75) return ORANGE;
  return RED;
}

export function riskBand(risk: number | null): 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'N/A' {
  if (risk == null) return 'N/A';
  if (risk < 25) return 'LOW';
  if (risk < 50) return 'MODERATE';
  if (risk < 75) return 'ELEVATED';
  return 'HIGH';
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Map a value onto 0–100 risk. `atZero` scores 0, `atHundred` scores 100. */
function lin(v: number, atZero: number, atHundred: number): number {
  if (atZero === atHundred) return 50;
  return clamp(((v - atZero) / (atHundred - atZero)) * 100, 0, 100);
}

const last = (s: Pt[]): Pt | null => (s.length ? s[s.length - 1] : null);

/** Value on or immediately before `date`; null if the series starts later. */
function valueAsOf(s: Pt[], date: string): number | null {
  let out: number | null = null;
  for (const p of s) {
    if (p.date <= date) out = p.value;
    else break;
  }
  return out;
}

function dateMinus(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Percent change over the trailing `days` calendar days. */
function changePct(s: Pt[], days: number): number | null {
  const cur = last(s);
  if (!cur) return null;
  const then = valueAsOf(s, dateMinus(cur.date, days));
  if (then == null || then === 0) return null;
  return ((cur.value - then) / Math.abs(then)) * 100;
}

/** Absolute change over the trailing `days` calendar days. */
function changeAbs(s: Pt[], days: number): number | null {
  const cur = last(s);
  if (!cur) return null;
  const then = valueAsOf(s, dateMinus(cur.date, days));
  if (then == null) return null;
  return cur.value - then;
}

/** Where the latest reading sits in the series' own history, 0–100. */
function percentile(s: Pt[], value: number): number | null {
  if (s.length < 30) return null;
  let below = 0;
  for (const p of s) if (p.value <= value) below++;
  return (below / s.length) * 100;
}

function sma(s: Pt[], period: number): number | null {
  if (s.length < period) return null;
  let sum = 0;
  for (let i = s.length - period; i < s.length; i++) sum += s[i].value;
  return sum / period;
}

function fmt(v: number | null, dp = 2, suffix = ''): string {
  return v == null ? '—' : `${v.toFixed(dp)}${suffix}`;
}

function fmtPct(v: number | null, dp = 1): string {
  return v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(dp)}%`;
}

function fmtTrillions(v: number | null): string {
  return v == null ? '—' : `$${(v / 1_000_000).toFixed(2)}T`;
}

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th, 21st. */
function ordinal(v: number): string {
  const n = Math.round(v);
  const mod100 = n % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th'
    : n % 10 === 1 ? 'st'
    : n % 10 === 2 ? 'nd'
    : n % 10 === 3 ? 'rd'
    : 'th';
  return `${n}${suffix}`;
}

/** Build a metric, or an "unavailable" placeholder when inputs are missing. */
function metric(
  key: string,
  label: string,
  risk: number | null,
  display: string,
  bands: Array<[number, string]>,   // ascending risk thresholds → status label
  note: string,
  source: string,
  cadence: Cadence,
  asOf: string | null,
): Metric {
  let status = 'No data';
  if (risk != null) {
    status = bands[bands.length - 1][1];
    for (const [threshold, label_] of bands) {
      if (risk < threshold) { status = label_; break; }
    }
  }
  return {
    key, label, display, risk, status,
    color: riskColor(risk), note, source, cadence, asOf,
  };
}

/**
 * Weighted mean over available inputs. Weights renormalise across what exists,
 * and `share` reports how much of the intended weight actually had data. The
 * caller needs that to avoid presenting a thin sample as a confident reading.
 */
function blend(pairs: Array<[number | null, number]>): { value: number | null; share: number } {
  let sum = 0, have = 0, total = 0;
  for (const [risk, weight] of pairs) {
    total += weight;
    if (risk == null) continue;
    sum  += risk * weight;
    have += weight;
  }
  return {
    value: have === 0 ? null : sum / have,
    share: total === 0 ? 0 : have / total,
  };
}

// ── Derived series ────────────────────────────────────────────────────────────

/**
 * Fed net liquidity = total assets − Treasury General Account − overnight RRP.
 * WALCL and WTREGEN are in $ millions; RRPONTSYD is in $ billions.
 */
export function fedNetLiquidity(d: MacroTerminalData): Pt[] {
  if (!d.fedAssets.length) return [];
  return d.fedAssets.map(a => {
    const tga = valueAsOf(d.tga, a.date) ?? 0;
    const rrp = (valueAsOf(d.reverseRepo, a.date) ?? 0) * 1000;
    return { date: a.date, value: a.value - tga - rrp };
  });
}

/**
 * Global central-bank balance sheet in USD millions: Fed + ECB + BOJ.
 * ECB reports in € millions; BOJ in units of ¥100 million.
 * The PBoC is absent. FRED's China M2 series were discontinued in 2019 and no
 * free replacement covers the present, so China is excluded rather than guessed.
 */
export function globalCentralBankAssets(d: MacroTerminalData): Pt[] {
  if (!d.fedAssets.length) return [];
  return d.fedAssets.map(a => {
    const eurUsd = valueAsOf(d.usdPerEur, a.date);
    const usdJpy = valueAsOf(d.jpyPerUsd, a.date);
    const ecbEur = valueAsOf(d.ecbAssets, a.date);
    const bojYen = valueAsOf(d.bojAssets, a.date);
    const ecbUsd = ecbEur != null && eurUsd != null ? ecbEur * eurUsd : 0;
    const bojUsd = bojYen != null && usdJpy != null && usdJpy > 0
      ? (bojYen * 100) / usdJpy : 0;
    return { date: a.date, value: a.value + ecbUsd + bojUsd };
  });
}

/** 3M commercial paper minus 3M T-bill, a read on short-term corporate funding stress. */
function cpSpread(d: MacroTerminalData): Pt[] {
  if (!d.cpRate.length) return [];
  return d.cpRate
    .map(p => {
      const bill = valueAsOf(d.tbill3m, p.date);
      return bill == null ? null : { date: p.date, value: p.value - bill };
    })
    .filter((p): p is Pt => p != null);
}

/** Russell 2000 / S&P 500, small-cap participation, used as a breadth proxy. */
function smallCapRatio(d: MacroTerminalData): Pt[] {
  if (!d.russell.length || !d.spx.length) return [];
  return d.russell
    .map(p => {
      const s = valueAsOf(d.spx, p.date);
      return s == null || s === 0 ? null : { date: p.date, value: p.value / s };
    })
    .filter((p): p is Pt => p != null);
}

// ── Sections ──────────────────────────────────────────────────────────────────

function buildLiquidity(d: MacroTerminalData): Section {
  const net    = fedNetLiquidity(d);
  const global = globalCentralBankAssets(d);

  const netChg    = changePct(net, 91);
  const globalYoY = changePct(global, 365);
  const m2YoY     = changePct(d.usM2, 365);

  const stableSeries: Pt[] = d.stablecoins.map(p => ({ date: p.time, value: p.stablecoinMC }));
  const stable90 = changePct(stableSeries, 90);

  const metrics = [
    metric('netliq', 'Fed Net Liquidity',
      netChg == null ? null : lin(netChg, 4, -4),
      `${fmtTrillions(last(net)?.value ?? null)} · ${fmtPct(netChg)} 13w`,
      [[25, 'Expanding'], [50, 'Flat'], [75, 'Draining'], [101, 'Contracting Hard']],
      'Fed assets minus the Treasury General Account and overnight reverse repo. The cleanest read on dollars actually circulating in markets. Bitcoin has tracked its direction more closely than any single on-chain metric.',
      'FRED WALCL · WTREGEN · RRPONTSYD', 'weekly', last(net)?.date ?? null),

    metric('globalcb', 'Global CB Balance Sheet',
      globalYoY == null ? null : lin(globalYoY, 8, -8),
      `${fmtTrillions(last(global)?.value ?? null)} · ${fmtPct(globalYoY)} YoY`,
      [[25, 'Expanding'], [50, 'Stable'], [75, 'Shrinking'], [101, 'Rapid QT']],
      'Fed + ECB + BOJ balance sheets converted to USD. Global liquidity, not just US liquidity, has set the tempo for every Bitcoin cycle since 2013.',
      'FRED WALCL · ECBASSETSW · JPNASSETS', 'weekly', last(global)?.date ?? null),

    metric('m2', 'US M2 Money Supply',
      m2YoY == null ? null : lin(m2YoY, 8, -2),
      `${fmtPct(m2YoY)} YoY`,
      [[25, 'Growing'], [50, 'Neutral'], [75, 'Slowing'], [101, 'Contracting']],
      'Broad money in the US economy. Sustained M2 contraction has never coincided with a Bitcoin bull market.',
      'FRED WM2NS', 'weekly', last(d.usM2)?.date ?? null),

    metric('stables', 'Stablecoin Supply',
      stable90 == null ? null : lin(stable90, 12, -4),
      `${fmtPct(stable90)} 90d`,
      [[25, 'Inflowing'], [50, 'Flat'], [75, 'Draining'], [101, 'Exiting']],
      'Crypto-native dry powder. Stablecoin supply expands when capital is staging to buy and contracts when it is leaving the asset class entirely.',
      'DeFiLlama', 'daily', d.stablecoins.at(-1)?.time ?? null),
  ];

  const { value: risk, share } = blend([
    [metrics[0].risk, 0.35], [metrics[1].risk, 0.25],
    [metrics[2].risk, 0.20], [metrics[3].risk, 0.20],
  ]);

  return {
    key: 'liquidity', title: 'Liquidity', weight: 0.30, metrics, risk, dataShare: share,
    color: riskColor(risk),
    status: risk == null ? 'Unavailable'
      : risk < 25 ? 'Liquidity Expanding'
      : risk < 50 ? 'Liquidity Neutral'
      : risk < 75 ? 'Liquidity Tightening'
      : 'Liquidity Contracting',
    blurb: 'The single largest driver of Bitcoin\'s macro cycle. When dollars are being created, risk assets rise; when they are being withdrawn, valuation models stop mattering for a while.',
    coverage: 'The PBoC is excluded. FRED discontinued its China M2 series in 2019 and no free full-history replacement exists.',
  };
}

function buildEquities(d: MacroTerminalData): Section {
  const spxLast   = last(d.spx);
  const spx200d   = sma(d.spx, 200);
  const spxVs200  = spxLast && spx200d ? ((spxLast.value - spx200d) / spx200d) * 100 : null;
  const spxAth    = d.spx.length ? Math.max(...d.spx.map(p => p.value)) : null;
  const spxDd     = spxLast && spxAth ? ((spxLast.value - spxAth) / spxAth) * 100 : null;

  const ndxLast   = last(d.nasdaq);
  const ndx200d   = sma(d.nasdaq, 200);
  const ndxVs200  = ndxLast && ndx200d ? ((ndxLast.value - ndx200d) / ndx200d) * 100 : null;

  const ratio     = smallCapRatio(d);
  const ratio52w  = sma(ratio, 52);
  const ratioLast = last(ratio);
  const breadth   = ratioLast && ratio52w ? ((ratioLast.value - ratio52w) / ratio52w) * 100 : null;

  const marginYoY = changePct(d.marginDebt, 365);

  const metrics = [
    metric('spxtrend', 'S&P 500 Trend',
      spxVs200 == null ? null : lin(spxVs200, 8, -12),
      spxVs200 == null ? '—' : `${fmtPct(spxVs200)} vs 200D`,
      [[25, 'Bull · Above 200D'], [50, 'Consolidating'], [75, 'Correction'], [101, 'Bear · Below 200D']],
      'Bitcoin has never sustained an uptrend through a genuine S&P bear market. A break below the 200-day is the line where equity weakness starts pulling crypto with it.',
      'FRED SP500', 'daily', spxLast?.date ?? null),

    metric('spxdd', 'S&P 500 Drawdown',
      spxDd == null ? null : lin(spxDd, -1, -22),
      spxDd == null ? '—' : spxDd > -0.5 ? 'At ATH' : fmtPct(spxDd),
      [[25, 'Near Highs'], [50, 'Mild Pullback'], [75, 'Correction'], [101, 'Bear Market']],
      'Distance from the all-time high. Forced deleveraging tends to begin around −15% to −20%, and that is when correlations across all risk assets snap toward 1.',
      'FRED SP500', 'daily', spxLast?.date ?? null),

    metric('ndxtrend', 'Nasdaq Trend',
      ndxVs200 == null ? null : lin(ndxVs200, 10, -14),
      ndxVs200 == null ? '—' : `${fmtPct(ndxVs200)} vs 200D`,
      [[25, 'Bull'], [50, 'Consolidating'], [75, 'Correction'], [101, 'Bear']],
      'Bitcoin\'s highest-beta equity relative. Tech leads risk appetite both up and down, and Nasdaq usually breaks before the broad index does.',
      'FRED NASDAQCOM', 'daily', ndxLast?.date ?? null),

    metric('breadth', 'Small-Cap Breadth',
      breadth == null ? null : lin(breadth, 6, -10),
      breadth == null ? '—' : `RUT/SPX ${fmtPct(breadth)} vs 52w`,
      [[25, 'Healthy'], [50, 'Neutral'], [75, 'Weakening'], [101, 'Diverging']],
      'Russell 2000 against the S&P 500. When only mega-caps are rising, the rally is narrow, and narrow rallies are the ones that break. Used here in place of an advance-decline line, which has no free data source.',
      'Yahoo ^RUT / FRED SP500', 'weekly', ratioLast?.date ?? null),

    metric('margin', 'Margin Debt',
      marginYoY == null ? null : lin(marginYoY, -5, 30),
      `${fmtPct(marginYoY)} YoY`,
      [[25, 'Low Leverage'], [50, 'Normal'], [75, 'Building'], [101, 'Euphoric']],
      'Borrowed money in brokerage accounts. Rapid growth is the fuel for a forced-selling cascade. Margin calls liquidate whatever is liquid, and Bitcoin trades 24/7.',
      'FRED BOGZ1FL663067003Q', 'quarterly', last(d.marginDebt)?.date ?? null),
  ];

  const { value: risk, share } = blend([
    [metrics[0].risk, 0.25], [metrics[1].risk, 0.20], [metrics[2].risk, 0.15],
    [metrics[3].risk, 0.20], [metrics[4].risk, 0.20],
  ]);

  return {
    key: 'equities', title: 'Stock Market Risk', weight: 0.20, metrics, risk, dataShare: share,
    color: riskColor(risk),
    status: risk == null ? 'Unavailable'
      : risk < 25 ? 'Equity Bull Intact'
      : risk < 50 ? 'Late Cycle · Watch'
      : risk < 75 ? 'Equity Stress Building'
      : 'Equity Bear Conditions',
    blurb: 'What happens to Bitcoin if equities break. Bitcoin is the most liquid asset most funds hold, which makes it the first thing sold when equity losses force a margin call.',
    coverage: 'Advance-decline line and put/call ratio are not available from any free API; small-cap breadth stands in for market internals. Margin debt is quarterly and lags by roughly one quarter.',
  };
}

function buildCredit(d: MacroTerminalData): Section {
  const hy      = last(d.hyOas);
  const hy90    = changeAbs(d.hyOas, 90);
  const ig      = last(d.igOas);
  const ccc     = last(d.cccOas);
  const cp      = cpSpread(d);
  const cpLast  = last(cp);
  const std     = last(d.lendingStd);
  const bankYoY = changePct(d.bankCredit, 365);
  const nfci    = last(d.nfci);

  const metrics = [
    metric('hy', 'High Yield Spreads',
      hy == null ? null : lin(hy.value, 2.8, 8.0),
      fmt(hy?.value ?? null, 2, '%'),
      [[25, 'Tight · Risk-On'], [50, 'Normal'], [75, 'Widening'], [101, 'Distressed']],
      'ICE BofA US High Yield OAS. The single best early warning in markets. Credit reprices risk before equities do, and well before crypto does.',
      'FRED BAMLH0A0HYM2', 'daily', hy?.date ?? null),

    metric('hymom', 'HY Spread Momentum',
      hy90 == null ? null : lin(hy90, -0.4, 1.2),
      hy90 == null ? '—' : `${hy90 >= 0 ? '+' : ''}${hy90.toFixed(2)}pp 90d`,
      [[25, 'Compressing'], [50, 'Stable'], [75, 'Widening'], [101, 'Rapid Widening']],
      'The direction matters more than the level. Spreads widening from a low base is the classic signal that the credit cycle has turned.',
      'FRED BAMLH0A0HYM2', 'daily', hy?.date ?? null),

    metric('ccc', 'CCC & Lower Spreads',
      ccc == null ? null : lin(ccc.value, 6, 16),
      fmt(ccc?.value ?? null, 2, '%'),
      [[25, 'Tight'], [50, 'Normal'], [75, 'Stressed'], [101, 'Distressed']],
      'The weakest tier of corporate borrowers. CCC spreads blow out before the broad high-yield index does, making this the sharpest edge of the credit signal.',
      'FRED BAMLH0A3HYC', 'daily', ccc?.date ?? null),

    metric('ig', 'Investment Grade Spreads',
      ig == null ? null : lin(ig.value, 0.8, 2.5),
      fmt(ig?.value ?? null, 2, '%'),
      [[25, 'Tight'], [50, 'Normal'], [75, 'Widening'], [101, 'Stressed']],
      'When high-grade credit starts repricing, stress has moved from the speculative fringe into the core of the financial system.',
      'FRED BAMLC0A0CM', 'daily', ig?.date ?? null),

    metric('cp', 'Commercial Paper Spread',
      cpLast == null ? null : lin(cpLast.value, 0.05, 0.80),
      cpLast == null ? '—' : `${cpLast.value.toFixed(2)}pp`,
      [[25, 'Normal'], [50, 'Slight Stress'], [75, 'Funding Stress'], [101, 'Acute Stress']],
      '3-month commercial paper over T-bills, a read on short-term corporate funding. This is what seized in 2008 and again in March 2020, days before everything else broke.',
      'FRED DCPN3M · DTB3', 'daily', cpLast?.date ?? null),

    metric('lending', 'Bank Lending Standards',
      std == null ? null : lin(std.value, -10, 45),
      std == null ? '—' : `${std.value >= 0 ? '+' : ''}${std.value.toFixed(1)}% net tightening`,
      [[25, 'Easing'], [50, 'Neutral'], [75, 'Tightening'], [101, 'Sharply Tightening']],
      'Net share of banks tightening business lending standards. Credit availability leads real economic activity by two to three quarters.',
      'FRED DRTSCILM', 'quarterly', std?.date ?? null),

    metric('bankcredit', 'Bank Credit Growth',
      bankYoY == null ? null : lin(bankYoY, 8, -1),
      `${fmtPct(bankYoY)} YoY`,
      [[25, 'Expanding'], [50, 'Moderate'], [75, 'Stalling'], [101, 'Contracting']],
      'Total credit extended by commercial banks. Bank credit contracting outright is rare and has never been a good backdrop for risk assets.',
      'FRED TOTBKCR', 'weekly', last(d.bankCredit)?.date ?? null),

    metric('nfci', 'Financial Conditions',
      nfci == null ? null : lin(nfci.value, -0.7, 0.6),
      nfci == null ? '—' : nfci.value.toFixed(2),
      [[25, 'Loose'], [50, 'Neutral'], [75, 'Tightening'], [101, 'Tight']],
      'Chicago Fed National Financial Conditions Index, 105 measures of risk, credit and leverage in one number. Below zero is looser than average.',
      'FRED NFCI', 'weekly', nfci?.date ?? null),
  ];

  const { value: risk, share } = blend([
    [metrics[0].risk, 0.20], [metrics[1].risk, 0.20], [metrics[2].risk, 0.10],
    [metrics[3].risk, 0.10], [metrics[4].risk, 0.10], [metrics[5].risk, 0.10],
    [metrics[6].risk, 0.10], [metrics[7].risk, 0.10],
  ]);

  return {
    key: 'credit', title: 'Credit Markets', weight: 0.20, metrics, risk, dataShare: share,
    color: riskColor(risk),
    status: risk == null ? 'Unavailable'
      : risk < 25 ? 'Credit Healthy'
      : risk < 50 ? 'Credit Normal'
      : risk < 75 ? 'Credit Stress Building'
      : 'Credit Stress Acute',
    blurb: 'Institutions watch credit before they watch equities. Credit markets price default risk in real time, and they have turned ahead of every major risk-asset drawdown.',
    coverage: 'Credit default swaps and corporate default rates require paid data and are excluded.',
  };
}

function buildDollar(d: MacroTerminalData): Section {
  const dxyLast  = last(d.dxy);
  const dxy90    = changePct(d.dxy, 90);
  const dxy200d  = sma(d.dxy, 200);
  const dxyVs200 = dxyLast && dxy200d ? ((dxyLast.value - dxy200d) / dxy200d) * 100 : null;
  const real     = last(d.realYield10y);
  const real90   = changeAbs(d.realYield10y, 90);
  const curve    = last(d.yieldCurve);
  const y30      = last(d.ust30y);
  const y10      = last(d.ust10y);

  const metrics = [
    metric('dxy90', 'Dollar Momentum',
      dxy90 == null ? null : lin(dxy90, -4, 4),
      `${fmtPct(dxy90)} 90d`,
      [[25, 'Weakening · Tailwind'], [50, 'Flat'], [75, 'Strengthening'], [101, 'Surging · Headwind']],
      'A rising dollar tightens conditions everywhere outside the US and drains offshore liquidity. It is the most reliable inverse relationship Bitcoin has.',
      'FRED DTWEXBGS', 'daily', dxyLast?.date ?? null),

    metric('dxytrend', 'Dollar Trend',
      dxyVs200 == null ? null : lin(dxyVs200, -5, 5),
      dxyVs200 == null ? '—' : `${fmtPct(dxyVs200)} vs 200D`,
      [[25, 'Downtrend'], [50, 'Neutral'], [75, 'Uptrend'], [101, 'Strong Uptrend']],
      'Where the broad dollar sits against its own trend. Sustained dollar uptrends have coincided with every major Bitcoin drawdown.',
      'FRED DTWEXBGS', 'daily', dxyLast?.date ?? null),

    metric('realyield', '10Y Real Yield',
      real == null ? null : lin(real.value, -0.5, 2.5),
      fmt(real?.value ?? null, 2, '%'),
      [[25, 'Negative · Supportive'], [50, 'Low'], [75, 'Restrictive'], [101, 'Highly Restrictive']],
      'The 10-year TIPS yield: what cash earns after inflation. High real yields give capital a risk-free alternative to a non-yielding asset like Bitcoin.',
      'FRED DFII10', 'daily', real?.date ?? null),

    metric('realmom', 'Real Yield Momentum',
      real90 == null ? null : lin(real90, -0.5, 0.5),
      real90 == null ? '—' : `${real90 >= 0 ? '+' : ''}${real90.toFixed(2)}pp 90d`,
      [[25, 'Falling'], [50, 'Stable'], [75, 'Rising'], [101, 'Rising Fast']],
      'Rising real yields are a tightening impulse regardless of what the Fed says it is doing. This is often the mechanism behind sudden risk-asset repricings.',
      'FRED DFII10', 'daily', real?.date ?? null),

    metric('curve', 'Yield Curve (10Y−2Y)',
      curve == null ? null : lin(curve.value, 1.6, -0.6),
      curve == null ? '—' : `${curve.value >= 0 ? '+' : ''}${curve.value.toFixed(2)}%`,
      [[25, 'Normal · Healthy'], [50, 'Flattening'], [75, 'Near Flat'], [101, 'Inverted']],
      'Inversion has preceded every US recession since 1955. The dangerous phase is the re-steepening that follows, which is typically when the damage shows up in markets.',
      'FRED T10Y2Y', 'daily', curve?.date ?? null),

    metric('long', 'Long-End Yields',
      y30 == null ? null : lin(y30.value, 3.0, 6.0),
      y30 == null ? '—' : `30Y ${y30.value.toFixed(2)}%${y10 ? ` · 10Y ${y10.value.toFixed(2)}%` : ''}`,
      [[25, 'Low'], [50, 'Moderate'], [75, 'Elevated'], [101, 'Restrictive']],
      'The 30-year is the market\'s verdict on long-run inflation and fiscal credibility. Rising long-end yields raise the discount rate applied to every long-duration asset.',
      'FRED DGS30 · DGS10', 'daily', y30?.date ?? null),
  ];

  const { value: risk, share } = blend([
    [metrics[0].risk, 0.25], [metrics[1].risk, 0.15], [metrics[2].risk, 0.20],
    [metrics[3].risk, 0.15], [metrics[4].risk, 0.15], [metrics[5].risk, 0.10],
  ]);

  return {
    key: 'dollar', title: 'Dollar & Rates', weight: 0.15, metrics, risk, dataShare: share,
    color: riskColor(risk),
    status: risk == null ? 'Unavailable'
      : risk < 25 ? 'Weak Dollar · Tailwind'
      : risk < 50 ? 'Dollar Neutral'
      : risk < 75 ? 'Dollar Firm · Headwind'
      : 'Strong Dollar · Headwind',
    blurb: 'The dollar is the denominator for every risk asset on earth. Strong dollar and high real yields work against Bitcoin; a weakening dollar has accompanied every major advance.',
    coverage: null,
  };
}

function buildVolatility(d: MacroTerminalData): Section {
  const vixLast = last(d.vix);
  const vixPct  = vixLast ? percentile(d.vix, vixLast.value) : null;
  const vxnLast = last(d.vxn);
  const vxnPct  = vxnLast ? percentile(d.vxn, vxnLast.value) : null;
  const mvLast  = last(d.move);
  const mvPct   = mvLast ? percentile(d.move, mvLast.value) : null;
  const ovxLast = last(d.ovx);
  const ovxPct  = ovxLast ? percentile(d.ovx, ovxLast.value) : null;
  const gvzLast = last(d.gvz);
  const gvzPct  = gvzLast ? percentile(d.gvz, gvzLast.value) : null;

  const metrics = [
    metric('vix', 'Equity Volatility (VIX)',
      vixPct,
      vixLast == null ? '—' : `${vixLast.value.toFixed(1)}${vixPct != null ? ` · ${ordinal(vixPct)} pct` : ''}`,
      [[25, 'Calm'], [50, 'Normal'], [75, 'Elevated'], [101, 'Panic']],
      'Scored by where it sits in its own history since 2006. Volatility spikes force risk-parity and volatility-targeting funds to cut exposure mechanically, across every asset they hold.',
      'FRED VIXCLS', 'daily', vixLast?.date ?? null),

    metric('move', 'Bond Volatility (MOVE)',
      mvPct,
      mvLast == null ? '—' : `${mvLast.value.toFixed(0)}${mvPct != null ? ` · ${ordinal(mvPct)} pct` : ''}`,
      [[25, 'Calm'], [50, 'Normal'], [75, 'Elevated'], [101, 'Stressed']],
      'Treasury market volatility. Bonds are the collateral underneath the whole financial system. When their volatility rises, collateral gets haircut and leverage unwinds everywhere.',
      'Yahoo ^MOVE', 'weekly', mvLast?.date ?? null),

    metric('vxn', 'Tech Volatility (VXN)',
      vxnPct,
      vxnLast == null ? '—' : `${vxnLast.value.toFixed(1)}${vxnPct != null ? ` · ${ordinal(vxnPct)} pct` : ''}`,
      [[25, 'Calm'], [50, 'Normal'], [75, 'Elevated'], [101, 'Panic']],
      'Nasdaq-100 implied volatility. The closest listed analogue to Bitcoin\'s own risk profile.',
      'FRED VXNCLS', 'daily', vxnLast?.date ?? null),

    metric('ovx', 'Oil Volatility (OVX)',
      ovxPct,
      ovxLast == null ? '—' : `${ovxLast.value.toFixed(1)}${ovxPct != null ? ` · ${ordinal(ovxPct)} pct` : ''}`,
      [[25, 'Calm'], [50, 'Normal'], [75, 'Elevated'], [101, 'Shock']],
      'Crude oil implied volatility. Energy shocks feed straight into inflation expectations and, from there, into how restrictive central banks have to be.',
      'FRED OVXCLS', 'daily', ovxLast?.date ?? null),

    metric('gvz', 'Gold Volatility (GVZ)',
      gvzPct,
      gvzLast == null ? '—' : `${gvzLast.value.toFixed(1)}${gvzPct != null ? ` · ${ordinal(gvzPct)} pct` : ''}`,
      [[25, 'Calm'], [50, 'Normal'], [75, 'Elevated'], [101, 'Stressed']],
      'Gold implied volatility. Rising gold vol alongside rising equity vol usually means the market is repricing monetary policy itself, not just growth.',
      'FRED GVZCLS', 'daily', gvzLast?.date ?? null),
  ];

  const { value: risk, share } = blend([
    [metrics[0].risk, 0.35], [metrics[1].risk, 0.25], [metrics[2].risk, 0.15],
    [metrics[3].risk, 0.15], [metrics[4].risk, 0.10],
  ]);

  return {
    key: 'volatility', title: 'Volatility', weight: 0.10, metrics, risk, dataShare: share,
    color: riskColor(risk),
    status: risk == null ? 'Unavailable'
      : risk < 25 ? 'Calm · Risk-On'
      : risk < 50 ? 'Normal'
      : risk < 75 ? 'Elevated · Caution'
      : 'Risk-Off',
    blurb: 'Volatility is the transmission mechanism. Whatever the shock, it reaches Bitcoin through forced position reduction, and volatility is what forces it.',
    coverage: 'Currency volatility (EVZ) was discontinued in 2025 and is excluded.',
  };
}

function buildPsychology(d: MacroTerminalData, fearGreed: number | null): Section {
  const spxLast  = last(d.spx);
  const spx200d  = sma(d.spx, 200);
  const froth    = spxLast && spx200d ? ((spxLast.value - spx200d) / spx200d) * 100 : null;

  const hy       = last(d.hyOas);
  const hyPct    = hy ? percentile(d.hyOas, hy.value) : null;

  const stableSeries: Pt[] = d.stablecoins.map(p => ({ date: p.time, value: p.stablecoinMC }));
  const stable30 = changePct(stableSeries, 30);

  const metrics = [
    metric('fng', 'Crypto Fear & Greed',
      fearGreed,
      fearGreed == null ? '—' : `${fearGreed.toFixed(0)} / 100`,
      [[25, 'Extreme Fear'], [50, 'Fear'], [75, 'Greed'], [101, 'Extreme Greed']],
      'Read as a contrarian gauge: greed is when risk is highest and fear is when it has already been priced. Scored directly, so greed raises macro risk.',
      'alternative.me', 'daily', null),

    metric('froth', 'Equity Extension',
      froth == null ? null : lin(froth, -2, 22),
      froth == null ? '—' : `${fmtPct(froth)} above 200D`,
      [[25, 'Grounded'], [50, 'Normal'], [75, 'Extended'], [101, 'Frothy']],
      'How far the S&P has run above its own 200-day average. Stretched markets have further to fall when the catalyst finally arrives.',
      'FRED SP500', 'daily', spxLast?.date ?? null),

    metric('complacency', 'Credit Complacency',
      hyPct == null ? null : clamp(100 - hyPct, 0, 100),
      hyPct == null ? '—' : `HY at ${ordinal(hyPct)} pct of history`,
      [[25, 'Risk Priced In'], [50, 'Balanced'], [75, 'Complacent'], [101, 'Very Complacent']],
      'Spreads at historic tights mean investors are being paid almost nothing to take default risk. That is the condition from which spreads widen, not narrow.',
      'FRED BAMLH0A0HYM2', 'daily', hy?.date ?? null),

    metric('drypowder', 'Sidelined Capital',
      stable30 == null ? null : lin(stable30, 5, -3),
      `${fmtPct(stable30)} 30d`,
      [[25, 'Building'], [50, 'Flat'], [75, 'Declining'], [101, 'Leaving']],
      'Stablecoin supply over the last month. Growing balances mean buyers are waiting; shrinking balances mean capital is exiting the asset class rather than rotating within it.',
      'DeFiLlama', 'daily', d.stablecoins.at(-1)?.time ?? null),
  ];

  const { value: risk, share } = blend([
    [metrics[0].risk, 0.35], [metrics[1].risk, 0.25],
    [metrics[2].risk, 0.20], [metrics[3].risk, 0.20],
  ]);

  return {
    key: 'psychology', title: 'Market Psychology', weight: 0.05, metrics, risk, dataShare: share,
    color: riskColor(risk),
    status: risk == null ? 'Unavailable'
      : risk < 25 ? 'Fear · Contrarian Positive'
      : risk < 50 ? 'Balanced'
      : risk < 75 ? 'Complacent'
      : 'Speculative Excess',
    blurb: 'Positioning and sentiment do not cause moves, but they set how violent one becomes. Crowded, complacent markets fall harder than fearful ones.',
    coverage: 'AAII survey, CNN Fear & Greed, put/call ratio and Google Trends have no free API and are excluded.',
  };
}

// ── Correlations ──────────────────────────────────────────────────────────────

export type CorrelationRow = {
  label:   string;
  short:   number | null;   // 13-week
  long:    number | null;   // 52-week
  note:    string;
};

/** Resample to weekly (Friday-ish) by taking the last observation of each ISO week. */
function toWeekly(s: Pt[]): Pt[] {
  const byWeek = new Map<string, Pt>();
  for (const p of s) {
    const d = new Date(p.date + 'T00:00:00Z');
    const day = d.getUTCDay();
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    byWeek.set(monday.toISOString().slice(0, 10), p);
  }
  return [...byWeek.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([week, p]) => ({ date: week, value: p.value }));
}

function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 8) return null;
  const xs = a.slice(-n), ys = b.slice(-n);
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a_ = xs[i] - mx, b_ = ys[i] - my;
    num += a_ * b_; dx += a_ * a_; dy += b_ * b_;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Weekly log returns for dates present in both series. */
function alignedReturns(a: Pt[], b: Pt[], weeks: number): [number[], number[]] {
  const wa = toWeekly(a), wb = toWeekly(b);
  const mb = new Map(wb.map(p => [p.date, p.value]));
  const dates: string[] = [];
  const va: number[] = [], vb: number[] = [];
  for (const p of wa) {
    const other = mb.get(p.date);
    if (other == null || other <= 0 || p.value <= 0) continue;
    dates.push(p.date); va.push(p.value); vb.push(other);
  }
  const ra: number[] = [], rb: number[] = [];
  for (let i = 1; i < va.length; i++) {
    ra.push(Math.log(va[i] / va[i - 1]));
    rb.push(Math.log(vb[i] / vb[i - 1]));
  }
  return [ra.slice(-weeks), rb.slice(-weeks)];
}

function corr(a: Pt[], b: Pt[], weeks: number): number | null {
  if (!a.length || !b.length) return null;
  const [ra, rb] = alignedReturns(a, b, weeks);
  return pearson(ra, rb);
}

export function buildCorrelations(d: MacroTerminalData): CorrelationRow[] {
  const net = fedNetLiquidity(d);
  const defs: Array<[string, Pt[], string]> = [
    ['BTC vs S&P 500',       d.spx,    'The headline risk-asset relationship. Above 0.6 means Bitcoin is trading as leveraged equity beta, not as an independent asset.'],
    ['BTC vs Nasdaq',        d.nasdaq, 'Bitcoin\'s tightest equity relationship. Tends to run above the S&P correlation through risk-on and risk-off alike.'],
    ['BTC vs Gold',          d.gold,   'Rises when the market treats Bitcoin as a monetary hedge rather than a risk asset, historically a late-cycle-bottom characteristic.'],
    ['BTC vs Dollar (DXY)',  d.dxy,    'Normally negative. A move toward zero or positive means dollar strength has stopped being the dominant driver.'],
    ['BTC vs Net Liquidity', net,      'Against Fed net liquidity. The relationship that best explains multi-month Bitcoin trends, though it is noisy week to week.'],
  ];
  return defs.map(([label, series, note]) => ({
    label,
    short: corr(d.btc, series, 13),
    long:  corr(d.btc, series, 52),
    note,
  }));
}

// ── Composite ─────────────────────────────────────────────────────────────────

export type MacroRiskResult = {
  score:      number | null;
  band:       ReturnType<typeof riskBand>;
  color:      string;
  headline:   string;
  sections:   Section[];
  correlations: CorrelationRow[];
  /** Probability-style framing: how strongly macro is pushing against Bitcoin. */
  impact:     { direction: 'headwind' | 'tailwind' | 'neutral'; strength: number };
  /** Share of total intended weight that had live data behind it, 0–1. */
  coverage:   number;
  /** True when coverage is too thin for the score to be read at face value. */
  provisional: boolean;
  /** Sections that returned nothing at all, named so the gap is visible. */
  missing:    string[];
  asOf:       string;
};

export function computeMacroRisk(
  d: MacroTerminalData,
  fearGreed: number | null,
): MacroRiskResult {
  const sections: Section[] = [
    buildLiquidity(d),
    buildEquities(d),
    buildCredit(d),
    buildDollar(d),
    buildVolatility(d),
    buildPsychology(d, fearGreed),
  ];

  const raw = blend(sections.map(s => [s.risk, s.weight] as [number | null, number])).value;
  const score = raw == null ? null : Math.round(raw);

  // Coverage counts missing metrics inside a section, not just missing sections:
  // a "Liquidity" score built from one of four inputs is not 30% of the picture.
  const coverage = sections.reduce((acc, s) => acc + s.weight * s.dataShare, 0);
  const provisional = coverage < 0.6;
  const missing = sections.filter(s => s.risk == null).map(s => s.title);

  const headline =
    score == null                  ? 'Macro data unavailable'
    : provisional                  ? 'Partial macro data: score is provisional'
    : score >= 70                  ? 'Macro environment is working AGAINST Bitcoin'
    : score >= 55                  ? 'Macro environment is leaning against Bitcoin'
    : score >= 45                  ? 'Macro environment is broadly NEUTRAL for Bitcoin'
    : score >= 30                  ? 'Macro environment is leaning in Bitcoin\'s favour'
    :                                'Macro environment is working FOR Bitcoin';

  // 50 is neutral; distance from it becomes headwind/tailwind strength.
  const impact: MacroRiskResult['impact'] = score == null
    ? { direction: 'neutral', strength: 0 }
    : score > 52 ? { direction: 'headwind', strength: Math.round(clamp((score - 50) * 2, 0, 100)) }
    : score < 48 ? { direction: 'tailwind', strength: Math.round(clamp((50 - score) * 2, 0, 100)) }
    :              { direction: 'neutral', strength: 0 };

  return {
    score,
    band:  riskBand(score),
    color: riskColor(score),
    headline,
    sections,
    correlations: buildCorrelations(d),
    impact,
    coverage,
    provisional,
    missing,
    asOf: d.fetchedAt,
  };
}
