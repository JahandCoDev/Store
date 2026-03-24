"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import MediaAssetPicker, { type MediaAssetSummary } from "@/components/MediaAssetPicker";
import { slugify } from "@/lib/slug";

const STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
type ProductStatus = (typeof STATUSES)[number];

interface Product {
  id: string;
  handle: string | null;
  title: string;
  description: string;
  status: ProductStatus;
  price: number;
  compareAtPrice: number | null;
  cost: number | null;
  inventory: number;
  sku: string | null;
  barcode: string | null;
  weight: number | null;
  vendor: string | null;
  tags: string[];
  images: unknown;
}

function getImageUrlsFromJson(images: unknown): string[] {
  if (!images) return [];
  if (typeof images === "string") return images.trim() ? [images.trim()] : [];
  if (!Array.isArray(images)) return [];

  const urls: string[] = [];
  for (const img of images) {
    if (typeof img === "string" && img.trim()) urls.push(img.trim());
    else if (img && typeof img === "object") {
      const maybeUrl = (img as { url?: unknown }).url;
      const maybeSrc = (img as { src?: unknown }).src;
      const url = typeof maybeUrl === "string" ? maybeUrl : typeof maybeSrc === "string" ? maybeSrc : null;
      if (url && url.trim()) urls.push(url.trim());
    }
  }
  return urls;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  // Form fields
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [imagesInput, setImagesInput] = useState<string>("");
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<MediaAssetSummary[]>([]);
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [price, setPrice] = useState<string>("");
  const [compareAtPrice, setCompareAtPrice] = useState<string>("");
  const [cost, setCost] = useState<string>("");
  const [inventory, setInventory] = useState<string>("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [weight, setWeight] = useState<string>("");
  const [vendor, setVendor] = useState("");
  const [tagsInput, setTagsInput] = useState<string>("");

  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productId, setProductId] = useState<string>("");

  const images = Array.from(
    new Set([
      ...selectedAssets.map((asset) => asset.url),
      ...imagesInput
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean),
    ])
  );

  useEffect(() => {
    params.then(({ id }) => {
      setProductId(id);
      fetch(`/api/products/${id}`)
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error((data as { error?: string })?.error || "Failed to load product");
          }
          return res.json() as Promise<Product>;
        })
        .then((data) => {
          setProduct(data);
          setTitle(data.title);
          setHandle(data.handle ?? slugify(data.title));
          setDescription(data.description ?? "");
          setStatus(data.status ?? "DRAFT");
          setPrice(String(data.price));
          setCompareAtPrice(data.compareAtPrice != null ? String(data.compareAtPrice) : "");
          setCost(data.cost != null ? String(data.cost) : "");
          setInventory(String(data.inventory));
          setImagesInput(getImageUrlsFromJson(data.images).join("\n"));
          setSku(data.sku ?? "");
          setBarcode(data.barcode ?? "");
          setWeight(data.weight != null ? String(data.weight) : "");
          setVendor(data.vendor ?? "");
          setTagsInput((data.tags ?? []).join(", "));
        })
        .catch((err: Error) => setLoadError(err?.message || "Failed to load product"))
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
    if (!Number.isInteger(parsedInventory) || parsedInventory < 0) return setError("Inventory must be a whole number");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          handle: handle.trim() ? handle.trim() : null,
          description: description.trim(),
          status,
          price: parsedPrice,
          compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
          cost: cost ? Number(cost) : null,
          inventory: parsedInventory,
            images,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          weight: weight ? Number(weight) : null,
          vendor: vendor.trim() || null,
          tags,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error || "Failed to update product");
      }

      router.push("/products");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update product");
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
        throw new Error((data as { error?: string })?.error || "Failed to delete product");
      }
      router.push("/products");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
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

        <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-gray-800 bg-gray-900 p-6">
          {/* Title + Status */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-300">Title</label>
              <input
                value={title}
                onChange={(e) => {
                  const nextTitle = e.target.value;
                  setTitle(nextTitle);
                  if (!handleTouched && !product?.handle) setHandle(slugify(nextTitle));
                }}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="Classic Tee"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Handle */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Handle <span className="text-gray-500 text-xs">(URL slug)</span>
            </label>
            <input
              value={handle}
              onChange={(e) => {
                setHandleTouched(true);
                setHandle(e.target.value);
              }}
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              placeholder="classic-tee"
            />
            <p className="mt-2 text-xs text-gray-500">Used in storefront URLs: /products/&lt;handle&gt;</p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              rows={3}
            />
          </div>

          <MediaAssetPicker
            label="Product images"
            helperText="Choose project-stored images for this product. Existing URLs remain in the field below until you replace them."
            multiple
            selectedIds={selectedImageIds}
            onChange={(ids: string[], assets: MediaAssetSummary[]) => {
              setSelectedImageIds(ids);
              setSelectedAssets(assets);
            }}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Extra Image URLs <span className="text-gray-500 text-xs">(optional, one per line)</span>
            </label>
            <textarea
              value={imagesInput}
              onChange={(e) => setImagesInput(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              placeholder="https://example.com/image.jpg"
              rows={3}
            />
            <p className="mt-2 text-xs text-gray-500">This field preserves any legacy external URLs that are already on the product.</p>
          </div>

          {/* Price + Compare at + Cost */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <label className="mb-1 block text-sm font-medium text-gray-300">Compare-at Price</label>
              <input
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="39.99"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Cost per item</label>
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="12.00"
              />
            </div>
          </div>

          {/* Inventory + SKU + Barcode */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Inventory</label>
              <input
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">SKU</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="ABC-001"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Barcode</label>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="012345678901"
              />
            </div>
          </div>

          {/* Vendor + Weight */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Vendor</label>
              <input
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="Supplier name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Weight (lbs)</label>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="0.5"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Tags <span className="text-gray-500 text-xs">(comma-separated)</span>
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
              placeholder="sale, featured, cotton"
            />
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
