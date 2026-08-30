// Short-form video script scaffolds, one chart per week.
//
// The beats below come from marketing/x-daily-templates.md, which is Skyline's
// own positioning doc, not from the transcripts in "Refrence Youtube Scripts".
// Those are recordings of another creator's videos — useful for seeing what the
// format looks like, wrong to copy the structure of. The rules that matter here
// are Skyline's:
//
//   Data first, opinion second.
//   Descriptive, never directive.
//   No price targets, no forecasts.
//   End without a hard sell.
//
// Like the newsletter, this fills in what the terminal can prove and leaves the
// narrative as prompts. A generator writing the whole script would drift in tone
// across months and eventually narrate a number that was not in the payload —
// the same failure dailyPost.ts uses templates to avoid.

export type ScriptContext = {
  chart:       string;
  path:        string;
  category:    string;
  whyNow:      string | null;
  score:       number;
  phase:       string;
  reporting:   number;
  total:       number;
  weekOf:      string;
};

const WRITE = '<< write this >>';

/** A 60–90 second script scaffold for one chart. */
export function buildVideoScript(c: ScriptContext): string {
  return [
    `SKYLINE SHORT · week of ${c.weekOf}`,
    `Chart: ${c.chart}  (skylinecycleterminal.com${c.path})`,
    `Category: ${c.category}`,
    '',
    'Target: 60–90 seconds. Screen-record the chart page and talk over it.',
    '',
    '─────────────────────────────────────────',
    'CONTEXT FROM THE TERMINAL (verified, safe to say on camera)',
    '─────────────────────────────────────────',
    `Skyline Cycle Score: ${c.score} / 100 — ${c.phase}`,
    `Indicators reporting: ${c.reporting} of ${c.total}`,
    c.whyNow ? `Why this chart, this week: ${c.whyNow}` : 'Why this chart: (no note recorded)',
    '',
    '─────────────────────────────────────────',
    'THE BEATS',
    '─────────────────────────────────────────',
    '',
    '1. HOOK — open on the number, not the opinion  (0:00–0:08)',
    `   The one figure from ${c.chart} that makes this worth 90 seconds.`,
    `   ${WRITE}`,
    '',
    '2. WHAT IT MEASURES — plain language, no jargon  (0:08–0:25)',
    '   Someone who has never seen this chart should follow it.',
    `   ${WRITE}`,
    '',
    '3. WHERE IT SITS NOW — the reading, with its history  (0:25–0:50)',
    '   Point at the chart. Compare to its own past, not to a price target.',
    `   ${WRITE}`,
    '',
    '4. WHAT IT DOES NOT SAY — the boundary  (0:50–1:10)',
    '   This beat is the differentiator. Name what this chart cannot tell you.',
    '   Every cycle account skips this one.',
    `   ${WRITE}`,
    '',
    '5. CLOSE — no hard sell  (1:10–1:30)',
    '   One calm sentence. The chart is on the terminal if they want it.',
    `   ${WRITE}`,
    '',
    '─────────────────────────────────────────',
    'BEFORE RECORDING',
    '─────────────────────────────────────────',
    '- Re-open the chart. These numbers are from the draft date and move.',
    '- No price targets, no forecasts, no "this means we go to X".',
    '- Descriptive, not directive: "demand remains constructive", never "buy now".',
    '- If a number cannot be pointed at on screen, cut the sentence.',
  ].join('\n');
}
