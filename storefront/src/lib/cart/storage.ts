"use client";

import type { CartItem, CartState } from "./types";
import { buildCartItemKey } from "./itemKey";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function keyForStore(store: string) {
  return `jahandco_cart_${store}`;
}

export function loadCart(store: string): CartState {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = window.localStorage.getItem(keyForStore(store));
    if (!raw) return { items: [] };

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || !Array.isArray(parsed.items)) return { items: [] };

    const parsedItems = parsed.items as unknown[];
    return {
      items: parsedItems
        .filter((i): i is Record<string, unknown> => isRecord(i) && typeof i.productId === "string" && typeof i.quantity === "number")
        .map((i) => {
          const productId = i.productId as string;
          const quantity = Math.max(1, Math.floor(i.quantity as number));
          const options = isRecord(i.options) ? (i.options as CartItem["options"]) : undefined;
          const key = typeof i.key === "string" && i.key.trim() ? i.key : buildCartItemKey(productId, options);
          return { key, productId, quantity, options } satisfies CartItem;
        }),
    };
  } catch {
    return { items: [] };
  }
}

export function saveCart(store: string, cart: CartState) {
  window.localStorage.setItem(keyForStore(store), JSON.stringify(cart));
}

export function addToCart(store: string, item: CartItem) {
  const cart = loadCart(store);
  const existing = cart.items.find((i) => i.key === item.key);
  if (existing) {
    existing.quantity = Math.max(1, existing.quantity + item.quantity);
  } else {
    cart.items.push({ ...item, quantity: Math.max(1, item.quantity) });
  }
  saveCart(store, cart);
}

export function updateQuantity(store: string, key: string, quantity: number) {
  const cart = loadCart(store);
  cart.items = cart.items
    .map((i) => (i.key === key ? { ...i, quantity: Math.max(1, Math.floor(quantity)) } : i))
    .filter((i) => i.quantity > 0);
  saveCart(store, cart);
}

export function removeFromCart(store: string, key: string) {
  const cart = loadCart(store);
  cart.items = cart.items.filter((i) => i.key !== key);
  saveCart(store, cart);
}

export function clearCart(store: string) {
  saveCart(store, { items: [] });
}
