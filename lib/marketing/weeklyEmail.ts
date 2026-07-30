import { escapeHtml, SITE_URL, unsubscribeUrlFor } from '@/lib/email';

// Skyline Weekly. Structure follows marketing/emails.md: score, phase, what
// changed, this week's lesson, one observation.
//
// The split is deliberate. Live numbers are filled in from the terminal so they
// cannot drift or be mistyped. The judgement calls - what actually changed this
// week, which lesson to feature, what to observe - are written by a person,
// because a generator inventing those is exactly the failure mode this account
// is positioned against.

export type WeeklyDraft = {
  /** What moved this week. One or two sentences, written by hand. */
  biggestChange: string;
  /** The teaching block. Written by hand, linked to a guide. */
  lesson: string;
  /** Slug under /learn that the lesson points at, e.g. how-to-identify-bitcoin-bottoms */
  lessonSlug: string;
  lessonTitle: string;
  /** One calm, factual observation. No prediction. */
  observation: string;
};

export type WeeklyContext = {
  score: number;
  phase: string;
};

export function weeklySubject(ctx: WeeklyContext): string {
  return `Skyline Weekly, Score ${ctx.score}, ${ctx.phase}`;
}

export function buildWeeklyText(d: WeeklyDraft, ctx: WeeklyContext, unsubscribeUrl: string): string {
  return [
    'Skyline Weekly',
    '',
    `Current Score: ${ctx.score} / 100`,
    `Current Phase: ${ctx.phase}`,
    '',
    'Biggest change this week',
    d.biggestChange,
    '',
    "This week's lesson",
    d.lesson,
    `Read more: ${SITE_URL}/learn/${d.lessonSlug}`,
    '',
    'One market observation',
    d.observation,
    '',
    `See the live cycle read: ${SITE_URL}/cycle`,
    '',
    'George',
    '',
    '—',
    'Educational content only, not financial advice. Cycles describe historical',
    'tendencies that may not repeat.',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');
}

export function buildWeeklyHtml(d: WeeklyDraft, ctx: WeeklyContext, unsubscribeUrl: string): string {
  const h = (s: string) => escapeHtml(s);
  const label = 'margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a';
  const para = 'margin:0 0 20px;font-size:15px;line-height:1.65';

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;max-width:560px">
<p style="margin:0 0 4px;font-size:18px;font-weight:600">Skyline Weekly</p>
<p style="margin:0 0 20px;font-size:14px;color:#8a8a8a">Score <strong style="color:#1a1a1a">${ctx.score} / 100</strong> &middot; ${h(ctx.phase)}</p>

<p style="${label}">Biggest change this week</p>
<p style="${para}">${h(d.biggestChange)}</p>

<p style="${label}">This week&rsquo;s lesson</p>
<p style="${para}">${h(d.lesson)}<br>
<a href="${SITE_URL}/learn/${encodeURIComponent(d.lessonSlug)}" style="color:#C2740E;text-decoration:underline">${h(d.lessonTitle)} &rarr;</a></p>

<p style="${label}">One market observation</p>
<p style="${para}">${h(d.observation)}</p>

<p style="margin:0 0 24px"><a href="${SITE_URL}/cycle" style="color:#C2740E;text-decoration:underline">See the live cycle read &rarr;</a></p>

<p style="margin:0 0 24px">George</p>

<hr style="border:0;border-top:1px solid #e5e5e5;margin:0 0 12px">
<p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8a">
Educational content only, not financial advice. Cycles describe historical tendencies that may not repeat.<br>
<a href="${unsubscribeUrl}" style="color:#8a8a8a;text-decoration:underline">Unsubscribe</a>
</p>
</div>`;
}

/** Renders for one recipient, so the unsubscribe link is theirs alone. */
export function renderWeeklyFor(
  email: string,
  token: string,
  draft: WeeklyDraft,
  ctx: WeeklyContext,
): { subject: string; text: string; html: string } {
  const url = unsubscribeUrlFor(email, token);
  return {
    subject: weeklySubject(ctx),
    text: buildWeeklyText(draft, ctx, url),
    html: buildWeeklyHtml(draft, ctx, url),
  };
}
