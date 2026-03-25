"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { clearCart, loadCart, removeFromCart, updateQuantity } from "@/lib/cart/storage";
import { cartOptionLines } from "@/lib/cart/optionsSummary";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

type CartQuoteItem = {
  key: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
  lineTotal: number;
  optionLines?: string[];
};

type CartQuoteResponse = {
  currency: string;
  subtotal: number;
  items: CartQuoteItem[];
};

export function CartClient({ store }: { store: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const publicBasePath = usePublicBasePath(store);

  const [cartVersion, setCartVersion] = useState(0);
  const cart = useMemo(() => {
    // Intentionally depend on cartVersion to refresh memoized cart reads.
    void cartVersion;
    return loadCart(store);
  }, [store, cartVersion]);

  const [quote, setQuote] = useState<CartQuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshQuote() {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/storefront/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ store, items: cart.items }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load cart");
      }

      const json = (await res.json()) as CartQuoteResponse;
      setQuote(json);
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : "Failed to load cart");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Clear cart after successful Stripe return.
    const success = searchParams.get("success");
    if (success === "1") {
      clearCart(store);
      setCartVersion((v) => v + 1);
      router.replace(resolveStorefrontHref(publicBasePath, "/cart"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  useEffect(() => {
    refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, cartVersion]);

  async function startCheckout() {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/storefront/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ store, items: cart.items }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Checkout failed");
      }
      const json = (await res.json()) as { url: string };
      if (!json.url) throw new Error("Stripe session missing URL");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Cart</h1>
          <p className="mt-3 text-sm text-zinc-400">Review items and checkout.</p>
        </div>
        <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
          Continue shopping
        </Link>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {cart.items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-zinc-950/40 p-6">
          <p className="text-sm text-zinc-300">Your cart is empty.</p>
          <div className="mt-5">
            <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
              Continue shopping
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 text-sm text-zinc-400">{isLoading ? "Updating…" : null}</div>

          <div className="mt-5 grid gap-3">
            {(quote?.items ??
              cart.items.map((i) => ({
                key: i.key,
                productId: i.productId,
                title: i.productId,
                price: 0,
                quantity: i.quantity,
                lineTotal: 0,
                optionLines: cartOptionLines(i.options),
              }))).map(
              (item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-zinc-950/40 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    {item.optionLines?.length ? (
                      <div className="mt-2 grid gap-1 text-sm text-zinc-400">
                        {item.optionLines.slice(0, 6).map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 text-sm text-zinc-400">
                      {item.price ? `$${item.price.toFixed(2)}` : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-start gap-3 sm:justify-end">
                    <label className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400">Qty</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          updateQuantity(store, item.key, next);
                          setCartVersion((v) => v + 1);
                        }}
                        className="w-20 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                      />
                    </label>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => {
                        removeFromCart(store, item.key);
                        setCartVersion((v) => v + 1);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950/40 p-5">
            <div className="text-sm font-semibold text-white">
              Subtotal: <span className="text-zinc-200">{quote ? `$${quote.subtotal.toFixed(2)}` : "—"}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="btn btn-primary"
                type="button"
                disabled={checkoutLoading || cart.items.length === 0}
                onClick={startCheckout}
              >
                {checkoutLoading ? "Redirecting…" : "Checkout"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
