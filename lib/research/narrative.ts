import type { EvidenceLedger, EvidenceItem, Thesis } from '@/lib/research/evidence';
import { THESIS_LABEL } from '@/lib/research/evidence';

// Every phrase below is keyed by Record<Thesis, string> rather than switched on,
// so adding a band to the regime is a compile error here instead of prose that
// silently falls through to a default.

// ─── The seam ─────────────────────────────────────────────────────────────────
//
// Prose is generated from `NarrativeInput` — a bundle of already-computed facts.
// No composer is ever asked to produce a number: every figure in the report is
// calculated in `evidence.ts` / `report.ts` and passed in as text.
//
// The deterministic composer below is what ships. Swapping in a Claude-backed
// composer later means implementing this same interface and returning it from
// `getComposer()`; nothing else in the report has to change. That constraint —
// facts in, prose out — is also what would make an LLM version safe to enable.

export type NarrativeInput = {
  ledger:            EvidenceLedger;
  thesis:            Thesis;
  cycleScore:        number;
  weeksSinceAth:     number | null;
  medianWeeksToLow:  number | null;
  bottomProbability: number;
  topSupporting:     EvidenceItem[];
  topWeakening:      EvidenceItem[];
  coveragePct:       number;
};

export interface NarrativeComposer {
  readonly id: string;
  executiveSummary(input: NarrativeInput): string;
  whatTheDataSuggests(input: NarrativeInput): string;
  outlook(input: NarrativeInput): string;
  keyTakeaways(input: NarrativeInput): string[];
}

// ─── Phrase helpers ───────────────────────────────────────────────────────────

function list(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const VALUATION_PHRASE: Record<Thesis, string> = {
  accumulate:   'a historically attractive long-term valuation zone',
  build:        'the lower half of its historical valuation range',
  caution:      'the upper half of its historical valuation range',
  distribution: 'territory that has historically coincided with late-cycle extension',
};

// The band label reads as a heading ("Hold / Build"), which is wrong mid-sentence.
const REGIME_NOUN: Record<Thesis, string> = {
  accumulate:   'accumulation',
  build:        'lower-range',
  caution:      'upper-range',
  distribution: 'distribution-risk',
};

const CLOSING: Record<Thesis, string> = {
  accumulate:
    ' Taken together, the measured evidence sits closer to conditions that have historically preceded accumulation phases than to those preceding distribution, while noting that no combination of these indicators has ever identified a low in advance.',
  build:
    ' Taken together, the measured evidence sits below the midpoint of its historical range without reaching the depths that marked past cycle lows.',
  caution:
    ' Taken together, the measured evidence sits above the midpoint of its historical range without reaching the levels that marked past cycle tops.',
  distribution:
    ' Taken together, the measured evidence sits closer to conditions that have historically preceded distribution phases, though extended readings have persisted for long stretches in past cycles.',
};

const OUTLOOK_BASE: Record<Thesis, string> = {
  accumulate:
    'If current conditions persist, the historical pattern associated with these readings is a continued accumulation phase before any transition into recovery.',
  build:
    'If current conditions persist, the historical pattern associated with these readings is a market still in the lower half of its range, which historically has carried no consistent signal about when a transition arrives.',
  caution:
    'If current conditions persist, the historical pattern associated with these readings is a market in the upper half of its range, where risk has historically accumulated gradually rather than resolving quickly.',
  distribution:
    'If current conditions persist, the historical pattern associated with these readings is continued late-cycle extension, which in past cycles has preceded distribution.',
};

function balancePhrase(supporting: number, weakening: number): string {
  if (supporting === 0 && weakening === 0) return 'the evidence is currently inconclusive';
  // Callers state the counts immediately before this phrase, so it must add
  // interpretation rather than repeat them.
  if (weakening === 0) return 'the reading is unopposed within the tracked set';
  const ratio = supporting / Math.max(weakening, 1);
  if (ratio >= 2.5) return 'the balance of evidence leans clearly in one direction';
  if (ratio >= 1.2) return 'the balance of evidence leans moderately in one direction';
  if (ratio >= 0.8) return 'the evidence is close to evenly split';
  return 'the weight of evidence currently runs against the headline reading';
}

// ─── Deterministic composer ───────────────────────────────────────────────────

const deterministicComposer: NarrativeComposer = {
  id: 'deterministic-v1',

  executiveSummary(input) {
    const { ledger, thesis, cycleScore, weeksSinceAth, medianWeeksToLow, coveragePct } = input;
    const sup = ledger.supporting.length;
    const weak = ledger.weakening.length;

    const parts: string[] = [];

    parts.push(
      `Bitcoin is currently in ${VALUATION_PHRASE[thesis]}, with a Skyline Cycle Score of ${Math.round(cycleScore)} ` +
      `out of 100 placing it in the ${THESIS_LABEL[thesis].toLowerCase()} band.`,
    );

    parts.push(
      `Of ${ledger.available.length} indicators with usable data, ${sup} support the current reading and ${weak} argue against it; ` +
      `${balancePhrase(sup, weak)}.`,
    );

    if (weeksSinceAth != null && medianWeeksToLow != null) {
      parts.push(
        weeksSinceAth < medianWeeksToLow
          ? `Cycle timing places the market ${weeksSinceAth} weeks past its cycle high, short of the ${medianWeeksToLow}-week median ` +
            `high-to-low interval observed in completed cycles — the market remains inside the historical window rather than beyond it.`
          : `At ${weeksSinceAth} weeks past the cycle high, the market has now run longer than the ${medianWeeksToLow}-week median ` +
            `high-to-low interval of completed cycles.`,
      );
    }

    if (coveragePct < 90) {
      parts.push(
        `This report was assembled from ${Math.round(coveragePct)}% of the indicator weight it tracks; ` +
        `the remainder is listed under data gaps and did not contribute to any figure above.`,
      );
    }

    parts.push('This is a synthesis of measured indicators, not a forecast, and not financial advice.');

    return parts.join(' ');
  },

  whatTheDataSuggests(input) {
    const { topSupporting, topWeakening, thesis } = input;

    const supNames = topSupporting.slice(0, 4).map((i) => i.label.toLowerCase());
    const weakNames = topWeakening.slice(0, 3).map((i) => i.label.toLowerCase());

    const opening = supNames.length
      ? `The strongest evidence for the current ${REGIME_NOUN[thesis]} reading comes from ${list(supNames)}.`
      : `No indicator currently registers a strong reading in either direction.`;

    const counter = weakNames.length
      ? ` Working against it, ${list(weakNames)} ${weakNames.length === 1 ? 'sits' : 'sit'} on the opposite side of ${weakNames.length === 1 ? 'its' : 'their'} historical range.`
      : ' No indicator currently registers a meaningful reading on the opposite side.';

    return opening + counter + CLOSING[thesis];
  },

  outlook(input) {
    const { thesis, bottomProbability, topWeakening } = input;

    const base = OUTLOOK_BASE[thesis];

    const qualifier = topWeakening.length
      ? ` This reading would weaken materially if ${list(topWeakening.slice(0, 2).map((i) => i.label.toLowerCase()))} deteriorate further.`
      : ` This reading would weaken if the currently supportive indicators reverse.`;

    const prob = ` The model assigns roughly ${Math.round(bottomProbability)}% weight to the market being closer to a cycle low than to a cycle high, ` +
      `derived from indicator positioning rather than from any prediction of price.`;

    return base + qualifier + prob;
  },

  keyTakeaways(input) {
    const { ledger, thesis, weeksSinceAth, medianWeeksToLow } = input;
    const out: string[] = [];

    const strongest = [...ledger.available]
      .sort((a, b) => Math.abs(b.extension! - 50) * b.weight - Math.abs(a.extension! - 50) * a.weight)
      .slice(0, 3);

    for (const item of strongest) {
      out.push(`${item.label}: ${item.reading} — ${item.interpretation}.`);
    }

    out.push(
      `${ledger.supporting.length} of ${ledger.available.length} usable indicators support the ` +
      `${REGIME_NOUN[thesis]} reading.`,
    );

    if (weeksSinceAth != null && medianWeeksToLow != null) {
      out.push(
        `Cycle timing: week ${weeksSinceAth} since the cycle high, against a ${medianWeeksToLow}-week historical median.`,
      );
    }

    if (ledger.gaps.length) {
      out.push(`${ledger.gaps.length} tracked indicator${ledger.gaps.length === 1 ? '' : 's'} could not be computed and ${ledger.gaps.length === 1 ? 'is' : 'are'} excluded from every figure.`);
    }

    return out;
  },
};

// Returns the composer the report should use. When a Claude-backed composer is
// added it can be selected here (e.g. on ANTHROPIC_API_KEY being present)
// without touching any caller.
export function getComposer(): NarrativeComposer {
  return deterministicComposer;
}
