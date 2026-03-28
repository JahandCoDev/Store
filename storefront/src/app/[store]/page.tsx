import Link from "next/link";
import { ArrowRight, BadgeCheck, Brush, Layers3, Shirt, Sparkles } from "lucide-react";

import DevStorefront from "@/components/dev/DevStorefront";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopHeroSlideshow } from "@/components/shop/ShopHeroSlideshow";
import { StorefrontPageView } from "@/components/shop/StorefrontPageView";
import HomeEmailSignup from "./HomeEmailSignup";
import prisma from "@/lib/prisma";
import { getStorefrontMediaUrl } from "@/lib/storefront/media";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { getHomepageContent } from "@/lib/storefront/content";
import { isDbConnectivityError } from "@/lib/storefront/isDbConnectivityError";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

const productCardSelect = {
  id: true,
  handle: true,
  title: true,
  variants: { select: { price: true, compareAtPrice: true }, take: 1 },
  media: { select: { asset: { select: { storageKey: true } } }, orderBy: { position: "asc" as const }, take: 1 },
} as const;

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

  let featured: Awaited<ReturnType<typeof prisma.product.findMany<{ select: typeof productCardSelect }>>> = [];
  try {
    featured = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: productCardSelect,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "production" && !isDbConnectivityError(err)) throw err;
    console.error("Failed to load featured products:", err);
    featured = [];
  }

  return (
    <div className="animate-fade-in">
      <section className="store-section relative overflow-hidden pt-6 sm:pt-8 lg:pt-12">
        <div className="store-container">
          <div className="store-card relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-8 top-0 h-48 w-48 rounded-full bg-[rgba(45,91,255,0.22)] blur-3xl" />
              <div className="absolute bottom-[-3rem] left-[-2rem] h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            </div>

            <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="max-w-2xl">
                <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.24em] text-zinc-100">
                  <Sparkles className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                  This is Jah and Co.
                </div>

                <h1 className="store-title mt-6 max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Design-driven apparel with a cleaner edge.
                </h1>
                <p className="store-copy mt-5 max-w-xl text-base leading-relaxed sm:text-lg">
                  Where style meets soul. Build custom shirts, pull from the design factory, and shop product drops with a sharper black, white, and royal-blue storefront.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
                    Start customizing
                  </Link>
                  <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                    Enter the design factory
                  </Link>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="store-card-soft rounded-[1.4rem] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Shirt className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Pick the blank
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                      Sizes, colorways, and tracked inventory.
                    </div>
                  </div>
                  <div className="store-card-soft rounded-[1.4rem] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Brush className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Layer the design
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                      Graphics, text placement, and custom requests.
                    </div>
                  </div>
                  <div className="store-card-soft rounded-[1.4rem] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <BadgeCheck className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Approve and print
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                      Portal-backed review before production.
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:justify-self-end">
                <ShopHeroSlideshow
                  className="lg:w-[30rem]"
                  images={featured.flatMap((p) =>
                    p.media.map((m) => getStorefrontMediaUrl(m.asset.storageKey))
                  ).slice(0, 10)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="store-card-soft rounded-[1.5rem] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Layers3 className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Every page, one system
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                      Consistent cards, spacing, glass layers, motion, and navigation across the shop.
                    </p>
                  </div>
                  <div className="store-card-soft rounded-[1.5rem] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <ArrowRight className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Built to keep moving
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                      Quick routes into custom work, gallery inspiration, and account-driven design requests.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="store-section pt-10 sm:pt-12">
        <div className="store-container">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="store-eyebrow">Featured picks</p>
              <h2 className="store-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Featured picks
              </h2>
              <p className="store-copy mt-2 text-sm">
                Product cards now carry the same glass treatment and object-storage imagery as the hero.
              </p>
            </div>
            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
              Open custom apparel
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
                  price: Number(p.variants[0]?.price ?? 0),
                  compareAtPrice: p.variants[0]?.compareAtPrice ? Number(p.variants[0].compareAtPrice) : null,
                  imageUrl: p.media[0]?.asset?.storageKey ? getStorefrontMediaUrl(p.media[0].asset.storageKey) : null,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="store-section pt-10 sm:pt-14">
        <div className="store-container">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="store-card-soft rounded-[1.75rem] p-6 xl:col-span-2">
              <p className="store-eyebrow">Brand note</p>
              <h2 className="store-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                A storefront shaped around custom work, not generic product tiles.
              </h2>
              <p className="store-copy mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
                Jah and Co blends original apparel with interactive custom design flow. The redesigned storefront leans into that identity with a darker showroom feel, stronger hierarchy, and clear paths into the factory, the portal, and the shop.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
                  Shop originals
                </Link>
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/contact")}>
                  Contact Jah and Co
                </Link>
              </div>
            </div>

            {[
              {
                icon: Sparkles,
                title: "Creative minds",
                body: "Design work is treated like a process, not an afterthought.",
              },
              {
                icon: BadgeCheck,
                title: "Quality first",
                body: "A cleaner checkout path and sharper presentation for every product.",
              },
            ].map((item) => (
              <div key={item.title} className="store-card-soft rounded-[1.75rem] p-6">
                <item.icon className="h-5 w-5 text-[color:var(--color-brand-royal)]" />
                <div className="mt-5 text-sm font-semibold text-white">{item.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="store-section pt-10 sm:pt-14">
        <div className="store-container">
          <div className="store-card relative overflow-hidden px-8 py-8 sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(45,91,255,0.18),transparent_62%)]" />
            <div className="relative max-w-3xl">
              <p className="store-eyebrow">Next move</p>
              <h2 className="store-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to build something that actually feels like yours?
              </h2>
              <p className="store-copy mt-3 text-sm leading-relaxed sm:text-base">
                Jump into Custom Apparel, browse the gallery, or open the portal to continue an active design conversation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
                  Open custom apparel
                </Link>
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/portal")}>
                  Open design portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="store-section py-10 sm:py-14">
        <div className="store-container">
          <div className="store-card-soft rounded-[2rem] px-8 py-8 sm:px-10 sm:py-10">
            <h2 className="store-title text-2xl font-semibold tracking-tight sm:text-3xl">Join the Club!</h2>
            <p className="store-copy mt-3 text-sm">
              Get notified first on special offers, discounts, new products and more.
            </p>
            <HomeEmailSignup store={store} />
          </div>
        </div>
      </section>
    </div>
  );
}
