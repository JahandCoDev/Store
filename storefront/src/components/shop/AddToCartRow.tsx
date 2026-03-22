"use client";

import { useState } from "react";

import { AddToCartButton } from "@/components/AddToCartButton";
import { QuantitySelector } from "@/components/shop/QuantitySelector";

export function AddToCartRow({
  store,
  productId,
}: {
  store: string;
  productId: string;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <QuantitySelector value={quantity} onChange={setQuantity} />
      <AddToCartButton store={store} productId={productId} quantity={quantity} />
    </div>
  );
}
