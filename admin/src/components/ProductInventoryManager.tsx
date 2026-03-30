"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type VariantRecord = {
  id: string;
  title: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  inventory: number;
  trackInventory: boolean;
};

type EditableVariant = {
  id: string;
  title: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  price: string;
  inventory: string;
  trackInventory: boolean;
};

function toEditableVariant(variant: VariantRecord): EditableVariant {
  return {
    id: variant.id,
    title: variant.title,
    size: variant.size ?? "",
    color: variant.color ?? "",
    sku: variant.sku ?? "",
    barcode: variant.barcode ?? "",
    price: String(variant.price),
    inventory: String(variant.inventory),
    trackInventory: variant.trackInventory,
  };
}

const EMPTY_VARIANT = {
  title: "",
  size: "",
  color: "",
  sku: "",
  barcode: "",
  price: "0",
  inventory: "0",
  trackInventory: true,
};

export function ProductInventoryManager({ productId }: { productId: string }) {
  const [productTitle, setProductTitle] = useState("");
  const [variants, setVariants] = useState<EditableVariant[]>([]);
  const [draft, setDraft] = useState(EMPTY_VARIANT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [savingId, setSavingId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/products/${productId}/variants`);
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        product?: { title?: string };
        variants?: VariantRecord[];
      };

      if (!res.ok) throw new Error(data.error || "Failed to load inventory");

      setProductTitle(data.product?.title ?? "Product");
      setVariants((data.variants ?? []).map(toEditableVariant));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  function updateVariant(id: string, field: keyof EditableVariant, value: string | boolean) {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === id
          ? {
              ...variant,
              [field]: value,
            }
          : variant
      )
    );
  }

  async function saveVariant(variant: EditableVariant) {
    setSavingId(variant.id);
    setError("");

    try {
      const res = await fetch(`/api/products/${productId}/variants/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: variant.title,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          barcode: variant.barcode,
          price: Number(variant.price),
          inventory: Number(variant.inventory),
          trackInventory: variant.trackInventory,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save variant");

      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save variant");
    } finally {
      setSavingId("");
    }
  }

  async function deleteVariant(id: string) {
    setDeletingId(id);
    setError("");

    try {
      const res = await fetch(`/api/products/${productId}/variants/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete variant");

      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete variant");
    } finally {
      setDeletingId("");
    }
  }

  async function createVariant() {
    setCreating(true);
    setError("");

    try {
      const res = await fetch(`/api/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          size: draft.size,
          color: draft.color,
          sku: draft.sku,
          barcode: draft.barcode,
          price: Number(draft.price),
          inventory: Number(draft.inventory),
          trackInventory: draft.trackInventory,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to create variant");

      setDraft(EMPTY_VARIANT);
      await loadInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create variant");
    } finally {
      setCreating(false);
    }
  }

  const trackedUnits = variants
    .filter((variant) => variant.trackInventory)
    .reduce((sum, variant) => sum + Number(variant.inventory || 0), 0);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
            <p className="mt-1 text-sm text-gray-400">Manage tracked stock by variant for {productTitle || "this product"}.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/products/${productId}`} className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-800">
              Edit Product
            </Link>
            <div className="rounded-md border border-gray-800 bg-gray-900/60 px-4 py-2 text-sm text-gray-300">
              Tracked units: <span className="font-semibold text-white">{trackedUnits}</span>
            </div>
          </div>
        </header>

        {error ? <p className="rounded-lg border border-red-800/60 bg-red-900/20 px-4 py-3 text-sm text-red-200">{error}</p> : null}

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-100">Variants</h2>
              <p className="mt-1 text-sm text-gray-400">Each variant can track its own stock or ignore inventory entirely.</p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Loading inventory…</p>
          ) : variants.length === 0 ? (
            <p className="text-sm text-gray-400">No variants yet.</p>
          ) : (
            <div className="grid gap-4">
              {variants.map((variant) => (
                <div key={variant.id} className="rounded-xl border border-gray-800 bg-gray-950/80 p-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
                    <label className="grid gap-1 lg:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</span>
                      <input value={variant.title} onChange={(e) => updateVariant(variant.id, "title", e.target.value)} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Size</span>
                      <input value={variant.size} onChange={(e) => updateVariant(variant.id, "size", e.target.value)} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" placeholder="M" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Color</span>
                      <input value={variant.color} onChange={(e) => updateVariant(variant.id, "color", e.target.value)} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" placeholder="Black" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</span>
                      <input value={variant.sku} onChange={(e) => updateVariant(variant.id, "sku", e.target.value)} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price</span>
                      <input value={variant.price} onChange={(e) => updateVariant(variant.id, "price", e.target.value)} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" inputMode="decimal" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inventory</span>
                      <input value={variant.inventory} onChange={(e) => updateVariant(variant.id, "inventory", e.target.value)} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" inputMode="numeric" disabled={!variant.trackInventory} />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                      <input type="checkbox" checked={variant.trackInventory} onChange={(e) => updateVariant(variant.id, "trackInventory", e.target.checked)} />
                      Track inventory for this variant
                    </label>

                    <div className="flex gap-3">
                      <button type="button" onClick={() => void deleteVariant(variant.id)} disabled={deletingId === variant.id || savingId === variant.id} className="rounded-md border border-red-800/60 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-900/40 disabled:opacity-60">
                        {deletingId === variant.id ? "Deleting…" : "Delete"}
                      </button>
                      <button type="button" onClick={() => void saveVariant(variant)} disabled={savingId === variant.id || deletingId === variant.id} className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60">
                        {savingId === variant.id ? "Saving…" : "Save Variant"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-gray-100">Add Variant</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-6">
            <label className="grid gap-1 lg:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</span>
              <input value={draft.title} onChange={(e) => setDraft((current) => ({ ...current, title: e.target.value }))} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" placeholder="Large / Black" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Size</span>
              <input value={draft.size} onChange={(e) => setDraft((current) => ({ ...current, size: e.target.value }))} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" placeholder="L" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Color</span>
              <input value={draft.color} onChange={(e) => setDraft((current) => ({ ...current, color: e.target.value }))} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" placeholder="Black" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</span>
              <input value={draft.sku} onChange={(e) => setDraft((current) => ({ ...current, sku: e.target.value }))} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price</span>
              <input value={draft.price} onChange={(e) => setDraft((current) => ({ ...current, price: e.target.value }))} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" inputMode="decimal" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-4">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Inventory</span>
              <input value={draft.inventory} onChange={(e) => setDraft((current) => ({ ...current, inventory: e.target.value }))} className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" inputMode="numeric" disabled={!draft.trackInventory} />
            </label>
            <label className="inline-flex items-center gap-2 pb-2 text-sm text-gray-300">
              <input type="checkbox" checked={draft.trackInventory} onChange={(e) => setDraft((current) => ({ ...current, trackInventory: e.target.checked }))} />
              Track inventory
            </label>
            <button type="button" onClick={() => void createVariant()} disabled={creating} className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60">
              {creating ? "Creating…" : "Add Variant"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}