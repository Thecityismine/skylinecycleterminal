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

export async function sendSupportNotification(subject: string, text: string): Promise<void> {
  const to = process.env.SUPPORT_EMAIL ?? "support@skylinecycleterminal.com";
  const transport = getTransport();
  await transport.sendMail({
    from: `"Skyline Cycle Terminal" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
  });
}
