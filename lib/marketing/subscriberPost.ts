// The weekly subscriber-only X post.
//
// The other posts report where things stand. This one reports what MOVED, which
// is data nobody outside the terminal can see: the public site shows each
// indicator's value today, and the Deep Research report shows today's ledger,
// but the week-over-week change in an individual indicator's extension exists
// only in the observation store.
//
// That is the whole pitch of a subscriber post. Not "here is the score again,
// but paywalled" — a different cut of the data that is genuinely unavailable
// elsewhere, including on the free side of this site.
//
// Same split as the rest: every number is computed, the interpretation is
// prompted for. An automated take on why an indicator moved is exactly the kind
// of confident-sounding invention this account is positioned against.

/** Indicator name in the ledger → the page on the terminal that shows it. */
const CHART_FOR_INDICATOR: Record<string, string> = {
  'MVRV Ratio':        '/onchain',
  'Puell Multiple':    '/onchain?metric=puell',
  'NVT Signal':        '/onchain?metric=nvt',
  'Active Addresses':  '/onchain?metric=addresses',
  'Fear & Greed':      '/price/fear-greed',
  'Hash Rate Ribbon':  '/price/hash-ribbons',
  '2Y MA Multiplier':  '/price/two-year-ma',
  'Log Regression':    '/price/power-law',
  'Pi Cycle Top':      '/cycle',
  'Stablecoin Supply': '/dominance/stablecoins',
  'Reserve Risk':      '/onchain/reserve-risk',
};

export type Mover = {
  name:   string;
  from:   number;
  to:     number;
  delta:  number;
  /** The figure as displayed on the day, e.g. "1.42×". */
  reading: string | null;
};

export type SubscriberContext = {
  weekOf:      string;
  daysSpanned: number;
  scoreFrom:   number | null;
  scoreTo:     number | null;
  bottomFrom:  number | null;
  bottomTo:    number | null;
  movers:      Mover[];
};

const WRITE = '<< write this >>';

const sign = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}`;
const arrow = (n: number) => (n > 0 ? '▲' : n < 0 ? '▼' : '–');

export function buildSubscriberPost(c: SubscriberContext): string {
  const top = c.movers[0] ?? null;
  const chart = top ? CHART_FOR_INDICATOR[top.name] ?? '/cycle' : '/cycle';

  const scoreLine =
    c.scoreFrom != null && c.scoreTo != null
      ? `Skyline Score: ${Math.round(c.scoreFrom)} → ${Math.round(c.scoreTo)} (${sign(c.scoreTo - c.scoreFrom)})`
      : 'Skyline Score: not enough history yet';

  // Already 0-100, not a 0-1 fraction: report.ts clamps it to 5..95. Treating
  // it as a fraction printed "7200% → 7000%" on the first real run.
  const bottomLine =
    c.bottomFrom != null && c.bottomTo != null
      ? `Bottom probability: ${c.bottomFrom.toFixed(0)}% → ${c.bottomTo.toFixed(0)}%`
      : null;

  return [
    `SUBSCRIBER NOTE · week of ${c.weekOf}`,
    '='.repeat(52),
    '',
    '── THE POST ' + '─'.repeat(40),
    '',
    scoreLine,
    ...(bottomLine ? [bottomLine] : []),
    '',
    'The score is an average. Averages hide the part worth reading.',
    `Here is what actually moved underneath it over ${c.daysSpanned} days:`,
    '',
    ...c.movers.slice(0, 5).map((m) =>
      `  ${arrow(m.delta)} ${m.name.padEnd(20)} ${m.from.toFixed(0)} → ${m.to.toFixed(0)}  (${sign(m.delta)})`,
    ),
    '',
    top
      ? `Biggest mover: ${top.name}, ${sign(top.delta)} points of extension.${top.reading ? `\nReading now: ${top.reading}` : ''}`
      : 'No indicator moved enough this week to be worth calling out.',
    '',
    'Extension runs 0 to 100. Low is deep value, high is extended.',
    '',
    '── YOUR ANGLE ' + '─'.repeat(38),
    '',
    'Two or three sentences. Why this mover matters, or why it does not.',
    'This is the part subscribers are paying for — the numbers above are',
    'available to anyone who runs the terminal; the read is not.',
    '',
    WRITE,
    '',
    '── CHART ' + '─'.repeat(43),
    '',
    `Suggested: skylinecycleterminal.com${chart}`,
    top ? `It is the page behind ${top.name}, so the post and the image agree.` : '',
    '',
    '── BEFORE POSTING ' + '─'.repeat(34),
    '',
    '- These are week-over-week changes from the observation store, not live.',
    '- Extension is normalised, not the raw indicator value. Say so if quoting.',
    '- No price targets. Descriptive, not directive.',
  ].join('\n');
}
