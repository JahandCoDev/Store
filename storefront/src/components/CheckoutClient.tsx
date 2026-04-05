"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";

import { clearCart, loadCart } from "@/lib/cart/storage";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

type CartQuoteItem = {
  key: string;
  productId: string;
  variantId?: string | null;
  title: string;
  variantTitle?: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  optionLines?: string[];
  canCheckout?: boolean;
  stockMessage?: string | null;
};

type CartQuoteResponse = {
  currency: string;
  subtotal: number;
  items: CartQuoteItem[];
};

type CheckoutUser = { id: string; email: string; name: string | null };

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

function writeCheckoutState(store: string, state: CheckoutState) {
  try {
    localStorage.setItem(`${CHECKOUT_STATE_KEY_PREFIX}${store}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function PaymentForm({
  store,
  clientSecret,
  onPaid,
}: {
  store: string;
  clientSecret: string;
  onPaid: () => void;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const publicBasePath = usePublicBasePath(store);

  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setIsPaying(true);
    setError(null);

    try {
      if (!stripe || !elements) throw new Error("Payments are still loading");

      const returnUrl = new URL(window.location.href);
      returnUrl.pathname = resolveStorefrontHref(publicBasePath, "/checkout/confirmation");
      returnUrl.search = "";

      const res = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl.toString(),
        },
        redirect: "if_required",
      });

      if (res.error) {
        throw new Error(res.error.message || "Payment failed");
      }

      if (res.paymentIntent?.status === "succeeded") {
        onPaid();
        router.push(resolveStorefrontHref(publicBasePath, "/checkout/confirmation"));
        return;
      }

      // If Stripe needed a redirect (3DS) we won't reach here.
      router.push(resolveStorefrontHref(publicBasePath, "/checkout/confirmation"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
      <h2 className="text-lg font-semibold text-white">Payment</h2>
      <div className="mt-4">
        <PaymentElement />
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="btn btn-primary" type="button" disabled={isPaying || !stripe || !elements} onClick={pay}>
          {isPaying ? "Processing…" : "Pay now"}
        </button>
      </div>

      <p className="mt-3 text-xs text-zinc-500">Payments are processed securely by Stripe.</p>
    </div>
  );
}

export function CheckoutClient({ store, user }: { store: string; user: CheckoutUser | null }) {
  const router = useRouter();
  const publicBasePath = usePublicBasePath(store);

  const stripePromise = useMemo(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
    return key ? loadStripe(key) : null;
  }, []);

  const [mode, setMode] = useState<"guest" | "signedIn" | null>(user ? "signedIn" : null);
  const cart = useMemo(() => loadCart(store), [store]);

  const [quote, setQuote] = useState<CartQuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");

  const [intentLoading, setIntentLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const canCheckout = Boolean(
    mode &&
      cart.items.length > 0 &&
      !quote?.items.some((i) => i.canCheckout === false) &&
      email.trim() &&
      name.trim() &&
      line1.trim() &&
      city.trim() &&
      state.trim() &&
      zip.trim() &&
      country.trim()
  );

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
    refreshQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function createPaymentIntent() {
    if (!canCheckout) return;

    setIntentLoading(true);
    setError(null);

    try {
      if (!stripePromise) throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");

      const res = await fetch("/api/storefront/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          store,
          items: cart.items,
          shipping: {
            email,
            name,
            phone,
            line1,
            line2,
            city,
            state,
            zip,
            country,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Checkout failed");
      }

      const json = (await res.json()) as {
        clientSecret: string;
        orderId: string;
        orderNumber: number;
        currency: string;
        subtotal: number;
      };

      if (!json.clientSecret || !json.orderId || !json.orderNumber) {
        throw new Error("Checkout response missing required fields");
      }

      setClientSecret(json.clientSecret);

      writeCheckoutState(store, {
        store,
        createdAt: new Date().toISOString(),
        orderId: json.orderId,
        orderNumber: json.orderNumber,
        currency: json.currency,
        subtotal: json.subtotal,
        items: quote?.items ?? [],
        shipping: {
          email,
          name,
          phone,
          line1,
          line2,
          city,
          state,
          zip,
          country,
        },
      });
    } catch (e) {
      setClientSecret(null);
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setIntentLoading(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Checkout</h1>
        <p className="mt-3 text-sm text-zinc-400">Your cart is empty.</p>
        <div className="mt-6">
          <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const loginHref = resolveStorefrontHref(publicBasePath, `/account/login?callbackUrl=${encodeURIComponent(resolveStorefrontHref(publicBasePath, "/checkout"))}`);

  const elementsOptions: StripeElementsOptions | undefined = clientSecret
    ? {
        clientSecret,
        appearance: { theme: "night" },
      }
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Checkout</h1>
          <p className="mt-3 text-sm text-zinc-400">Complete your order without leaving the site.</p>
        </div>
        <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/cart")}>
          Back to cart
        </Link>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="grid gap-6">
          {!mode ? (
            <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
              <h2 className="text-lg font-semibold text-white">Sign in or guest</h2>
              <p className="mt-2 text-sm text-zinc-400">Sign in for a faster checkout, or continue as a guest.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className="btn btn-secondary" href={loginHref}>
                  Sign in
                </Link>
                <button className="btn btn-primary" type="button" onClick={() => setMode("guest")}>
                  Continue as guest
                </button>
              </div>
            </div>
          ) : null}

          {mode ? (
            <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
              <h2 className="text-lg font-semibold text-white">Shipping & contact</h2>

              {user && mode === "signedIn" ? (
                <p className="mt-2 text-sm text-zinc-400">Checking out as {user.email}.</p>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm text-zinc-300">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-300">Full name</span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Full name"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-300">Phone (optional)</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="(555) 555-5555"
                  />
                </label>

                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm text-zinc-300">Address line 1</span>
                  <input
                    type="text"
                    required
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Street address"
                  />
                </label>

                <label className="grid gap-2 sm:col-span-2">
                  <span className="text-sm text-zinc-300">Address line 2 (optional)</span>
                  <input
                    type="text"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Apartment, suite, unit"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-300">City</span>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-300">State</span>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-300">ZIP</span>
                  <input
                    type="text"
                    required
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-zinc-300">Country</span>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="US"
                  />
                </label>
              </div>

              {!clientSecret ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={!canCheckout || intentLoading}
                    onClick={createPaymentIntent}
                  >
                    {intentLoading ? "Preparing payment…" : "Continue to payment"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {clientSecret && stripePromise && elementsOptions ? (
            <Elements stripe={stripePromise} options={elementsOptions}>
              <PaymentForm
                store={store}
                clientSecret={clientSecret}
                onPaid={() => {
                  try {
                    const raw = localStorage.getItem(`${CHECKOUT_STATE_KEY_PREFIX}${store}`);
                    if (raw) {
                      const parsed = JSON.parse(raw) as CheckoutState;
                      parsed.paid = true;
                      localStorage.setItem(`${CHECKOUT_STATE_KEY_PREFIX}${store}`, JSON.stringify(parsed));
                    }
                  } catch {
                    // ignore
                  }

                  clearCart(store);
                }}
              />
            </Elements>
          ) : null}

          {clientSecret && !stripePromise ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
              Missing <span className="font-semibold">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span>.
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950/40 p-5">
          <h2 className="text-lg font-semibold text-white">Order summary</h2>
          <div className="mt-2 text-sm text-zinc-400">{isLoading ? "Updating…" : null}</div>

          <div className="mt-4 grid gap-3">
            {(quote?.items ?? []).map((item) => (
              <div key={item.key} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    {item.variantTitle && item.variantTitle !== item.title ? (
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">{item.variantTitle}</div>
                    ) : null}
                    {item.stockMessage ? (
                      <div className={"mt-2 text-xs " + (item.canCheckout === false ? "text-red-200" : "text-amber-200")}>
                        {item.stockMessage}
                      </div>
                    ) : null}
                    <div className="mt-2 text-sm text-zinc-400">
                      Qty {item.quantity} · ${item.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-white">${item.lineTotal.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between text-sm">
            <div className="text-zinc-400">Subtotal</div>
            <div className="font-semibold text-white">{quote ? `$${quote.subtotal.toFixed(2)}` : "—"}</div>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <div className="text-zinc-400">Tax</div>
            <div className="font-semibold text-white">$0.00</div>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <div className="text-zinc-400">Shipping</div>
            <div className="font-semibold text-white">$0.00</div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
            <div className="text-zinc-200">Total</div>
            <div className="text-lg font-semibold text-white">{quote ? `$${quote.subtotal.toFixed(2)}` : "—"}</div>
          </div>

          {quote?.items.some((i) => i.canCheckout === false) ? (
            <p className="mt-4 text-sm text-red-200">Adjust unavailable items in your cart before paying.</p>
          ) : null}

          <div className="mt-6">
            <button
              className="btn btn-secondary w-full"
              type="button"
              onClick={() => router.push(resolveStorefrontHref(publicBasePath, "/cart"))}
            >
              Edit cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
