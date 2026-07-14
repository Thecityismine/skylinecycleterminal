import { NextResponse } from "next/server";
import { sendSupportNotification } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Stores contact-form submissions in Firestore (source of truth) and best-effort
// emails a notification to support@skylinecycleterminal.com — a failed send
// doesn't fail the request since the message is already saved either way.
// firebase-admin is loaded dynamically — see lib/auth/firebaseAdmin.ts for why.
// Uses an auto-generated doc ID per message (unlike waitlist, which upserts by
// email) since the same person may write in more than once.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    message?: string;
  };

  const name = body.name?.trim().slice(0, 200) ?? "";
  const email = body.email?.trim().toLowerCase().slice(0, 320) ?? "";
  const message = body.message?.trim().slice(0, 5000) ?? "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "A message is required" }, { status: 400 });
  }

  try {
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const { getAdminApp } = await import("@/lib/auth/firebaseAdmin");
    const db = getFirestore(await getAdminApp());

    await db.collection("contactMessages").add({
      name: name || null,
      email,
      message,
      createdAt: FieldValue.serverTimestamp(),
    });

    try {
      await sendSupportNotification(
        `New contact form message from ${name || email}`,
        `From: ${name || "(no name given)"} <${email}>\n\n${message}`,
      );
    } catch (err) {
      console.error("[contact] failed to send notification email:", err);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong — try again in a moment" }, { status: 500 });
  }
}
