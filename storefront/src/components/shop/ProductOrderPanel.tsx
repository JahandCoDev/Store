"use client";

import { useEffect, useMemo, useState } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { QuantitySelector } from "@/components/shop/QuantitySelector";
import { buildCartItemKey } from "@/lib/cart/itemKey";
import type { CartItem } from "@/lib/cart/types";

import { ShirtTextPreview } from "./ShirtTextPreview";

const SIZES: Array<NonNullable<CartItem["options"]>["size"]> = ["S", "M", "L"];
const COLORS: Array<NonNullable<CartItem["options"]>["color"]> = ["Black", "White", "Navy"];

type ProductVariantSummary = {
  id: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  inventory: number;
  trackInventory: boolean;
  size: string | null;
  color: string | null;
};

function colorSwatchClass(color: NonNullable<CartItem["options"]>["color"]) {
  switch (color) {
    case "Black":
      return "bg-black";
    case "White":
      return "bg-white";
    case "Navy":
      return "bg-sky-950";
  }
}

function yesNoButtonClass(active: boolean) {
  return (
    "rounded-full border px-3 py-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 " +
    (active ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20")
  );
}

function optionButtonClass(active: boolean) {
  return (
    "rounded-full border px-3 py-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 " +
    (active ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20")
  );
}

export function ProductOrderPanel({
  store,
  productId,
  previewImageUrl,
  variants,
}: {
  store: string;
  productId: string;
  previewImageUrl: string | null;
  variants: ProductVariantSummary[];
}) {
  const [quantity, setQuantity] = useState(1);

  const [size, setSize] = useState<NonNullable<CartItem["options"]>["size"]>(variants.find((variant) => variant.size)?.size ?? "M");
  const [color, setColor] = useState<NonNullable<CartItem["options"]>["color"]>(variants.find((variant) => variant.color)?.color ?? "Black");

  const [backDesignEnabled, setBackDesignEnabled] = useState(false);
  const [backDesignNumber, setBackDesignNumber] = useState<string>("");

  const [specialTextEnabled, setSpecialTextEnabled] = useState(false);
  const [specialFront, setSpecialFront] = useState(true);
  const [specialBack, setSpecialBack] = useState(false);
  const [specialText, setSpecialText] = useState("");

  const [frontPos, setFrontPos] = useState({ x: 50, y: 40 });
  const [backPos, setBackPos] = useState({ x: 50, y: 40 });

  const hasStructuredVariants = useMemo(
    () => variants.some((variant) => Boolean(variant.size) || Boolean(variant.color)),
    [variants]
  );

  const sizeOptions = useMemo(() => {
    if (!hasStructuredVariants) return SIZES;
    const values = Array.from(new Set(variants.map((variant) => variant.size).filter(Boolean))) as string[];
    return values.length ? values : SIZES;
  }, [hasStructuredVariants, variants]);

  const colorOptions = useMemo(() => {
    if (!hasStructuredVariants) return COLORS;
    const values = Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean))) as string[];
    return values.length ? values : COLORS;
  }, [hasStructuredVariants, variants]);

  const selectedVariant = useMemo(() => {
    if (variants.length === 0) return null;
    if (!hasStructuredVariants) return variants[0];

    return (
      variants.find((variant) => (variant.size ?? size) === size && (variant.color ?? color) === color) ??
      variants.find((variant) => (variant.size ?? size) === size) ??
      variants.find((variant) => (variant.color ?? color) === color) ??
      variants[0]
    );
  }, [color, hasStructuredVariants, size, variants]);

  useEffect(() => {
    if (!selectedVariant?.trackInventory) return;
    if (selectedVariant.inventory > 0 && quantity > selectedVariant.inventory) {
      setQuantity(selectedVariant.inventory);
    }
  }, [quantity, selectedVariant]);

  const options = useMemo<CartItem["options"]>(() => {
    const normalizedSpecialTextEnabled = Boolean(specialTextEnabled);
    const normalizedBackDesignEnabled = Boolean(backDesignEnabled);

    const designNumber = Number(backDesignNumber);
    const safeDesignNumber =
      normalizedBackDesignEnabled && Number.isFinite(designNumber) && designNumber > 0 ? Math.floor(designNumber) : null;

    const normalizedText = (specialText ?? "").slice(0, 10);

    const anySideSelected = specialFront || specialBack;

    return {
      size,
      color,
      backDesign: {
        enabled: normalizedBackDesignEnabled,
        designNumber: safeDesignNumber,
      },
      specialText: {
        enabled: normalizedSpecialTextEnabled,
        front: normalizedSpecialTextEnabled ? (anySideSelected ? specialFront : true) : false,
        back: normalizedSpecialTextEnabled ? (anySideSelected ? specialBack : false) : false,
        text: normalizedSpecialTextEnabled ? normalizedText : "",
        frontPos,
        backPos,
      },
    };
  }, [backDesignEnabled, backDesignNumber, color, frontPos, backPos, size, specialBack, specialFront, specialText, specialTextEnabled]);

  const item = useMemo<CartItem>(() => {
    const key = buildCartItemKey(productId, options, selectedVariant?.id ?? null);
    return {
      key,
      productId,
      variantId: selectedVariant?.id ?? null,
      quantity,
      options,
    };
  }, [options, productId, quantity, selectedVariant?.id]);

  const isOutOfStock = Boolean(selectedVariant?.trackInventory && (selectedVariant.inventory ?? 0) <= 0);
  const quantityLabel = selectedVariant?.trackInventory
    ? selectedVariant.inventory <= 0
      ? "Out of stock"
      : selectedVariant.inventory <= 3
        ? `Only ${selectedVariant.inventory} left`
        : `${selectedVariant.inventory} in stock`
    : "Inventory not tracked";

  const showBackDetails = backDesignEnabled;
  const showSpecialDetails = specialTextEnabled;

  const effectiveSpecialFront = options?.specialText?.front ?? false;
  const effectiveSpecialBack = options?.specialText?.back ?? false;

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {backDesignEnabled ? (
          <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold tracking-wide text-zinc-200">
            Back Design
          </div>
        ) : null}

        <div className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-white">Size</div>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((s) => (
                <button key={s} type="button" className={optionButtonClass(size === s)} onClick={() => setSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="text-sm font-semibold text-white">Color</div>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((c) => {
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    className={
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 " +
                      (active
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20")
                    }
                    onClick={() => setColor(c)}
                  >
                    <span className={"h-3 w-3 rounded-full border border-white/20 " + colorSwatchClass(c)} aria-hidden="true" />
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm font-semibold text-white">Quantity</div>
            <QuantitySelector value={quantity} onChange={setQuantity} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Back Design</div>
            <div className="mt-1 text-sm text-zinc-400">Optional</div>
          </div>
          <div className="flex gap-2">
            <button type="button" className={yesNoButtonClass(!backDesignEnabled)} onClick={() => setBackDesignEnabled(false)}>
              No
            </button>
            <button type="button" className={yesNoButtonClass(backDesignEnabled)} onClick={() => setBackDesignEnabled(true)}>
              Yes
            </button>
          </div>
        </div>

        {showBackDetails ? (
          <label className="grid gap-2">
            <span className="text-sm text-zinc-300">Enter the number of your preferred design from the Design gallery</span>
            <input
              inputMode="numeric"
              value={backDesignNumber}
              onChange={(e) => setBackDesignNumber(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="e.g. 12"
            />
          </label>
        ) : null}
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-white">Special Text</div>
            <div className="mt-1 text-sm text-zinc-400">Optional • Max 10 characters</div>
          </div>
          <div className="flex gap-2">
            <button type="button" className={yesNoButtonClass(!specialTextEnabled)} onClick={() => setSpecialTextEnabled(false)}>
              No
            </button>
            <button type="button" className={yesNoButtonClass(specialTextEnabled)} onClick={() => setSpecialTextEnabled(true)}>
              Yes
            </button>
          </div>
        </div>

        {showSpecialDetails ? (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={optionButtonClass(specialFront)}
                onClick={() => setSpecialFront((v) => !v)}
              >
                Front of Shirt
              </button>
              <button
                type="button"
                className={optionButtonClass(specialBack)}
                onClick={() => setSpecialBack((v) => !v)}
              >
                Back of Shirt
              </button>
            </div>

            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">Text</span>
              <input
                value={specialText}
                maxLength={10}
                onChange={(e) => setSpecialText(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="Up to 10 chars"
              />
            </label>

            <div className="grid gap-4">
              {effectiveSpecialFront ? (
                <ShirtTextPreview
                  imageUrl={previewImageUrl}
                  label="Interactive Preview (Front)"
                  text={specialText}
                  position={frontPos}
                  onChange={setFrontPos}
                />
              ) : null}

              {effectiveSpecialBack ? (
                <ShirtTextPreview
                  imageUrl={previewImageUrl}
                  label="Interactive Preview (Back)"
                  text={specialText}
                  position={backPos}
                  onChange={setBackPos}
                />
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AddToCartButton
          store={store}
          item={item}
          disabled={!selectedVariant || isOutOfStock}
          disabledLabel={selectedVariant ? "Out of stock" : "Unavailable"}
        />
        {selectedVariant ? (
          <div className="text-sm text-zinc-400">
            <span className="font-semibold text-white">${selectedVariant.price.toFixed(2)}</span>
            {selectedVariant.compareAtPrice ? (
              <span className="ml-2 text-zinc-500 line-through">${selectedVariant.compareAtPrice.toFixed(2)}</span>
            ) : null}
            <span className="ml-3">{quantityLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
