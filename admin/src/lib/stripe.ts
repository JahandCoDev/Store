// admin/src/lib/stripe.ts
// Shared Stripe client factory and helper utilities for the admin.

import Stripe from "stripe";

/** Return a Stripe client initialised from the server-side secret key.
 *  Throws if STRIPE_SECRET_KEY is not set so callers get a clear error. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  return new Stripe(key);
}

/** Resolve whether Stripe is configured (secret key present). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}
