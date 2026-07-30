import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/access';
import { sendNewsletterEmail } from '@/lib/email';
import { renderWeeklyFor, weeklySubject, type WeeklyDraft, type WeeklyContext } from '@/lib/marketing/weeklyEmail';
import type { CycleScoreResult } from '@/lib/indicators/skylineScore';

// Sends Skyline Weekly to the subscriber list.
//
// Admin only, and a dry run unless explicitly told otherwise: the default of a
// route that mails every subscriber at once should never be "send".
//
// Safeguards, in order of how much damage they prevent:
//   - admin session required; a paying subscriber must not reach this
//   - dryRun defaults true, so a malformed call previews instead of sending
//   - campaignId is a document id, so the same issue cannot go out twice
//   - unsubscribed recipients are filtered out, not just skipped at send time
//   - a per-run cap, because the Resend free tier allows 100 emails a day and
//     silently failing halfway through a list is worse than refusing up front

export const dynamic = 'force-dynamic';

const DAILY_SEND_CAP = 100;

type Body = Partial<WeeklyDraft> & {
  campaignId?: string;
  dryRun?: boolean;
  limit?: number;
  force?: boolean;
};

function missingFields(b: Body): string[] {
  const required: (keyof WeeklyDraft)[] = ['biggestChange', 'lesson', 'lessonSlug', 'lessonTitle', 'observation'];
  return required.filter((k) => !b[k] || String(b[k]).trim() === '');
}

/** ISO-week id, e.g. 2026-W31, so a weekly issue has a natural unique key. */
function isoWeekId(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const gaps = missingFields(body);
  if (gaps.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${gaps.join(', ')}. These are written by hand, not generated.` },
      { status: 400 },
    );
  }

  const draft: WeeklyDraft = {
    biggestChange: String(body.biggestChange),
    lesson: String(body.lesson),
    lessonSlug: String(body.lessonSlug),
    lessonTitle: String(body.lessonTitle),
    observation: String(body.observation),
  };

  const dryRun = body.dryRun !== false;
  const campaignId = body.campaignId?.trim() || isoWeekId();
  const limit = Math.min(body.limit ?? DAILY_SEND_CAP, DAILY_SEND_CAP);

  // Live numbers come from the terminal so they cannot be mistyped into an email
  // that goes to the whole list.
  const origin = new URL(request.url).origin;
  const cycleRes = await fetch(`${origin}/api/cycle`, { cache: 'no-store' }).catch(() => null);
  if (!cycleRes?.ok) {
    return NextResponse.json({ error: 'Could not read /api/cycle. Refusing to send without a live score.' }, { status: 502 });
  }
  const cycle = (await cycleRes.json()) as CycleScoreResult;
  const ctx: WeeklyContext = { score: Math.round(cycle.score), phase: cycle.zoneLabel };

  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const { getAdminApp } = await import('@/lib/auth/firebaseAdmin');
  const db = getFirestore(await getAdminApp());

  const campaignRef = db.collection('campaigns').doc(campaignId);
  const existing = await campaignRef.get();
  if (existing.exists && !dryRun && !body.force) {
    return NextResponse.json(
      { error: `Campaign ${campaignId} already sent on ${existing.data()?.sentAt?.toDate?.().toISOString() ?? 'an earlier run'}. Pass force:true to send it again.` },
      { status: 409 },
    );
  }

  const snap = await db.collection('subscribers').get();
  const recipients = snap.docs
    .map((d) => d.data() as { email?: string; unsubscribeToken?: string; unsubscribed?: boolean })
    .filter((s) => s.email && s.unsubscribeToken && s.unsubscribed !== true);

  const preview = recipients.length
    ? renderWeeklyFor(recipients[0].email!, recipients[0].unsubscribeToken!, draft, ctx)
    : { subject: weeklySubject(ctx), text: '(no subscribers)', html: '' };

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      campaignId,
      score: ctx.score,
      phase: ctx.phase,
      recipientCount: recipients.length,
      overDailyCap: recipients.length > DAILY_SEND_CAP,
      wouldSendTo: recipients.slice(0, 10).map((r) => r.email),
      alreadySent: existing.exists,
      subject: preview.subject,
      textPreview: preview.text,
    });
  }

  const batch = recipients.slice(0, limit);
  const sent: string[] = [];
  const failed: { email: string; error: string }[] = [];

  // Sequential on purpose. This list is small, and a burst is the quickest way
  // to trip a provider rate limit and lose half a send with no record of which
  // half went out.
  for (const r of batch) {
    try {
      const { subject, text, html } = renderWeeklyFor(r.email!, r.unsubscribeToken!, draft, ctx);
      await sendNewsletterEmail({ to: r.email!, token: r.unsubscribeToken!, subject, text, html });
      sent.push(r.email!);
    } catch (err) {
      failed.push({ email: r.email!, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  await campaignRef.set(
    {
      campaignId,
      subject: preview.subject,
      score: ctx.score,
      phase: ctx.phase,
      draft,
      sentCount: sent.length,
      failedCount: failed.length,
      skippedForCap: Math.max(0, recipients.length - batch.length),
      sentAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return NextResponse.json({
    dryRun: false,
    campaignId,
    sentCount: sent.length,
    failedCount: failed.length,
    skippedForCap: Math.max(0, recipients.length - batch.length),
    failed: failed.slice(0, 10),
  });
}
