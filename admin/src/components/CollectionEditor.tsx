"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import MediaAssetPicker from "@/components/MediaAssetPicker";

type ProductOption = {
  id: string;
  title: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  price: number;
  handle: string | null;
};

type CollectionPayload = {
  id?: string;
  handle: string;
  title: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  imageAssetId: string | null;
  isPublished: boolean;
  sortOrder: number;
  productIds: string[];
};

export default function CollectionEditor({
  mode,
  collectionId,
}: {
  mode: "create" | "edit";
  collectionId?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const [form, setForm] = useState<CollectionPayload>({
    handle: "",
    title: "",
    description: "",
    seoTitle: null,
    seoDescription: null,
    imageAssetId: null,
    isPublished: false,
    sortOrder: 0,
    productIds: [],
  });

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ([]));
        if (!res.ok) throw new Error("Failed to load products");
        return Array.isArray(data) ? data as ProductOption[] : [];
      })
      .then((data) => setProducts(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !collectionId) return;
    fetch(`/api/collections/${collectionId}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { collection?: CollectionPayload; error?: string };
        if (!res.ok || !data.collection) throw new Error(data.error || "Failed to load collection");
        return data.collection;
      })
      .then((collection) => {
        setForm(collection);
        setSelectedImageIds(collection.imageAssetId ? [collection.imageAssetId] : []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [collectionId, mode]);

  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.title, product.handle ?? "", product.status].join(" ").toLowerCase().includes(query)
    );
  }, [productQuery, products]);

  function updateField<K extends keyof CollectionPayload>(key: K, value: CollectionPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleProduct(productId: string) {
    updateField(
      "productIds",
      form.productIds.includes(productId)
        ? form.productIds.filter((id) => id !== productId)
        : [...form.productIds, productId]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(mode === "create" ? "/api/collections" : `/api/collections/${collectionId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imageAssetId: selectedImageIds[0] ?? null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { collection?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save collection");
      router.push(mode === "create" ? "/collections" : `/collections/${collectionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save collection");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!collectionId || !confirm("Delete this collection?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/collections/${collectionId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete collection");
      router.push("/collections");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-400">Loading collection...</div>;
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{mode === "create" ? "New Collection" : "Edit Collection"}</h1>
            <p className="mt-1 text-sm text-gray-400">Organize products into storefront-ready browsing groups.</p>
          </div>
          <Link href="/collections" className="text-sm text-gray-300 hover:text-white">Back to collections</Link>
        </div>

        <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Title</span>
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Handle</span>
                <input value={form.handle} onChange={(event) => updateField("handle", event.target.value)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
            </div>

            <label className="block text-sm text-gray-300">
              <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Description</span>
              <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={5} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">SEO Title</span>
                <input value={form.seoTitle ?? ""} onChange={(event) => updateField("seoTitle", event.target.value || null)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
              <label className="text-sm text-gray-300">
                <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">Sort Order</span>
                <input type="number" value={form.sortOrder} onChange={(event) => updateField("sortOrder", Number(event.target.value) || 0)} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </label>
            </div>

            <label className="block text-sm text-gray-300">
              <span className="mb-2 block text-xs uppercase tracking-wider text-gray-500">SEO Description</span>
              <textarea value={form.seoDescription ?? ""} onChange={(event) => updateField("seoDescription", event.target.value || null)} rows={3} className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
            </label>

            <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
              <input id="collection-published" type="checkbox" checked={form.isPublished} onChange={(event) => updateField("isPublished", event.target.checked)} className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-navy-600" />
              <label htmlFor="collection-published" className="text-sm text-gray-300">Published on the storefront</label>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-200">Products</div>
                  <p className="mt-1 text-xs text-gray-500">Select products to include in this collection.</p>
                </div>
                <input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Filter products" className="w-full max-w-xs rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200" />
              </div>
              <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-800 bg-gray-950/70 p-3">
                <div className="grid gap-2">
                  {filteredProducts.map((product) => (
                    <label key={product.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900/70 px-3 py-2">
                      <div>
                        <div className="text-sm font-medium text-gray-100">{product.title}</div>
                        <div className="text-xs text-gray-500">{product.handle || product.id} · ${product.price.toFixed(2)}</div>
                      </div>
                      <input type="checkbox" checked={form.productIds.includes(product.id)} onChange={() => toggleProduct(product.id)} className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-navy-600" />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <MediaAssetPicker
              label="Collection image"
              helperText="Choose the hero image shown on collection pages and cards."
              selectedIds={selectedImageIds}
              onChange={(ids) => setSelectedImageIds(ids.slice(0, 1))}
            />

            {error ? <div className="text-sm text-red-400">{error}</div> : null}

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between gap-3">
                {mode === "edit" ? (
                  <button type="button" onClick={() => void onDelete()} disabled={deleting || saving} className="rounded-md border border-red-800/60 bg-red-900/20 px-4 py-2 text-sm text-red-200 hover:bg-red-900/30 disabled:opacity-60">
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                ) : <div />}
                <button type="submit" disabled={saving} className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60">
                  {saving ? "Saving..." : mode === "create" ? "Create Collection" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}