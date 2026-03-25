import Link from "next/link";
import { Brush, Sparkles, Shirt } from "lucide-react";

import DevStorefront from "@/components/dev/DevStorefront";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopHeroSlideshow } from "@/components/shop/ShopHeroSlideshow";
import { StorefrontPageView } from "@/components/shop/StorefrontPageView";
import HomeEmailSignup from "./HomeEmailSignup";
import prisma from "@/lib/prisma";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { getHomepageContent } from "@/lib/storefront/content";
import { getProductImageUrls } from "@/lib/storefront/productImages";
import { isDbConnectivityError } from "@/lib/storefront/isDbConnectivityError";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export default async function StoreHome({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;
  const { publicBasePath } = await getStorefrontRequestContext(store);

  if (store === "dev") {
    return <DevStorefront store={store} />;
  }

  const homepage = await getHomepageContent(store);
  if (homepage) {
    return <StorefrontPageView publicBasePath={publicBasePath} page={homepage} />;
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
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-background)" }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-28 -top-24 h-80 w-80 rounded-full bg-[color:var(--color-dev-blue)]/12 blur-3xl" />
          <div className="absolute right-1/3 top-40 h-72 w-72 rounded-full bg-[color:var(--color-dev-green)]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[color:var(--color-dev-purple)]/12 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div className="max-w-xl">
              <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide text-zinc-200">
                <Sparkles className="h-4 w-4 text-[color:var(--color-dev-green)]" />
                Custom shirts, fast quotes, clean checkout
              </div>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Build a shirt that feels like a brand.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-zinc-300">
                Choose size + color, add a back design, and include special text — we’ll turn it into a clean, ready-to-print order.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
                  Start customizing
                </Link>
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                  Design gallery
                </Link>
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/cart")}>
                  Cart
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="glass-panel rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Shirt className="h-4 w-4 text-[color:var(--color-dev-blue)]" />
                    Pick your base
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                    Size, color, and quantity.
                  </div>
                </div>
                <div className="glass-panel rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Brush className="h-4 w-4 text-[color:var(--color-dev-purple)]" />
                    Add your design
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                    Back graphic + special text.
                  </div>
                </div>
                <div className="glass-panel rounded-2xl p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sparkles className="h-4 w-4 text-[color:var(--color-dev-green)]" />
                    Checkout smooth
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                    Quote → Stripe checkout.
                  </div>
                </div>
              </div>
            </div>

            <ShopHeroSlideshow
              className="lg:justify-self-end"
              images={featured.flatMap((p) => getProductImageUrls(p.images)).slice(0, 10)}
            />
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-surface-1)" }}>
        <div className="mx-auto max-w-6xl py-10 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Featured picks
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Tap any item to start Custom Apparel.
              </p>
            </div>
            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
              Open Custom Apparel
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((p) => (
              <ProductCard
                key={p.id}
                publicBasePath={publicBasePath}
                hrefOverride={resolveStorefrontHref(publicBasePath, "/custom-apparel")}
                actionLabel="Customize"
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
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
                Explore custom apparel
              </Link>
              <Link className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
                Shop originals →
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

      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-background)" }}>
        <div className="mx-auto max-w-6xl py-12 sm:py-16">
          <div className="glass-panel rounded-3xl p-8 sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Ready to build yours?
            </h2>
            <p className="mt-3 text-sm text-zinc-300">
              Jump into Custom Apparel and start with a clean base shirt.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
                Open Custom Apparel
              </Link>
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                Browse the gallery
              </Link>
            </div>
          </div>
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
