import Link from "next/link";

import DevStorefront from "@/components/dev/DevStorefront";
import { ProductCard } from "@/components/shop/ProductCard";
import HomeEmailSignup from "./HomeEmailSignup";
import prisma from "@/lib/prisma";
import { getProductImageUrls } from "@/lib/storefront/productImages";
import { isDbConnectivityError } from "@/lib/storefront/isDbConnectivityError";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export default async function StoreHome({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  if (store === "dev") {
    return <DevStorefront store={store} />;
  }

  const shopId = resolveShopIdForStore(store);
  let featured = [] as Awaited<ReturnType<typeof prisma.product.findMany>>;
  if (shopId) {
    try {
      featured = await prisma.product.findMany({
        where: { shopId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 8,
      });
    } catch (err) {
      if (process.env.NODE_ENV === "production" && !isDbConnectivityError(err)) throw err;
      console.error("Failed to load featured products:", err);
      featured = [];
    }
  }

  return (
    <div className="animate-fade-in">
      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-surface-1)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-3">
          <div className="text-xs text-zinc-300">
            Check out our design gallery!
          </div>
          <Link className="text-xs font-semibold text-white hover:underline" href={`/${store}/design-gallery`}>
            View
          </Link>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-background)" }}>
        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div className="max-w-xl">
              <p className="text-xs tracking-[0.25em] uppercase text-zinc-500">
                JahandCo Apparel
              </p>
              <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Streetwear essentials.
                <span className="text-zinc-300"> Limited drops.</span>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-zinc-300">
                Explore active products managed in your Admin, with a Shopify-style browsing flow.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn btn-primary" href={`/${store}/collections/all`}>
                  Shop all
                </Link>
                <Link className="btn btn-secondary" href={`/${store}/search`}>
                  Search
                </Link>
                <Link className="btn btn-secondary" href={`/${store}/cart`}>
                  Cart
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <div className="text-sm font-semibold text-white">New arrivals</div>
              <p className="mt-2 text-sm text-zinc-400">
                Freshly added products (ACTIVE)
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {(featured.slice(0, 4) ?? []).map((p) => {
                  const imageUrl = getProductImageUrls(p.images)[0] ?? null;
                  return (
                    <Link
                      key={p.id}
                      href={`/${store}/products/${p.handle ?? p.id}`}
                      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-white">
                          {p.title}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">${p.price.toFixed(2)}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-surface-1)" }}>
        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              This is Jah and Co.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-300">
              Where style meets soul. Inspired by vibrant culture and timeless comfort, Jah and Co
              brings you apparel that celebrates individuality and confidence.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn btn-secondary" href={`/${store}/custom-apparel`}>
                Explore custom apparel
              </Link>
              <Link className="btn btn-secondary" href={`/${store}/collections/all`}>
                Shop originals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-background)" }}>
        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm font-semibold text-white">Creative minds</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Creativity is key and we strive to achieve unique designs.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm font-semibold text-white">Quality first</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                High quality matters — we work to offer pieces you’ll want to wear on repeat.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm font-semibold text-white">Customer care</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                We’ll work with you to solve any issue and keep you happy.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-surface-1)" }}>
        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="grid gap-4 lg:grid-cols-2">
            <Link
              href={`/${store}/collections/all`}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 p-10 transition hover:border-white/20"
            >
              <div className="text-sm font-semibold text-white">Originals</div>
              <p className="mt-2 text-sm text-zinc-300">Ready-to-wear drops and staples.</p>
              <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition group-hover:border-white/20">
                Shop now
              </div>
            </Link>

            <Link
              href={`/${store}/custom-apparel`}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/40 p-10 transition hover:border-white/20"
            >
              <div className="text-sm font-semibold text-white">Like it customized?</div>
              <p className="mt-2 text-sm text-zinc-300">Bring your idea — we’ll help make it real.</p>
              <div className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition group-hover:border-white/20">
                Get started
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-surface-1)" }}>
        <div className="mx-auto max-w-6xl py-10 sm:py-12">
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Featured products
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Browse what&apos;s active right now.
              </p>
            </div>
            <Link className="btn btn-secondary" href={`/${store}/collections/all`}>
              View all
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                store={store}
                product={{
                  id: p.id,
                  handle: p.handle,
                  title: p.title,
                  price: p.price,
                  compareAtPrice: p.compareAtPrice ?? null,
                  imageUrl: getProductImageUrls(p.images)[0] ?? null,
                }}
              />
            ))}
          </div>

          {!shopId ? (
            <p className="mt-8 text-sm text-zinc-400">
              Store not configured yet. Set the appropriate env var for this storefront&apos;s
              <code className="mx-1 rounded bg-white/5 px-2 py-0.5 text-zinc-200">Shop.id</code>.
            </p>
          ) : null}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-background)" }}>
        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Join the Club!</h2>
            <p className="mt-3 text-sm text-zinc-300">
              Get notified first on special offers, discounts, new products and more.
            </p>
            <HomeEmailSignup store={store} />
          </div>
        </div>
      </section>
    </div>
  );
}
