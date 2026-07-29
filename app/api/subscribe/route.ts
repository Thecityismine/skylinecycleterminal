import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { sendWelcomeEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Skyline Weekly signups. Distinct from the `waitlist` collection, which was a
// pre-launch "tell me when checkout opens" list and is now obsolete — checkout
// has been live since Stripe went in.
//
// `source` records which surface the address came from (landing page, a guide,
// the /learn index) so the editorial calendar's weekly review can see which
// content actually earns subscribers.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    source?: string;
  };

  const name = body.name?.trim().slice(0, 200) ?? "";
  const email = body.email?.trim().toLowerCase().slice(0, 320) ?? "";
  const source = body.source?.trim().slice(0, 120) || "unknown";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  try {
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const { getAdminApp } = await import("@/lib/auth/firebaseAdmin");
    const db = getFirestore(await getAdminApp());

    const docId = email.replace(/[/.]/g, "_");
    const ref = db.collection("subscribers").doc(docId);
    const existing = await ref.get();

    // A stored random token rather than an HMAC: it needs no extra secret to be
    // configured, and it can be rotated per address by clearing the field.
    // Reused if one already exists so links in previously sent mail keep working.
    const unsubscribeToken =
      (existing.data()?.unsubscribeToken as string | undefined) ?? randomBytes(24).toString("hex");

    await ref.set(
      {
        name: name || null,
        email,
        source,
        unsubscribeToken,
        // Re-subscribing after an unsubscribe is an explicit opt back in.
        unsubscribed: false,
        // Only stamped on first signup, so re-submitting the same address does
        // not reset when they joined.
        ...(existing.exists ? {} : { subscribedAt: FieldValue.serverTimestamp() }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Welcome only on genuinely new addresses — someone re-entering their email
    // should not get a duplicate. Failure to send must not fail the signup: the
    // address is already stored, and a missing welcome is recoverable.
    if (!existing.exists) {
      try {
        await sendWelcomeEmail(email, unsubscribeToken, name || undefined);
      } catch (err) {
        console.error("[/api/subscribe] welcome email failed", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong — try again in a moment" }, { status: 500 });
  }
}
