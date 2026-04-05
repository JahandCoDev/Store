// admin/src/app/stripe/page.tsx
// Stripe integration overview page – shows sync status and links to the
// Stripe dashboard sections.

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import StripeSyncPanel from "@/components/StripeSyncPanel";

export default async function StripePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const configured = isStripeConfigured();

  // Determine test vs live mode for dashboard deep-links.
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const isTestMode = key.startsWith("sk_test_");
  const base = "https://dashboard.stripe.com";
  const prefix = isTestMode ? "/test" : "";

  const dashboardLinks = {
    overview: `${base}${prefix}`,
    payments: `${base}${prefix}/payments`,
    customers: `${base}${prefix}/customers`,
    products: `${base}${prefix}/products`,
    invoices: `${base}${prefix}/invoices`,
    subscriptions: `${base}${prefix}/subscriptions`,
    webhooks: `${base}${prefix}/webhooks`,
  };

  // Sync stats
  const [totalCustomers, syncedCustomers, totalProducts, syncedProducts, totalVariants, syncedVariants] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { stripeCustomerId: { not: null } } }),
      prisma.product.count(),
      prisma.product.count({ where: { stripeProductId: { not: null } } }),
      prisma.productVariant.count(),
      prisma.productVariant.count({ where: { stripePriceId: { not: null } } }),
    ]);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Stripe Integration</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your Stripe connection, sync objects, and access the Stripe dashboard.
          </p>
        </header>

        {/* Configuration status */}
        <div
          className={`mb-6 rounded-xl border p-5 ${
            configured
              ? "border-green-800/50 bg-green-950/40"
              : "border-red-800/50 bg-red-950/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${configured ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="font-medium text-white">
              {configured
                ? isTestMode
                  ? "Stripe connected (Test Mode)"
                  : "Stripe connected (Live Mode)"
                : "Stripe not configured"}
            </span>
          </div>
          {!configured && (
            <p className="mt-2 text-sm text-red-300">
              Set the <code className="rounded bg-red-900/50 px-1">STRIPE_SECRET_KEY</code> and{" "}
              <code className="rounded bg-red-900/50 px-1">STRIPE_WEBHOOK_SECRET</code> environment
              variables to enable Stripe.
            </p>
          )}
          {isTestMode && (
            <p className="mt-2 text-sm text-yellow-300/80">
              You are using a test-mode key. Switch to a live key for production payments.
            </p>
          )}
        </div>

        {/* Sync stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="text-sm text-gray-400">Customers synced</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {syncedCustomers}{" "}
              <span className="text-base font-normal text-gray-500">/ {totalCustomers}</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="text-sm text-gray-400">Products synced</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {syncedProducts}{" "}
              <span className="text-base font-normal text-gray-500">/ {totalProducts}</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="text-sm text-gray-400">Variants / Prices synced</div>
            <div className="mt-2 text-2xl font-bold text-white">
              {syncedVariants}{" "}
              <span className="text-base font-normal text-gray-500">/ {totalVariants}</span>
            </div>
          </div>
        </div>

        {/* Sync panel (client component) */}
        {configured && <StripeSyncPanel />}

        {/* Stripe dashboard links */}
        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-6 py-4">
            <h2 className="text-lg font-semibold text-white">Stripe Dashboard</h2>
            <p className="mt-1 text-sm text-gray-400">
              Open directly in Stripe. You must be signed in to your Stripe account in the same
              browser.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-gray-800 sm:grid-cols-3 lg:grid-cols-4">
            {(
              [
                ["Overview", dashboardLinks.overview],
                ["Payments", dashboardLinks.payments],
                ["Customers", dashboardLinks.customers],
                ["Products", dashboardLinks.products],
                ["Invoices", dashboardLinks.invoices],
                ["Subscriptions", dashboardLinks.subscriptions],
                ["Webhooks", dashboardLinks.webhooks],
              ] as [string, string][]
            ).map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1 bg-gray-900 px-5 py-4 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
              >
                {label}
                <span className="text-xs font-normal text-gray-500">Open in Stripe ↗</span>
              </a>
            ))}
          </div>
        </div>

        {/* Webhook info */}
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-2 text-base font-semibold text-white">Webhook endpoint</h2>
          <p className="text-sm text-gray-400">
            Register the following URL in the Stripe dashboard under{" "}
            <a
              href={dashboardLinks.webhooks}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Webhooks
            </a>{" "}
            to keep your database in sync with Stripe events.
          </p>
          <code className="mt-3 block rounded-lg bg-gray-800 px-4 py-3 text-sm text-green-300">
            POST https://&lt;your-admin-domain&gt;/api/stripe/webhook
          </code>
          <p className="mt-3 text-xs text-gray-500">
            Recommended events: <span className="text-gray-300">customer.updated</span>,{" "}
            <span className="text-gray-300">customer.deleted</span>,{" "}
            <span className="text-gray-300">product.updated</span>,{" "}
            <span className="text-gray-300">product.deleted</span>,{" "}
            <span className="text-gray-300">price.updated</span>,{" "}
            <span className="text-gray-300">invoice.paid</span>,{" "}
            <span className="text-gray-300">invoice.payment_failed</span>,{" "}
            <span className="text-gray-300">payment_intent.succeeded</span>,{" "}
            <span className="text-gray-300">payment_intent.canceled</span>
          </p>
        </div>
      </div>
    </div>
  );
}
