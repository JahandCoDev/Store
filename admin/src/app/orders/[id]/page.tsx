"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

interface Fulfillment {
  trackingNumber: string | null;
  carrier: string | null;
  shippedAt: string | null;
  notes: string | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; title: string; price: number } | null;
}

interface Order {
  id: string;
  status: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  total: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  user: { firstName: string | null; lastName: string | null; email: string | null; displayId: string | null } | null;
  orderItems: OrderItem[];
  fulfillment: Fulfillment | null;
  shippingName?: string | null;
  shippingEmail?: string | null;
  shippingPhone?: string | null;
  shippingLine1?: string | null;
  shippingLine2?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingZip?: string | null;
  shippingCountry?: string | null;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");

  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [shippingSaveError, setShippingSaveError] = useState<string>("");
  const [shippingSaveSuccess, setShippingSaveSuccess] = useState<string>("");

  const [shippingName, setShippingName] = useState("");
  const [shippingEmail, setShippingEmail] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingLine1, setShippingLine1] = useState("");
  const [shippingLine2, setShippingLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCountry, setShippingCountry] = useState("US");

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  useEffect(() => {
    params.then(({ id }) => {
      setOrderId(id);
      fetch(`/api/orders/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error((data as { error?: string })?.error || "Failed to load order");
          }
          return res.json() as Promise<Order>;
        })
        .then((data) => {
          setOrder(data);
          setStatus(data.status);
          setShippingName(data.shippingName ?? "");
          setShippingEmail(data.shippingEmail ?? "");
          setShippingPhone(data.shippingPhone ?? "");
          setShippingLine1(data.shippingLine1 ?? "");
          setShippingLine2(data.shippingLine2 ?? "");
          setShippingCity(data.shippingCity ?? "");
          setShippingState(data.shippingState ?? "");
          setShippingZip(data.shippingZip ?? "");
          setShippingCountry(data.shippingCountry ?? "US");
        })
        .catch((err: Error) => setError(err?.message || "Failed to load order"))
        .finally(() => setLoading(false));
    });
  }, [params]);

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return;
    setSaveError("");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error || "Failed to update status");
      }
      const updated = (await res.json()) as { status: string; updatedAt: string };
      setOrder((prev) => (prev ? { ...prev, status: updated.status, updatedAt: updated.updatedAt } : prev));
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleShippingUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return;
    setShippingSaveError("");
    setShippingSaveSuccess("");
    setIsSavingShipping(true);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: {
            name: shippingName,
            email: shippingEmail,
            phone: shippingPhone,
            line1: shippingLine1,
            line2: shippingLine2,
            city: shippingCity,
            state: shippingState,
            zip: shippingZip,
            country: shippingCountry,
          },
        }),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const message = isRecord(data) && typeof data.error === "string" ? data.error : "Failed to update shipping";
        throw new Error(message);
      }

      const data: unknown = await res.json().catch(() => ({}));
      if (!isRecord(data)) throw new Error("Failed to update shipping");

      setOrder((prev) =>
        prev
          ? {
              ...prev,
              shippingName: typeof data.shippingName === "string" ? data.shippingName : prev.shippingName,
              shippingEmail: typeof data.shippingEmail === "string" ? data.shippingEmail : prev.shippingEmail,
              shippingPhone: typeof data.shippingPhone === "string" ? data.shippingPhone : prev.shippingPhone,
              shippingLine1: typeof data.shippingLine1 === "string" ? data.shippingLine1 : prev.shippingLine1,
              shippingLine2: typeof data.shippingLine2 === "string" ? data.shippingLine2 : prev.shippingLine2,
              shippingCity: typeof data.shippingCity === "string" ? data.shippingCity : prev.shippingCity,
              shippingState: typeof data.shippingState === "string" ? data.shippingState : prev.shippingState,
              shippingZip: typeof data.shippingZip === "string" ? data.shippingZip : prev.shippingZip,
              shippingCountry: typeof data.shippingCountry === "string" ? data.shippingCountry : prev.shippingCountry,
              updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : prev.updatedAt,
            }
          : prev
      );

      setShippingSaveSuccess("Saved.");
      setTimeout(() => setShippingSaveSuccess(""), 1500);
    } catch (err: unknown) {
      setShippingSaveError(err instanceof Error ? err.message : "Failed to update shipping");
    } finally {
      setIsSavingShipping(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-400">{error || "Order not found."}</p>
        <Link href="/orders" className="mt-4 inline-block text-sm text-gray-300 hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    PENDING: "border-yellow-800/60 bg-yellow-900/20 text-yellow-200",
    PROCESSING: "border-blue-800/60 bg-blue-900/20 text-blue-200",
    SHIPPED: "border-indigo-800/60 bg-indigo-900/20 text-indigo-200",
    DELIVERED: "border-green-800/60 bg-green-900/20 text-green-200",
    CANCELLED: "border-red-800/60 bg-red-900/20 text-red-300",
  };

  const subtotal = order.subtotal > 0 ? order.subtotal : order.total;

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Order #{order.id.slice(-6)}</h1>
            <p className="mt-1 text-sm text-gray-400">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/api/invoices/${order.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700"
            >
              🖨 Invoice
            </a>
            <a
              href={`/api/packing-slips/${order.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700"
            >
              🧾 Packing Slip
            </a>
            <Link href="/orders" className="text-sm text-gray-300 hover:underline">
              ← Back to Orders
            </Link>
            <a
              href={`/api/shipping-labels/${order.id}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-gray-700"
            >
              🏷 Shipping Label
            </a>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 shadow-sm">
              <div className="border-b border-gray-800 px-6 py-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Product</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Qty</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Unit Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900">
                    {order.orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm text-gray-200">{item.product?.title ?? "Deleted product"}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-200">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-200">${item.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-200">${(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-800 bg-gray-900/50 text-sm">
                    {subtotal !== order.total && (
                      <tr>
                        <td colSpan={3} className="px-6 py-2 text-right text-gray-400">Subtotal</td>
                        <td className="px-6 py-2 text-right text-gray-200">${subtotal.toFixed(2)}</td>
                      </tr>
                    )}
                    {order.taxAmount > 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-2 text-right text-gray-400">Tax</td>
                        <td className="px-6 py-2 text-right text-gray-200">${order.taxAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    {order.shippingAmount > 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-2 text-right text-gray-400">Shipping</td>
                        <td className="px-6 py-2 text-right text-gray-200">${order.shippingAmount.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right font-semibold text-gray-300">Total</td>
                      <td className="px-6 py-3 text-right font-bold text-foreground">
                        ${order.total.toFixed(2)} {order.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Fulfillment */}
            {order.fulfillment && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">Fulfillment</h2>
                <dl className="space-y-2 text-sm">
                  {order.fulfillment.carrier && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-400">Carrier</dt>
                      <dd className="text-gray-200">{order.fulfillment.carrier}</dd>
                    </div>
                  )}
                  {order.fulfillment.trackingNumber && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-400">Tracking #</dt>
                      <dd className="font-mono text-gray-200">{order.fulfillment.trackingNumber}</dd>
                    </div>
                  )}
                  {order.fulfillment.shippedAt && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-400">Shipped</dt>
                      <dd className="text-gray-200">{new Date(order.fulfillment.shippedAt).toLocaleString()}</dd>
                    </div>
                  )}
                  {order.fulfillment.notes && (
                    <div>
                      <dt className="mb-1 text-gray-400">Notes</dt>
                      <dd className="text-gray-200">{order.fulfillment.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {order.note && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">Order Note</h2>
                <p className="text-sm text-gray-300">{order.note}</p>
              </div>
            )}
          </div>

          {/* Right column: summary & status */}
          <div className="space-y-6">
            {/* Customer */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Customer</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-gray-400">Email</dt>
                  <dd className="text-gray-200">{order.user?.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Name</dt>
                  <dd className="text-gray-200">{order.user ? [order.user.firstName, order.user.lastName].filter(Boolean).join(" ").trim() || "—" : "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Shipping */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Shipping</h2>
              <form onSubmit={handleShippingUpdate} className="mt-4 grid gap-3">
                <label className="grid gap-1">
                  <span className="text-xs text-gray-400">Name</span>
                  <input
                    value={shippingName}
                    onChange={(e) => setShippingName(e.target.value)}
                    className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">Email</span>
                    <input
                      value={shippingEmail}
                      onChange={(e) => setShippingEmail(e.target.value)}
                      className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">Phone</span>
                    <input
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                    />
                  </label>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs text-gray-400">Address line 1</span>
                  <input
                    value={shippingLine1}
                    onChange={(e) => setShippingLine1(e.target.value)}
                    className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs text-gray-400">Address line 2</span>
                  <input
                    value={shippingLine2}
                    onChange={(e) => setShippingLine2(e.target.value)}
                    className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  />
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">City</span>
                    <input
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">State</span>
                    <input
                      value={shippingState}
                      onChange={(e) => setShippingState(e.target.value)}
                      className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs text-gray-400">ZIP</span>
                    <input
                      value={shippingZip}
                      onChange={(e) => setShippingZip(e.target.value)}
                      className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                    />
                  </label>
                </div>

                <label className="grid gap-1">
                  <span className="text-xs text-gray-400">Country</span>
                  <input
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  />
                </label>

                {shippingSaveError ? <p className="text-xs text-red-400">{shippingSaveError}</p> : null}
                {shippingSaveSuccess ? <p className="text-xs text-emerald-300">{shippingSaveSuccess}</p> : null}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingShipping}
                    className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-60"
                  >
                    {isSavingShipping ? "Saving…" : "Save shipping"}
                  </button>
                </div>
              </form>
            </div>

            {/* Status Update */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Status</h2>
              <div className="mt-3">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    statusColors[order.status] ?? "border-gray-800 bg-gray-950 text-gray-200"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <form onSubmit={handleStatusUpdate} className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-gray-300">Update Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {saveError ? <p className="text-xs text-red-400">{saveError}</p> : null}
                <button
                  type="submit"
                  disabled={isSaving || status === order.status}
                  className="w-full rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save Status"}
                </button>
              </form>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Timeline</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-gray-400">Created</dt>
                  <dd className="text-gray-200">{new Date(order.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Last Updated</dt>
                  <dd className="text-gray-200">{new Date(order.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
