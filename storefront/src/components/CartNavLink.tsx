"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CART_STORAGE_EVENT, loadCart } from "@/lib/cart/storage";

function getCartItemCount(store: string) {
  return loadCart(store).items.reduce((sum, item) => sum + item.quantity, 0);
}

export function CartNavLink({ store, href }: { store: string; href: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => setCount(getCartItemCount(store));
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === `jahandco_cart_${store}`) refresh();
    };
    const onCartUpdate = (event: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as { store?: string } | undefined) : undefined;
      if (!detail?.store || detail.store === store) refresh();
    };

    refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CART_STORAGE_EVENT, onCartUpdate);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CART_STORAGE_EVENT, onCartUpdate);
    };
  }, [store]);

  return (
    <Link className="nav-link rounded-full border px-4 py-2 hover:bg-[color:var(--nav-pill-hover)]" style={{ borderColor: "var(--nav-pill-border)" }} href={href}>
      <span className="inline-flex items-center gap-2">
        <span>Cart</span>
        {count > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white" style={{ borderColor: "rgba(77,113,255,0.28)", background: "rgba(45,91,255,0.22)" }}>
            {count}
          </span>
        ) : null}
      </span>
    </Link>
  );
}