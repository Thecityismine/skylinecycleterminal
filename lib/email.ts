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

/** Human-facing confirmation page linked at the foot of every email. */
export function unsubscribeUrlFor(email: string, token: string): string {
  return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;
}

// The subscriber's name arrives from a public form and is interpolated into the
// HTML body, so it has to be escaped. Mail clients strip scripts, but unescaped
// markup can still break the layout or smuggle in a link that appears to be
// ours — which on an email people trust is worse than a broken layout.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    // Sent alongside the plain text as multipart/alternative — clients that
    // prefer text still get the version above, with the full URL spelled out
    // because text cannot carry a link.
    //
    // Styling stays minimal on purpose: emails.md asks for something that reads
    // like a note from George, not a newsletter blast. No images, no dark-mode
    // overrides, no layout tables — just type, so it renders the same
    // everywhere and does not trip spam heuristics that dislike heavy markup.
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#1a1a1a;max-width:560px">
<p style="margin:0 0 16px">${escapeHtml(greeting)}</p>
<p style="margin:0 0 16px">Thanks for joining Skyline.</p>
<p style="margin:0 0 16px">Our goal isn&rsquo;t to predict tomorrow. It&rsquo;s to help you understand where Bitcoin is in its larger cycle.</p>
<p style="margin:0 0 16px">Every chart inside Skyline answers one question: is this a good time to accumulate, or should I be protecting capital?</p>
<p style="margin:0 0 16px">Start with the free dashboard. When you&rsquo;re ready, Premium unlocks the complete cycle engine.</p>
<p style="margin:0 0 24px"><a href="${SITE_URL}" style="color:#C2740E;text-decoration:underline">Open the dashboard &rarr;</a></p>
<p style="margin:0 0 24px">See you inside,<br>George</p>
<hr style="border:0;border-top:1px solid #e5e5e5;margin:0 0 12px">
<p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8a">
Educational content only, not financial advice.<br>
<a href="${unsubscribeUrl}" style="color:#8a8a8a;text-decoration:underline">Unsubscribe</a>
</p>
</div>`,
  });
}

// One newsletter send. Every recipient gets their own unsubscribe token, so the
// footer link and the one-click header are personal to them: a forwarded email
// can never unsubscribe the wrong person.
export async function sendNewsletterEmail(args: {
  to: string;
  token: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const { to, token, subject, text, html } = args;
  const transport = getTransport();

  const unsubscribeUrl = unsubscribeUrlFor(to, token);
  const oneClick = `${SITE_URL}/api/unsubscribe?e=${encodeURIComponent(to)}&t=${encodeURIComponent(token)}`;

  await transport.sendMail({
    from: fromAddress(),
    replyTo: replyToAddress(),
    to,
    subject,
    headers: {
      'List-Unsubscribe': `<${oneClick}>, <${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    text,
    html,
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
