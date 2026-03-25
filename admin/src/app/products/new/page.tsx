"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import MediaAssetPicker, { type MediaAssetSummary } from "@/components/MediaAssetPicker";
import { slugify } from "@/lib/slug";

const STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
type ProductStatus = (typeof STATUSES)[number];

export default function NewProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [imagesInput, setImagesInput] = useState<string>("");
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<MediaAssetSummary[]>([]);
  const [status, setStatus] = useState<ProductStatus>("DRAFT");
  const [price, setPrice] = useState<string>("10");
  const [backDesignUpcharge, setBackDesignUpcharge] = useState<string>("5");
  const [specialTextUpcharge, setSpecialTextUpcharge] = useState<string>("0");
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

  const images = Array.from(
    new Set([
      ...selectedAssets.map((asset) => asset.url),
      ...imagesInput
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean),
    ])
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const parsedPrice = Number(price);
    const parsedBackDesignUpcharge = Number(backDesignUpcharge);
    const parsedSpecialTextUpcharge = Number(specialTextUpcharge);
    const parsedInventory = Number(inventory);
    if (!title.trim()) return setError("Title is required");
    if (!Number.isFinite(parsedPrice)) return setError("Price must be a number");
    if (!Number.isFinite(parsedBackDesignUpcharge) || parsedBackDesignUpcharge < 0) {
      return setError("Back design upcharge must be a valid number");
    }
    if (!Number.isFinite(parsedSpecialTextUpcharge) || parsedSpecialTextUpcharge < 0) {
      return setError("Special text upcharge must be a valid number");
    }
    if (!Number.isFinite(parsedInventory)) return setError("Inventory must be a number");

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          handle: handle.trim() ? handle.trim() : null,
          description: description.trim(),
          images,
          status,
          price: parsedPrice,
          backDesignUpcharge: parsedBackDesignUpcharge,
          specialTextUpcharge: parsedSpecialTextUpcharge,
          compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
          cost: cost ? Number(cost) : null,
          inventory: parsedInventory,
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          weight: weight ? Number(weight) : null,
          vendor: vendor.trim() || null,
          tags,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error || "Failed to create product");
      }

      router.push("/products");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">New Product</h1>

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
                  if (!handleTouched) setHandle(slugify(nextTitle));
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
              placeholder="Short product description"
              rows={3}
            />
          </div>

          <MediaAssetPicker
            label="Product images"
            helperText="Upload images to the project and reuse them across products, collections, and pages."
            multiple
            allowProjectImageImports
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
            <p className="mt-2 text-xs text-gray-500">Use this only for legacy or external images you are not storing in the project.</p>
          </div>

          {/* Price + Compare-at + Cost */}
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
              <label className="mb-1 block text-sm font-medium text-gray-300">Back design upcharge</label>
              <input
                value={backDesignUpcharge}
                onChange={(e) => setBackDesignUpcharge(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="5.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Special text upcharge</label>
              <input
                value={specialTextUpcharge}
                onChange={(e) => setSpecialTextUpcharge(e.target.value)}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 disabled:opacity-60"
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
