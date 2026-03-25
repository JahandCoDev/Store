"use client";

import { useMemo, useState } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { QuantitySelector } from "@/components/shop/QuantitySelector";
import { buildCartItemKey } from "@/lib/cart/itemKey";
import type { CartItem } from "@/lib/cart/types";

import { ShirtTextPreview } from "./ShirtTextPreview";

const SIZES: Array<NonNullable<CartItem["options"]>["size"]> = ["S", "M", "L"];
const COLORS: Array<NonNullable<CartItem["options"]>["color"]> = ["Black", "White", "Navy"];

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
}: {
  store: string;
  productId: string;
  previewImageUrl: string | null;
}) {
  const [quantity, setQuantity] = useState(1);

  const [size, setSize] = useState<NonNullable<CartItem["options"]>["size"]>("M");
  const [color, setColor] = useState<NonNullable<CartItem["options"]>["color"]>("Black");

  const [backDesignEnabled, setBackDesignEnabled] = useState(false);
  const [backDesignNumber, setBackDesignNumber] = useState<string>("");

  const [specialTextEnabled, setSpecialTextEnabled] = useState(false);
  const [specialFront, setSpecialFront] = useState(true);
  const [specialBack, setSpecialBack] = useState(false);
  const [specialText, setSpecialText] = useState("");

  const [frontPos, setFrontPos] = useState({ x: 50, y: 40 });
  const [backPos, setBackPos] = useState({ x: 50, y: 40 });

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
    const key = buildCartItemKey(productId, options);
    return {
      key,
      productId,
      quantity,
      options,
    };
  }, [options, productId, quantity]);

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
              {SIZES.map((s) => (
                <button key={s} type="button" className={optionButtonClass(size === s)} onClick={() => setSize(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="text-sm font-semibold text-white">Color</div>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => {
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
        <AddToCartButton store={store} item={item} />
      </div>
    </div>
  );
}
