"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  inventory: number;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [inventory, setInventory] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productId, setProductId] = useState<string>("");

  useEffect(() => {
    params.then(({ id }) => {
      setProductId(id);
      fetch(`/api/products/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || "Failed to load product");
          }
          return res.json() as Promise<Product>;
        })
        .then((data) => {
          setProduct(data);
          setTitle(data.title);
          setDescription(data.description ?? "");
          setPrice(String(data.price));
          setInventory(String(data.inventory));
        })
        .catch((err) => setLoadError(err?.message || "Failed to load product"))
        .finally(() => setLoading(false));
    });
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setError("");

    const parsedPrice = Number(price);
    const parsedInventory = Number(inventory);
    if (!title.trim()) return setError("Title is required");
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return setError("Price must be a valid number");
    if (!Number.isInteger(parsedInventory) || parsedInventory < 0)
      return setError("Inventory must be a whole number");

    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          inventory: parsedInventory,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update product");
      }

      router.push("/products");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to update product");
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete() {
    if (!productId) return;
    if (!confirm("Are you sure you want to delete this product? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete product");
      }
      router.push("/products");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-400">{loadError || "Product not found."}</p>
        <Link href="/products" className="mt-4 inline-block text-sm text-gray-300 hover:underline">
          ← Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Edit Product</h1>
          <Link href="/products" className="text-sm text-gray-300 hover:underline">
            ← Back to Products
          </Link>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              placeholder="Classic Tee"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              placeholder="Short product description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Price</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="29.99"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Inventory</label>
              <input
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="100"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting || isSaving}
              className="rounded-md border border-red-800/60 bg-red-900/20 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-900/40 disabled:opacity-60"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
                disabled={isSaving || isDeleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60"
                disabled={isSaving || isDeleting}
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
