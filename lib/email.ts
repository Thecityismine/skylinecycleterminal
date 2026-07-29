import "server-only";
import nodemailer from "nodemailer";

// Sends outbound notification emails via Hostinger's SMTP (the same mailbox
// used for support@skylinecycleterminal.com). Lazily initialized so a missing
// SMTP_PASSWORD only breaks the routes that try to send mail, not the build.
let cachedTransport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST ?? "smtp.hostinger.com";
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    throw new Error("SMTP_USER / SMTP_PASSWORD env vars not set");
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return cachedTransport;
}

// The From address is NOT the SMTP username. On Hostinger the two happened to
// match, so the original code reused SMTP_USER — but with Resend the username is
// the literal string "resend", which is not a deliverable address. MAIL_FROM
// keeps them separate; the fallback preserves the Hostinger behaviour for any
// environment that has not been migrated yet.
function fromAddress(): string {
  const addr = process.env.MAIL_FROM ?? process.env.SMTP_USER;
  return `"Skyline Cycle Terminal" <${addr}>`;
}

// Where replies land. Sending happens through Resend, but the monitored mailbox
// is support@skylinecycleterminal.com on Hostinger — and if MAIL_FROM is on a
// send-only subdomain, a reply to it goes nowhere. Both the welcome email and
// the unsubscribe page tell people they can just reply, so this has to be set
// for that to be true.
function replyToAddress(): string {
  return process.env.MAIL_REPLY_TO ?? process.env.SUPPORT_EMAIL ?? "support@skylinecycleterminal.com";
}

export const SITE_URL = "https://skylinecycleterminal.com";

// Welcome email for Skyline Weekly signups. Copy is the version in
// marketing/emails.md — keep the two in step if either changes.
//
// Deliberately plain text: the weekly digest is meant to read like a note from
// George rather than a newsletter blast, and the welcome sets that expectation.
/** Human-facing confirmation page linked at the foot of every email. */
export function unsubscribeUrlFor(email: string, token: string): string {
  return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;
}

export async function sendWelcomeEmail(
  to: string,
  token: string,
  name?: string,
): Promise<void> {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const transport = getTransport();

  const unsubscribeUrl = unsubscribeUrlFor(to, token);

  // One-click unsubscribe. Gmail and Apple Mail surface this as a native button,
  // and since 2024 bulk senders are expected to support it. The POST target is
  // the API route rather than the confirmation page, because one-click has to
  // complete without a human pressing anything.
  const oneClick = `${SITE_URL}/api/unsubscribe?e=${encodeURIComponent(to)}&t=${encodeURIComponent(token)}`;

  await transport.sendMail({
    from: fromAddress(),
    replyTo: replyToAddress(),
    to,
    subject: "Welcome to Skyline",
    headers: {
      "List-Unsubscribe": `<${oneClick}>, <${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    text: [
      greeting,
      "",
      "Thanks for joining Skyline.",
      "",
      "Our goal isn't to predict tomorrow. It's to help you understand where Bitcoin is in its larger cycle.",
      "",
      "Every chart inside Skyline answers one question: is this a good time to accumulate, or should I be protecting capital?",
      "",
      "Start with the free dashboard. When you're ready, Premium unlocks the complete cycle engine.",
      "",
      `Open the dashboard: ${SITE_URL}`,
      "",
      "See you inside,",
      "George",
      "",
      "—",
      "Educational content only, not financial advice.",
      `Unsubscribe: ${unsubscribeUrl}`,
    ].join("\n"),
  });
}

export async function sendSupportNotification(subject: string, text: string): Promise<void> {
  const to = process.env.SUPPORT_EMAIL ?? "support@skylinecycleterminal.com";
  const transport = getTransport();
  await transport.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
  });
}
