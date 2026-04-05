// admin/src/app/api/stripe/dashboard/route.ts
// GET /api/stripe/dashboard
// Returns the Stripe dashboard URL so the admin UI can open it.
// The base URL is always https://dashboard.stripe.com – admins must be
// logged in to their Stripe account in the same browser.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isStripeConfigured } from "@/lib/stripe";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const configured = isStripeConfigured();

  // Determine whether this is a live or test key so we can deep-link correctly.
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const isTestMode = key.startsWith("sk_test_");

  const base = "https://dashboard.stripe.com";
  const prefix = isTestMode ? "/test" : "";

  return NextResponse.json({
    configured,
    dashboardUrl: `${base}${prefix}`,
    paymentsUrl: `${base}${prefix}/payments`,
    customersUrl: `${base}${prefix}/customers`,
    productsUrl: `${base}${prefix}/products`,
    invoicesUrl: `${base}${prefix}/invoices`,
    subscriptionsUrl: `${base}${prefix}/subscriptions`,
    isTestMode,
  });
}
