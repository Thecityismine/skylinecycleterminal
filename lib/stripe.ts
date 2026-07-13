import "server-only";
import Stripe from "stripe";

// Server-only Stripe client singleton. Lazily initialized so a missing
// STRIPE_SECRET_KEY only breaks the checkout/webhook routes that need it,
// not every build or unrelated request.
let cachedClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (cachedClient) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY env var not set");
  }

  cachedClient = new Stripe(secretKey);
  return cachedClient;
}
