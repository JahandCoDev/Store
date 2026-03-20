"use client";

import type { CartItem, CartState } from "./types";

function keyForStore(store: string) {
  return `jahandco_cart_${store}`;
}

export function loadCart(store: string): CartState {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = window.localStorage.getItem(keyForStore(store));
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || !Array.isArray(parsed.items)) return { items: [] };
    return {
      items: parsed.items
        .filter((i) => i && typeof i.productId === "string" && typeof i.quantity === "number")
        .map((i) => ({ productId: i.productId, quantity: Math.max(1, Math.floor(i.quantity)) })),
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
  const existing = cart.items.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity = Math.max(1, existing.quantity + item.quantity);
  } else {
    cart.items.push({ productId: item.productId, quantity: Math.max(1, item.quantity) });
  }
  saveCart(store, cart);
}

export function updateQuantity(store: string, productId: string, quantity: number) {
  const cart = loadCart(store);
  cart.items = cart.items
    .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.floor(quantity)) } : i))
    .filter((i) => i.quantity > 0);
  saveCart(store, cart);
}

export function removeFromCart(store: string, productId: string) {
  const cart = loadCart(store);
  cart.items = cart.items.filter((i) => i.productId !== productId);
  saveCart(store, cart);
}

export function clearCart(store: string) {
  saveCart(store, { items: [] });
}
