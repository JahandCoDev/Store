"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; title: string; price: number } | null;
}

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
  user: { name: string | null; email: string | null } | null;
  orderItems: OrderItem[];
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");

  useEffect(() => {
    params.then(({ id }) => {
      setOrderId(id);
      fetch(`/api/orders/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || "Failed to load order");
          }
          return res.json() as Promise<Order>;
        })
        .then((data) => {
          setOrder(data);
          setStatus(data.status);
        })
        .catch((err) => setError(err?.message || "Failed to load order"))
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
        throw new Error(data?.error || "Failed to update status");
      }
      const updated = await res.json();
      setOrder((prev) => (prev ? { ...prev, status: updated.status, updatedAt: updated.updatedAt } : prev));
    } catch (err: any) {
      setSaveError(err?.message || "Failed to update status");
    } finally {
      setIsSaving(false);
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
          <Link href="/orders" className="text-sm text-gray-300 hover:underline">
            ← Back to Orders
          </Link>
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
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Product
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900">
                    {order.orderItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm text-gray-200">
                          {item.product?.title ?? "Deleted product"}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-200">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-200">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-200">
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-gray-800 bg-gray-900/50">
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-gray-300">
                        Total
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-bold text-foreground">
                        ${order.total.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
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
                  <dd className="text-gray-200">{order.user?.name || "—"}</dd>
                </div>
              </dl>
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
                    <option key={s} value={s}>
                      {s}
                    </option>
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

            {/* Timestamps */}
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
