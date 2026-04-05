"use client";
// admin/src/components/StripeSyncPanel.tsx
// Client component that drives on-demand syncing of customers and products
// with Stripe via the /api/stripe/sync-* endpoints.

import { useState } from "react";

type SyncResult = { ok: boolean; message: string };

async function postSync(endpoint: string, body: Record<string, string>): Promise<SyncResult> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const msg =
        parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : text || `HTTP ${res.status}`;
      return { ok: false, message: msg };
    }
    return { ok: true, message: "Synced successfully." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

export default function StripeSyncPanel() {
  const [customerId, setCustomerId] = useState("");
  const [customerResult, setCustomerResult] = useState<SyncResult | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  const [productId, setProductId] = useState("");
  const [productResult, setProductResult] = useState<SyncResult | null>(null);
  const [productLoading, setProductLoading] = useState(false);

  async function syncCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId.trim()) return;
    setCustomerLoading(true);
    setCustomerResult(null);
    const result = await postSync("/api/stripe/sync-customer", {
      [customerId.includes("@") ? "email" : "userId"]: customerId.trim(),
    });
    setCustomerResult(result);
    setCustomerLoading(false);
  }

  async function syncProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productId.trim()) return;
    setProductLoading(true);
    setProductResult(null);
    const result = await postSync("/api/stripe/sync-product", { productId: productId.trim() });
    setProductResult(result);
    setProductLoading(false);
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Sync customer */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-1 text-base font-semibold text-white">Sync Customer</h3>
        <p className="mb-4 text-sm text-gray-400">
          Enter a user ID or email to upsert the customer in Stripe.
        </p>
        <form onSubmit={syncCustomer} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="User ID or email"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
          <button
            type="submit"
            disabled={customerLoading || !customerId.trim()}
            className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-50"
          >
            {customerLoading ? "Syncing…" : "Sync to Stripe"}
          </button>
          {customerResult && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                customerResult.ok
                  ? "bg-green-950/40 text-green-300"
                  : "bg-red-950/40 text-red-300"
              }`}
            >
              {customerResult.message}
            </p>
          )}
        </form>
      </div>

      {/* Sync product */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-1 text-base font-semibold text-white">Sync Product</h3>
        <p className="mb-4 text-sm text-gray-400">
          Enter a product ID to upsert the product and all its variant prices in Stripe.
        </p>
        <form onSubmit={syncProduct} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Product ID"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
          <button
            type="submit"
            disabled={productLoading || !productId.trim()}
            className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700 disabled:opacity-50"
          >
            {productLoading ? "Syncing…" : "Sync to Stripe"}
          </button>
          {productResult && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                productResult.ok
                  ? "bg-green-950/40 text-green-300"
                  : "bg-red-950/40 text-red-300"
              }`}
            >
              {productResult.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
