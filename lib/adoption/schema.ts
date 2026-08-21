// Institutional Adoption Index — the pure half.
//
// Types, taxonomy and the derived series live here, apart from the Firestore IO
// in ./initiatives.ts. The split is load-bearing rather than tidiness: the admin
// editor is a client component and needs the stage ladder and the category
// lists, and importing those from a module that reaches firebase-admin drags
// google-auth-library into the browser bundle and fails the build.
//
// Anything in this file must stay free of server-only imports.

// ─── Stage ladder ─────────────────────────────────────────────────────────────
//
// The ladder is what turns a folder of press clippings into a time series. An
// announcement is not data. An announcement that moves from Pilot to Production
// on a known date is, because it can be counted, charted against price, and
// compared to the same month a year earlier.

export const STAGES = [
  { value: 0, key: 'rumor',      label: 'Rumor',      note: 'Reported, unconfirmed by the institution' },
  { value: 1, key: 'research',   label: 'Research',   note: 'Publicly exploring, no commitment' },
  { value: 2, key: 'announced',  label: 'Announced',  note: 'Committed publicly, nothing running yet' },
  { value: 3, key: 'pilot',      label: 'Pilot',      note: 'Running with limited scope or capital' },
  { value: 4, key: 'production', label: 'Production', note: 'Live with real clients or real money' },
  { value: 5, key: 'expansion',  label: 'Expansion',  note: 'Materially scaled beyond the initial launch' },
] as const;

export type Stage = (typeof STAGES)[number]['value'];

/** Stage 4 and above is what "live" means when counting the index. */
export const LIVE_STAGE = 4;

export function stageLabel(s: Stage): string {
  return STAGES.find((x) => x.value === s)?.label ?? String(s);
}

export function isStage(v: unknown): v is Stage {
  return typeof v === 'number' && STAGES.some((s) => s.value === v);
}

// ─── Verification ─────────────────────────────────────────────────────────────
//
// The second axis, and the one that stops this being a press-release counter.
// Stage says how far an institution claims to have gone. Verification says how
// much of that claim can be checked without taking their word for it.
//
// $5bn of BUIDL visible on Ethereum and a bank saying it is "exploring
// blockchain" are not the same evidence, and an index that counts them equally
// measures announcements rather than migration.

export const VERIFICATIONS = [
  {
    key: 'onchain_public',
    label: 'Public chain',
    weight: 1.0,
    note: 'Contracts are public. Supply, holders and transfers can be checked independently.',
  },
  {
    key: 'onchain_private',
    label: 'Private chain',
    weight: 0.8,
    note: 'Genuinely running on-chain, but on a permissioned network only the operator can see.',
  },
  {
    key: 'issuer_attested',
    label: 'Issuer reported',
    weight: 0.7,
    note: 'Institution publishes figures (AUM, volume) but the ledger cannot be inspected.',
  },
  {
    key: 'press_only',
    label: 'Press release',
    weight: 0.5,
    note: 'Nothing observable. The claim is the only evidence.',
  },
] as const;

export type Verification = (typeof VERIFICATIONS)[number]['key'];

export function isVerification(v: unknown): v is Verification {
  return typeof v === 'string' && VERIFICATIONS.some((x) => x.key === v);
}

export function verificationLabel(v: Verification): string {
  return VERIFICATIONS.find((x) => x.key === v)?.label ?? v;
}

/**
 * How much each stage counts toward the weighted index.
 *
 * Deliberately not linear. The gap between a pilot and a production launch is
 * the one that matters, so it is the one with the biggest step. Expansion goes
 * above 1.0 because scaling a live product is more evidence than launching it,
 * and the index is a weighted count rather than a percentage.
 */
export const STAGE_WEIGHT: Record<Stage, number> = {
  0: 0.05,
  1: 0.10,
  2: 0.20,
  3: 0.40,
  4: 1.00,
  5: 1.20,
};

export function verificationWeight(v: Verification): number {
  return VERIFICATIONS.find((x) => x.key === v)?.weight ?? 0.5;
}

/**
 * Stage and verification kept as separate multipliers rather than collapsed
 * into one scale. Collapsing them double-counts, because "pilot" and
 * "announcement" already live on the stage axis. Separating them also means a
 * pilot you can verify on-chain outranks a production launch you cannot, which
 * is the correct ordering and is not expressible on a single scale.
 */
export function initiativeWeight(stage: Stage, verification: Verification): number {
  return STAGE_WEIGHT[stage] * verificationWeight(verification);
}

// ─── Taxonomy ─────────────────────────────────────────────────────────────────

export const INSTITUTION_TYPES = [
  'bank', 'asset_manager', 'corporate', 'sovereign', 'exchange', 'infrastructure',
] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const CATEGORIES = [
  'tokenization', 'custody', 'settlement', 'treasury', 'etf', 'payments', 'stablecoin', 'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

// ─── Types ────────────────────────────────────────────────────────────────────
//
// Two dates per stage event, for the same reason lib/store/observations.ts
// keeps two: `date` is when the institution reached the stage and is what the
// chart plots; `recordedAt` is when Skyline learned of it, and is what stops a
// hand-backfilled 2023 entry from claiming Skyline saw it in 2023.

export type StageEvent = {
  stage:      Stage;
  /** YYYY-MM-DD, when the institution reached this stage. Not when it was typed in. */
  date:       string;
  sourceUrl:  string;
  note?:      string;
  /** ISO timestamp, when this event was entered into Skyline. */
  recordedAt: string;
};

export type Initiative = {
  id:              string;          // slug, e.g. "blackrock-buidl"
  institution:     string;
  institutionType: InstitutionType;
  name:            string;          // the initiative itself, e.g. "BUIDL"
  category:        Category;
  /** Parent programme, where an institution runs several under one banner.
   *  Kinexys is the obvious case: JPM Coin, on-chain FX, tokenized collateral
   *  and tokenized money-market funds are separate initiatives at different
   *  stages, and collapsing them into one row throws that information away. */
  program:         string | null;
  /** How much of the claim can be checked without taking the issuer's word. */
  verification:    Verification;
  /** What can actually be measured: "AUM, supply, holders" or "transaction
   *  volume". Null when nothing is observable yet, which is itself the point. */
  observableMetric: string | null;
  /** Which chain it settles on. This is the field that tests the claim that
   *  most tokenization is landing on Ethereum, using your own count. */
  chain:           string | null;
  asset:           string | null;
  partner:         string | null;
  country:         string | null;
  valueUsd:        number | null;
  summary:         string;          // one plain-text line
  /** Current stage, denormalised from the newest history entry so the ledger can
   *  be filtered and sorted without unpacking every document. */
  stage:           Stage;
  stageDate:       string;
  history:         StageEvent[];    // ascending by date
  createdAt:       string;
  updatedAt:       string;
};

export type InitiativeInput = {
  id?:             string;
  institution:     string;
  institutionType: InstitutionType;
  name:            string;
  category:        Category;
  program:         string | null;
  verification:    Verification;
  observableMetric: string | null;
  chain:           string | null;
  asset:           string | null;
  partner:         string | null;
  country:         string | null;
  valueUsd:        number | null;
  summary:         string;
  initialStage:    Stage;
  initialDate:     string;
  sourceUrl:       string;
  note?:           string;
};

export const COLLECTION = 'initiatives';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function utcDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Stable, readable document id. Two initiatives from the same institution need
 *  distinct names, which is a reasonable thing to ask of the person typing. */
export function slugify(institution: string, name: string): string {
  return (institution + '-' + name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function sortHistory(h: StageEvent[]): StageEvent[] {
  return [...h].sort((a, b) => (a.date === b.date ? a.stage - b.stage : a.date.localeCompare(b.date)));
}

/** The newest entry decides the current stage, not the highest one. An
 *  initiative can be wound back, and taking the maximum would only ever
 *  inflate the index. */
export function currentFrom(history: StageEvent[]): { stage: Stage; stageDate: string } {
  const sorted = sortHistory(history);
  const last = sorted[sorted.length - 1];
  return { stage: last.stage, stageDate: last.date };
}

// ─── The index itself ─────────────────────────────────────────────────────────

export type IndexPoint = {
  date:     string;
  live:     number;   // initiatives at stage >= LIVE_STAGE on that date
  total:    number;   // initiatives at any stage on that date
  /**
   * The number worth charting. Sums stage weight times verification weight
   * across every initiative, so scaling a public on-chain product moves it far
   * more than another bank announcing it is exploring blockchain.
   *
   * `live` is a headcount and will drift upward with press-release volume alone.
   * `weighted` only moves when something actually migrates.
   */
  weighted: number;
};

/**
 * The countable series: for every date on which anything changed, how many
 * initiatives were live and how many existed at all.
 *
 * Derived from the stage histories rather than stored, because it is a pure
 * function of them and a stored copy would be one more thing that can drift.
 * The number of points is bounded by the number of stage transitions, which
 * stays small enough for this to be cheap for a long time.
 */
export function buildIndexSeries(initiatives: Initiative[]): IndexPoint[] {
  const dates = new Set<string>();
  for (const i of initiatives) for (const h of i.history) dates.add(h.date);

  return [...dates].sort().map((date) => {
    let live = 0;
    let total = 0;
    let weighted = 0;
    for (const i of initiatives) {
      // The stage as of this date is the newest event on or before it.
      const asOf = sortHistory(i.history).filter((h) => h.date <= date).pop();
      if (!asOf) continue;
      total += 1;
      if (asOf.stage >= LIVE_STAGE) live += 1;
      // Verification is a property of the initiative rather than of a single
      // event, so the current value is used at every date. It changes rarely,
      // and when it does it is usually because something became observable that
      // was not before, which is a change worth reflecting backwards.
      weighted += initiativeWeight(asOf.stage, i.verification ?? 'press_only');
    }
    return { date, live, total, weighted: Math.round(weighted * 100) / 100 };
  });
}

export type VerificationBreakdown = {
  verification: Verification;
  label:        string;
  count:        number;
  weighted:     number;
};

/** How much of the index rests on evidence versus on assertion. If most of the
 *  weight sits in `press_only`, the index is measuring announcements. */
export function breakdownByVerification(initiatives: Initiative[]): VerificationBreakdown[] {
  return VERIFICATIONS.map((v) => {
    const rows = initiatives.filter((i) => (i.verification ?? 'press_only') === v.key);
    return {
      verification: v.key,
      label:        v.label,
      count:        rows.length,
      weighted:     Math.round(
        rows.reduce((sum, i) => sum + initiativeWeight(i.stage, v.key), 0) * 100,
      ) / 100,
    };
  }).filter((r) => r.count > 0);
}

export type ChainBreakdown = { chain: string; live: number; total: number };

/** Live initiatives by settlement chain. The number that either supports or
 *  falsifies "most tokenization is landing on Ethereum". */
export function breakdownByChain(initiatives: Initiative[]): ChainBreakdown[] {
  const map = new Map<string, ChainBreakdown>();
  for (const i of initiatives) {
    const chain = i.chain?.trim() || 'unspecified';
    const row = map.get(chain) ?? { chain, live: 0, total: 0 };
    row.total += 1;
    if (i.stage >= LIVE_STAGE) row.live += 1;
    map.set(chain, row);
  }
  return [...map.values()].sort((a, b) => b.live - a.live || b.total - a.total);
}
