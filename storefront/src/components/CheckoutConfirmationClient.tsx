"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { loadCart, clearCart } from "@/lib/cart/storage";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

type CartQuoteItem = {
  key: string;
  title: string;
  variantTitle?: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
};

type CheckoutState = {
  store: string;
  createdAt: string;
  orderId: string;
  orderNumber: number;
  currency: string;
  subtotal: number;
  items: CartQuoteItem[];
  shipping: {
    email: string;
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  paid?: boolean;
};

const CHECKOUT_STATE_KEY_PREFIX = "checkout:lastOrder:";

function readCheckoutState(store: string): CheckoutState | null {
  try {
    const raw = localStorage.getItem(`${CHECKOUT_STATE_KEY_PREFIX}${store}`);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutState;
  } catch {
    return null;
  }
}

export function CheckoutConfirmationClient({ store }: { store: string }) {
  const searchParams = useSearchParams();
  const publicBasePath = usePublicBasePath(store);

  const [state, setState] = useState<CheckoutState | null>(null);

  const redirectStatus = searchParams.get("redirect_status");
  const success = redirectStatus === "succeeded";

  const shouldClearCart = useMemo(() => {
    if (!state) return false;
    return Boolean(state.paid || success);
  }, [state, success]);

  useEffect(() => {
    setState(readCheckoutState(store));
  }, [store]);

  useEffect(() => {
    if (!shouldClearCart) return;

    // Only clear if cart still has items.
    const cart = loadCart(store);
    if (cart.items.length > 0) {
      clearCart(store);
    }

    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, paid: true };
      try {
        localStorage.setItem(`${CHECKOUT_STATE_KEY_PREFIX}${store}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [shouldClearCart, store]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Order confirmation</h1>
          <p className="mt-3 text-sm text-zinc-400">Thanks for your order. A confirmation email will be sent to you.</p>
        </div>
        <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
          Continue shopping
        </Link>
      </div>

      {!state ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-zinc-950/40 p-6">
          <p className="text-sm text-zinc-300">We couldn’t load your order summary in this browser.</p>
          <p className="mt-2 text-sm text-zinc-400">If payment succeeded, check your inbox for the confirmation email.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-6">
            <h2 className="text-lg font-semibold text-white">Order summary</h2>
            <p className="mt-2 text-sm text-zinc-400">Order #{state.orderNumber}</p>

            <div className="mt-5 grid gap-3">
              {state.items.map((item) => (
                <div key={item.key} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                      {item.variantTitle && item.variantTitle !== item.title ? (
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{item.variantTitle}</div>
                      ) : null}
                      <div className="mt-2 text-sm text-zinc-400">Qty {item.quantity}</div>
                    </div>
                    <div className="text-sm font-semibold text-white">${item.lineTotal.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
              <div className="text-zinc-200">Total</div>
              <div className="text-lg font-semibold text-white">${state.subtotal.toFixed(2)}</div>
            </div>

            <div className="mt-4 text-sm text-zinc-400">
              Status: <span className="text-zinc-200">{state.paid || success ? "Paid" : "Processing"}</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-6">
            <h2 className="text-lg font-semibold text-white">Shipping</h2>
            <div className="mt-4 grid gap-2 text-sm text-zinc-300">
              <div>{state.shipping.name}</div>
              <div>{state.shipping.line1}</div>
              {state.shipping.line2 ? <div>{state.shipping.line2}</div> : null}
              <div>
                {state.shipping.city}, {state.shipping.state} {state.shipping.zip}
              </div>
              <div>{state.shipping.country}</div>
              <div className="mt-3 text-zinc-400">Email: {state.shipping.email}</div>
              {state.shipping.phone ? <div className="text-zinc-400">Phone: {state.shipping.phone}</div> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
