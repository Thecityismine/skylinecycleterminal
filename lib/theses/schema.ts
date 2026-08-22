// Thesis register — the pure half.
//
// Most analysts make calls and quietly forget the ones that age badly. This is
// the structural fix: every thesis carries its invalidation criteria, written
// before the fact, and the ones that turn out wrong stay visible.
//
// The part that is only possible because the observation store exists: an
// invalidation condition can be a machine-checkable rule against a stored
// metric, evaluated every morning by the same cron that records the snapshot.
// You find out that a thesis broke on the day it broke, rather than three
// months later when you happen to reread it.
//
// Types and rule evaluation live here, apart from the Firestore IO in
// ./theses.ts, because the editor is a client component and importing anything
// that reaches firebase-admin drags google-auth-library into the browser
// bundle. Anything in this file must stay free of server-only imports.

// ─── Status ───────────────────────────────────────────────────────────────────
//
// "Invalidated" and "resolved wrong" are deliberately separate. The first means
// a pre-registered condition tripped, which is the system working. The second
// means the call was simply wrong. Collapsing them would hide the difference
// between disciplined and lucky.

export const THESIS_STATUSES = [
  { key: 'active',         label: 'Active',         note: 'Open, being tracked' },
  { key: 'invalidated',    label: 'Invalidated',    note: 'A pre-registered invalidation condition tripped' },
  { key: 'resolved_right', label: 'Played out',     note: 'Closed, and it happened' },
  { key: 'resolved_wrong', label: 'Wrong',          note: 'Closed, and it did not' },
  { key: 'retired',        label: 'Retired',        note: 'Withdrawn before resolution, superseded or no longer relevant' },
] as const;

export type ThesisStatus = (typeof THESIS_STATUSES)[number]['key'];

export function statusLabel(s: ThesisStatus): string {
  return THESIS_STATUSES.find((x) => x.key === s)?.label ?? s;
}

export function isThesisStatus(v: unknown): v is ThesisStatus {
  return typeof v === 'string' && THESIS_STATUSES.some((s) => s.key === v);
}

export const CONVICTIONS = ['low', 'medium', 'high'] as const;
export type Conviction = (typeof CONVICTIONS)[number];

export function isConviction(v: unknown): v is Conviction {
  return typeof v === 'string' && (CONVICTIONS as readonly string[]).includes(v);
}

// ─── Invalidation rules ───────────────────────────────────────────────────────

export const OPERATORS = [
  { key: 'gt',  label: 'rises above' },
  { key: 'lt',  label: 'falls below' },
  { key: 'gte', label: 'reaches or exceeds' },
  { key: 'lte', label: 'reaches or falls below' },
] as const;

export type Operator = (typeof OPERATORS)[number]['key'];

export function isOperator(v: unknown): v is Operator {
  return typeof v === 'string' && OPERATORS.some((o) => o.key === v);
}

export function operatorLabel(o: Operator): string {
  return OPERATORS.find((x) => x.key === o)?.label ?? o;
}

export type InvalidationRule = {
  id:      string;
  /** A metric id from the observation store, e.g. "cycle_score". */
  metric:  string;
  operator: Operator;
  value:   number;
  /**
   * Consecutive days the condition must hold before the rule trips.
   *
   * One day is noise. A thesis about a multi-year cycle should not break
   * because a metric spiked for an afternoon, and requiring persistence is the
   * difference between a rule that informs and one that cries wolf.
   */
  sustainedDays: number;
  note?:   string;
};

export type Thesis = {
  id:        string;
  title:     string;
  asset:     string;          // BTC, ETH, SOL, macro
  /** What the world looked like when this was written. Price, score, date. */
  entryContext: string;
  horizon:   string;          // free text: "2 to 4 years"
  conviction: Conviction;
  bullCase:  string;
  baseCase:  string;
  bearCase:  string;
  catalysts: string[];
  risks:     string[];
  /** Invalidation that no stored metric can express. Written in prose, checked
   *  by a human at review time. */
  invalidationNotes: string;
  /** Invalidation that a metric can express, checked every morning. */
  rules:     InvalidationRule[];
  status:    ThesisStatus;
  statusNote: string;
  statusChangedAt: string;
  reviews:   ThesisReview[];
  createdAt: string;
  updatedAt: string;
};

export type ThesisReview = {
  date:       string;         // YYYY-MM-DD
  note:       string;
  conviction: Conviction;
  recordedAt: string;
};

export const COLLECTION = 'theses';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function utcDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Human-readable form of a rule, for the UI and for alert text. */
export function describeRule(r: InvalidationRule): string {
  const sustain = r.sustainedDays > 1 ? ` for ${r.sustainedDays} consecutive days` : '';
  return `${r.metric} ${operatorLabel(r.operator)} ${r.value}${sustain}`;
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

export type MetricPoint = { metricDate: string; value: number };

export type RuleBreach = {
  ruleId:      string;
  metric:      string;
  description: string;
  /** How many consecutive days, ending at the newest reading, the condition holds. */
  streak:      number;
  required:    number;
  latestValue: number | null;
  latestDate:  string | null;
  /** streak >= required. The rule has actually tripped. */
  tripped:     boolean;
  /** No data for this metric, so the rule could not be checked. Not the same
   *  as passing, and reported separately so a silent gap is visible. */
  unchecked:   boolean;
};

function holds(value: number, op: Operator, target: number): boolean {
  switch (op) {
    case 'gt':  return value >  target;
    case 'lt':  return value <  target;
    case 'gte': return value >= target;
    case 'lte': return value <= target;
  }
}

/**
 * Check one rule against a metric series.
 *
 * The series must be ascending by metricDate. The streak is counted backwards
 * from the newest reading, so a condition that held last month but has since
 * recovered does not trip. That is intentional: an invalidation condition is
 * about the state now, not about whether it ever happened.
 */
export function evaluateRule(rule: InvalidationRule, series: MetricPoint[]): RuleBreach {
  const base = {
    ruleId:      rule.id,
    metric:      rule.metric,
    description: describeRule(rule),
    required:    rule.sustainedDays,
  };

  if (!series.length) {
    return { ...base, streak: 0, latestValue: null, latestDate: null, tripped: false, unchecked: true };
  }

  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (holds(series[i].value, rule.operator, rule.value)) streak += 1;
    else break;
  }

  const last = series[series.length - 1];
  return {
    ...base,
    streak,
    latestValue: last.value,
    latestDate:  last.metricDate,
    tripped:     streak >= Math.max(1, rule.sustainedDays),
    unchecked:   false,
  };
}

export type ThesisEvaluation = {
  thesisId:  string;
  title:     string;
  breaches:  RuleBreach[];
  /** Any rule tripped. The thesis needs a human decision. */
  tripped:   boolean;
  /** Some rule had no data. Worth surfacing so gaps are not mistaken for health. */
  unchecked: boolean;
};

export function evaluateThesis(
  thesis: Thesis,
  seriesByMetric: Record<string, MetricPoint[]>,
): ThesisEvaluation {
  const breaches = (thesis.rules ?? []).map((r) =>
    evaluateRule(r, seriesByMetric[r.metric] ?? []),
  );
  return {
    thesisId:  thesis.id,
    title:     thesis.title,
    breaches,
    tripped:   breaches.some((b) => b.tripped),
    unchecked: breaches.some((b) => b.unchecked),
  };
}

/** Every distinct metric the given theses reference, so the caller can fetch
 *  each series once rather than once per rule. */
export function metricsReferencedBy(theses: Thesis[]): string[] {
  const out = new Set<string>();
  for (const t of theses) for (const r of t.rules ?? []) out.add(r.metric);
  return [...out];
}

// ─── Track record ─────────────────────────────────────────────────────────────

export type TrackRecord = {
  total:     number;
  active:    number;
  right:     number;
  wrong:     number;
  invalidated: number;
  retired:   number;
  /** Right / (right + wrong). Null until at least one thesis has resolved.
   *  Invalidated theses are excluded: a pre-registered condition tripping is
   *  the process working, not a failed call. */
  hitRate:   number | null;
};

export function trackRecord(theses: Thesis[]): TrackRecord {
  const count = (s: ThesisStatus) => theses.filter((t) => t.status === s).length;
  const right = count('resolved_right');
  const wrong = count('resolved_wrong');
  const resolved = right + wrong;
  return {
    total:       theses.length,
    active:      count('active'),
    right,
    wrong,
    invalidated: count('invalidated'),
    retired:     count('retired'),
    hitRate:     resolved > 0 ? Math.round((right / resolved) * 100) : null,
  };
}
