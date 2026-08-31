// The weekly Road to $1M post, for the personal account.
//
// This one is NOT a Skyline post and deliberately breaks every convention the
// others follow. No score, no Skyline mention, no "full read" link. The Skyline
// posts are calm, descriptive and data-first because that account's whole claim
// is that it never overstates. This one is written to a community that follows a
// person, and it reads like one: short lines, a lot of white space, one idea per
// line, a reframe, a question.
//
// Because the voice is the product here, the generator does not attempt it. It
// supplies the two things it can be certain of — the live price and the chart of
// the week — and leaves the writing to a person. A model imitating a personal
// voice weekly would land in the uncanny valley long before it landed on tone.

/**
 * Charts the server-side renderer can currently draw, keyed by the Path column
 * in the Notion Chart Rotation.
 *
 * The rotation holds eighteen charts and this covers five of them. That gap is
 * deliberate rather than unfinished: adding a card is per-chart work, and a post
 * about a chart with no card is still a good post with a screenshot attached.
 */
export const CARD_TYPE_BY_PATH: Record<string, string> = {
  '/price/market-regime':        'regime',
  '/price/realized-volatility':  'volatility',
  '/price/drawdown':             'drawdown',
  '/price/realized-price':       'ma200w',
  '/onchain/nupl':               'nupl',
};

/** Blocks in the progress bar, and what each one is worth. */
const BAR_BLOCKS = 5;
const PER_BLOCK = 200_000;

/**
 * The footer bar, e.g. `Road to ₿1M 🟩⬜⬜⬜⬜ $88,000`.
 *
 * Five blocks at $200k each. `ceil` rather than `floor` so any progress into a
 * band lights it — which is what makes $88,000 show one filled block rather than
 * none, matching the posts already published. Capped at five so $1M+ does not
 * overflow the bar.
 */
export function progressFooter(btcPrice: number): string {
  const filled = Math.min(BAR_BLOCKS, Math.max(0, Math.ceil(btcPrice / PER_BLOCK)));
  const bar = '🟩'.repeat(filled) + '⬜'.repeat(BAR_BLOCKS - filled);
  const price = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(btcPrice);
  return `Road to ₿1M ${bar} ${price}`;
}

export type WeeklyPostContext = {
  chart:     string;
  path:      string;
  whyNow:    string | null;
  weekOf:    string;
  btcPrice:  number;
  /** Absolute URL of the rendered card, when one exists for this chart. */
  cardUrl:   string | null;
};

const WRITE = '<< write this >>';

export function buildWeeklyPost(c: WeeklyPostContext): string {
  return [
    `ROAD TO $1M · WEEK OF ${c.weekOf}`,
    '='.repeat(52),
    '',
    '── THE POST ' + '─'.repeat(40),
    '',
    'Hook. One line. Give them a reason to stop scrolling.',
    WRITE,
    '',
    'What the chart actually shows. Plain, concrete, no hedging.',
    WRITE,
    '',
    'The reframe. Take something the timeline believes and turn it over.',
    '("Cash isn\'t bearish right now. It\'s ammo.")',
    WRITE,
    '',
    'The challenge. Short. A question works.',
    WRITE,
    '',
    progressFooter(c.btcPrice),
    '',
    '── THIS WEEK\'S CHART ' + '─'.repeat(31),
    '',
    `${c.chart} — skylinecycleterminal.com${c.path}`,
    c.whyNow ? `Why it is interesting: ${c.whyNow}` : 'No note recorded for this chart.',
    '',
    c.cardUrl
      ? `Card: ${c.cardUrl}`
      : `No auto-card for this one. Screenshot the page, or use its Share Card button.`,
    '',
    'This section is context for you, not part of the post. The community',
    'does not need to know where the chart came from.',
    '',
    '── VOICE ' + '─'.repeat(43),
    '',
    '- Short lines. One idea each. Let it breathe.',
    '- This is your account, not Skyline. No score, no branding, no site link.',
    '- Emoji as punctuation, not decoration.',
    '- The footer is the signature. It never changes shape.',
    '- Say the thing everyone is thinking, then turn it.',
  ].join('\n');
}
