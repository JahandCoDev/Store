"use client";

import { useState } from "react";

import { addToCart } from "@/lib/cart/storage";

export function AddToCartButton({
  store,
  productId,
  quantity = 1,
}: {
  store: string;
  productId: string;
  quantity?: number;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      className="btn btn-primary"
      type="button"
      onClick={() => {
        addToCart(store, { productId, quantity: Math.max(1, Math.floor(quantity)) });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
    >
      {added ? "Added" : "Add to cart"}
    </button>
  );
}
