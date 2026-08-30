// The weekly Road to $1M post.
//
// Same discipline as dailyPost.ts: templated rather than written fresh, because
// a model composing the sentence each week drifts in tone over months and can
// quote a number that is not in the payload. Every figure below is passed in.
//
// Voice from marketing/x-daily-templates.md — data first, descriptive never
// directive, no price targets, no forecasts.

/**
 * Charts the server-side renderer can currently draw, keyed by the Path column
 * in the Notion Chart Rotation.
 *
 * The rotation holds eighteen charts and this covers three of them. That gap is
 * deliberate rather than unfinished: adding a card is per-chart work, and a post
 * about a chart with no card is still a good post with a screenshot attached.
 * The draft says which case it is instead of silently omitting the image.
 */
export const CARD_TYPE_BY_PATH: Record<string, string> = {
  '/price/market-regime':        'regime',
  '/price/realized-volatility':  'volatility',
  '/price/drawdown':             'drawdown',
};

export type WeeklyPostContext = {
  chart:     string;
  path:      string;
  whyNow:    string | null;
  score:     number;
  phase:     string;
  reporting: number;
  total:     number;
  weekOf:    string;
  /** Absolute URL of the rendered card, when one exists for this chart. */
  cardUrl:   string | null;
};

export function buildWeeklyPost(c: WeeklyPostContext): string {
  const lines = [
    `This week's chart: ${c.chart}`,
    '',
    `Skyline Cycle Score: ${c.score} / 100 — ${c.phase}`,
    `${c.reporting} of ${c.total} indicators reporting.`,
  ];

  if (c.whyNow) {
    lines.push('', c.whyNow);
  }

  lines.push('', `Full read → skylinecycleterminal.com${c.path}`);

  return [
    `ROAD TO $1M · WEEK OF ${c.weekOf}`,
    '='.repeat(52),
    '',
    '── POST ' + '─'.repeat(44),
    '',
    lines.join('\n'),
    '',
    '── IMAGE ' + '─'.repeat(43),
    '',
    c.cardUrl
      ? `Card rendered and ready:\n${c.cardUrl}\n\nRight-click to save, or open it and screenshot.`
      : `No auto-card exists for ${c.chart} yet.\nOpen skylinecycleterminal.com${c.path} and screenshot the chart,\nor use the Share Card button on the page.`,
    '',
    '── BEFORE POSTING ' + '─'.repeat(34),
    '',
    '- Re-check the score. These numbers are from the draft date.',
    '- No price targets, no forecasts.',
    '- Descriptive, not directive.',
    '- If a number is not on the chart in the image, cut the line.',
  ].join('\n');
}
