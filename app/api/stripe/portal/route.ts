import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import { getStripeCustomerId } from "@/lib/auth/entitlement";
import { getStripe } from "@/lib/stripe";

// Creates a Stripe Billing Portal session so a signed-in subscriber can manage
// (cancel, update payment method, view invoices) their own subscription
// without emailing support — mirrors app/api/stripe/checkout/route.ts's shape.
export async function POST(req: Request) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const customerId = await getStripeCustomerId(session.uid);
  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  try {
    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[stripe/portal]", err);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
