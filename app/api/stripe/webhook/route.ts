import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { linkStripeCustomer, getUidForStripeCustomer, setEntitlement } from "@/lib/auth/entitlement";

// Needs the raw request body for signature verification (see req.text() below) and
// firebase-admin's Node APIs — must not run on the Edge runtime.
export const runtime = "nodejs";

function customerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  const uid = session.client_reference_id;
  const custId = customerId(session.customer);
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!uid || !custId || !subId) {
    console.error("[stripe/webhook] checkout.session.completed missing uid/customer/subscription", {
      uid, custId, subId,
    });
    return;
  }

  await linkStripeCustomer(custId, uid);

  const subscription = await stripe.subscriptions.retrieve(subId);
  const periodEnd = subscription.items.data[0]?.current_period_end;
  if (periodEnd == null) return;

  await setEntitlement(uid, {
    accessExpiresAt: periodEnd * 1000,
    stripeCustomerId: custId,
    stripeSubscriptionId: subId,
    plan: "yearly",
  });
}

// Doesn't change entitlement — Stripe's own retry schedule (dunning) handles that
// via customer.subscription.updated once retries exhaust and the subscription
// actually lapses. This just puts a failed renewal charge somewhere visible
// (Vercel function logs) instead of silently dropping the event, since there's
// no email/alerting pipeline wired up yet to notify the subscriber directly.
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const custId = customerId(invoice.customer);
  const uid = custId ? await getUidForStripeCustomer(custId) : null;

  console.error("[stripe/webhook] invoice.payment_failed", {
    uid,
    customerId: custId,
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
  });
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const custId = customerId(subscription.customer);
  if (!custId) return;

  const uid = await getUidForStripeCustomer(custId);
  if (!uid) {
    console.error("[stripe/webhook] no uid linked for Stripe customer", custId);
    return;
  }

  const periodEnd = subscription.items.data[0]?.current_period_end;
  // A canceled/unpaid subscription's period end may still be in the future
  // (access runs to the end of the paid period) — only force immediate
  // expiry if Stripe hasn't given us a period end at all.
  const expiresAt = periodEnd != null ? periodEnd * 1000 : Date.now() - 1;

  await setEntitlement(uid, {
    accessExpiresAt: expiresAt,
    stripeCustomerId: custId,
    stripeSubscriptionId: subscription.id,
    plan: "yearly",
  });
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(stripe, event.data.object);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe/webhook] failed to process ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
