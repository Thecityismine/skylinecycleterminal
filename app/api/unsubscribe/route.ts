import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

// Unsubscribe endpoint. POST only, taking `e` (email) and `t` (token) as query
// params so the same URL serves both the human confirmation page and RFC 8058
// one-click, which mail clients fire as a bare POST with no body.
//
// Always answers 200 with a generic body, whether or not the address exists.
// The token is unguessable, but a distinguishable 404 would still turn this into
// an oracle for "is this address on the list".

function tokensMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function unsubscribe(email: string, token: string): Promise<void> {
  if (!email || !token) return;

  const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
  const { getAdminApp } = await import("@/lib/auth/firebaseAdmin");
  const db = getFirestore(await getAdminApp());

  const docId = email.toLowerCase().replace(/[/.]/g, "_");
  const ref = db.collection("subscribers").doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const stored = snap.data()?.unsubscribeToken as string | undefined;
  if (!stored || !tokensMatch(stored, token)) return;

  // The record is kept rather than deleted: a suppression list is what stops a
  // future import or re-signup from mailing someone who already opted out.
  await ref.set(
    { unsubscribed: true, unsubscribedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("e")?.trim().toLowerCase() ?? "";
  const token = searchParams.get("t")?.trim() ?? "";

  try {
    await unsubscribe(email, token);
  } catch (err) {
    console.error("[/api/unsubscribe]", err);
    return NextResponse.json({ error: "Something went wrong — try again in a moment" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
