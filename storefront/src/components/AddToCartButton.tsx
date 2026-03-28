"use client";

import { useState } from "react";

import { addToCart } from "@/lib/cart/storage";
import type { CartItem } from "@/lib/cart/types";

export function AddToCartButton({
  store,
  item,
  disabled = false,
  disabledLabel = "Unavailable",
}: {
  store: string;
  item: CartItem;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        addToCart(store, { ...item, quantity: Math.max(1, Math.floor(item.quantity)) });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
    >
      {disabled ? disabledLabel : added ? "Added" : "Add to cart"}
    </button>
  );
}
