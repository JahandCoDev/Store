"use client";

import { useState } from "react";

import { addToCart } from "@/lib/cart/storage";
import type { CartItem } from "@/lib/cart/types";

export function AddToCartButton({
  store,
  item,
}: {
  store: string;
  item: CartItem;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      className="btn btn-primary"
      type="button"
      onClick={() => {
        addToCart(store, { ...item, quantity: Math.max(1, Math.floor(item.quantity)) });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
    >
      {added ? "Added" : "Add to cart"}
    </button>
  );
}
