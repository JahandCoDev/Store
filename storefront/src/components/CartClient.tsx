"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { clearCart, loadCart, removeFromCart, updateQuantity } from "@/lib/cart/storage";

type CartQuoteItem = {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

type CartQuoteResponse = {
  currency: string;
  subtotal: number;
  items: CartQuoteItem[];
};

export function CartClient({ store }: { store: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [cartVersion, setCartVersion] = useState(0);
  const cart = useMemo(() => loadCart(store), [store, cartVersion]);

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
      router.replace(`/${store}/cart`);
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
    <div className="section section--page-width" style={{ padding: "48px 0" }}>
      <h1>Cart</h1>

      {error ? (
        <p style={{ marginTop: 12 }}>{error}</p>
      ) : null}

      {cart.items.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <p style={{ opacity: 0.8 }}>Your cart is empty.</p>
          <div style={{ marginTop: 16 }}>
            <Link className="button" href={`/${store}/collections/all`}>
              Continue shopping
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 16, opacity: 0.8 }}>
            {isLoading ? "Loading…" : null}
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {(quote?.items ?? cart.items.map((i) => ({ productId: i.productId, title: i.productId, price: 0, quantity: i.quantity, lineTotal: 0 }))).map(
              (item) => (
                <div
                  key={item.productId}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                    <div style={{ marginTop: 6, opacity: 0.8 }}>
                      {item.price ? `$${item.price.toFixed(2)}` : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ opacity: 0.8 }}>Qty</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          updateQuantity(store, item.productId, next);
                          setCartVersion((v) => v + 1);
                        }}
                        style={{ width: 72, padding: "8px 10px" }}
                      />
                    </label>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() => {
                        removeFromCart(store, item.productId);
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

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>
              Subtotal: {quote ? `$${quote.subtotal.toFixed(2)}` : "—"}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="button-secondary" href={`/${store}/collections/all`}>
                Continue shopping
              </Link>
              <button
                className="button"
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
