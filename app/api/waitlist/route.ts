import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAYMENT_METHODS = ["card", "cashapp", "btc", "lightning"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function isPaymentMethod(v: unknown): v is PaymentMethod {
  return typeof v === "string" && (PAYMENT_METHODS as readonly string[]).includes(v);
}

// Stores waitlist signups ahead of Stripe/crypto checkout going live.
// firebase-admin is loaded dynamically — see lib/auth/firebaseAdmin.ts for why.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    paymentMethod?: string;
  };

  const name = body.name?.trim().slice(0, 200) ?? "";
  const email = body.email?.trim().toLowerCase().slice(0, 320) ?? "";
  const paymentMethod = isPaymentMethod(body.paymentMethod) ? body.paymentMethod : "card";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  try {
    const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
    const { getAdminApp } = await import("@/lib/auth/firebaseAdmin");
    const db = getFirestore(await getAdminApp());

    const docId = email.replace(/[/.]/g, "_");
    await db.collection("waitlist").doc(docId).set(
      {
        name: name || null,
        email,
        paymentMethod,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong — try again in a moment" }, { status: 500 });
  }
}
