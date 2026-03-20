"use client";

import { useState } from "react";

import { addToCart } from "@/lib/cart/storage";

export function AddToCartButton({
  store,
  productId,
}: {
  store: string;
  productId: string;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      className="button"
      type="button"
      onClick={() => {
        addToCart(store, { productId, quantity: 1 });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
    >
      {added ? "Added" : "Add to cart"}
    </button>
  );
}
