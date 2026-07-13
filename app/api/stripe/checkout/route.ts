import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { getStripe } from "@/lib/stripe";

// Creates a Stripe Checkout Session for the signed-in user and hands the client
// the hosted checkout URL to redirect to. client_reference_id carries the
// Firebase uid through checkout so the webhook can link it to the resulting
// Stripe customer (see lib/auth/entitlement.ts).
export async function POST(req: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Billing is not configured yet" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: session.uid,
      customer_email: session.email ?? undefined,
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/billing`,
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}
