import Link from "next/link";
import { ArrowRight, BadgeCheck, Brush, Layers3, Shirt, Sparkles } from "lucide-react";

import DevStorefront from "@/components/dev/DevStorefront";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopHeroSlideshow } from "@/components/shop/ShopHeroSlideshow";
import { StorefrontPageView } from "@/components/shop/StorefrontPageView";
import HomeEmailSignup from "./HomeEmailSignup";
import prisma from "@/lib/prisma";
import { getStorefrontMediaUrl } from "@/lib/storefront/media";
import { listHomepageHeroStorageKeys } from "@/lib/storefront/heroImages";
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

function HeroSignalArt() {
  return (
    <svg
      viewBox="0 0 320 220"
      className="hero-signal h-full w-full"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="jah-home-line" x1="18" y1="18" x2="286" y2="198" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgba(255,255,255,0.92)" />
          <stop offset="0.5" stopColor="rgba(127,161,255,0.88)" />
          <stop offset="1" stopColor="rgba(45,91,255,0.96)" />
        </linearGradient>
      </defs>
      <path className="hero-signal-path" d="M24 156C76 140 92 88 136 88C178 88 194 142 246 142C272 142 292 126 302 114" stroke="url(#jah-home-line)" strokeWidth="2.5" strokeLinecap="round" />
      <path className="hero-signal-path" d="M34 72C72 58 104 48 140 58C182 70 204 118 248 118C272 118 288 110 302 96" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      <circle className="hero-signal-node" cx="88" cy="112" r="5" fill="white" />
      <circle className="hero-signal-node" cx="168" cy="104" r="7" fill="rgba(127,161,255,0.92)" style={{ animationDelay: "0.6s" }} />
      <circle className="hero-signal-node" cx="246" cy="142" r="6" fill="rgba(45,91,255,0.96)" style={{ animationDelay: "1.2s" }} />
      <g className="hero-signal-orbit">
        <circle cx="236" cy="58" r="28" stroke="rgba(255,255,255,0.18)" />
        <circle cx="236" cy="58" r="10" fill="rgba(45,91,255,0.24)" stroke="rgba(255,255,255,0.42)" />
      </g>
    </svg>
  );
}

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

  const productHeroKeys = featured.flatMap((product) => product.media.map((media) => media.asset.storageKey));
  const fallbackHeroKeys = await listHomepageHeroStorageKeys(10);
  const heroImages = Array.from(new Set([...productHeroKeys, ...fallbackHeroKeys]))
    .slice(0, 10)
    .map((storageKey) => getStorefrontMediaUrl(storageKey));

  return (
    <div className="animate-fade-in">
      <section className="store-section relative overflow-hidden pt-6 sm:pt-8 lg:pt-12">
        <div className="store-container">
          <div className="store-card glow-outline relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
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
                  Custom apparel that feels personal before you even put it on.
                </h1>
                <p className="mt-4 max-w-xl text-sm font-semibold uppercase tracking-[0.26em] text-white/60 sm:text-base">
                  Where style meets soul.
                </p>
                <p className="store-copy mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
                  Shop statement pieces, build one-of-one custom shirts, and turn your ideas into clothing that fits your mood, message, and everyday rotation.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
                    Shop custom apparel
                  </Link>
                  <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                    Browse design gallery
                  </Link>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="store-card-soft interactive-panel glow-outline rounded-[1.4rem] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Shirt className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Choose your fit
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                      Start with the blank, silhouette, and color story that fits your look.
                    </div>
                  </div>
                  <div className="store-card-soft interactive-panel glow-outline rounded-[1.4rem] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Brush className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Make it personal
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                      Bring artwork, lettering, a theme, or let Jah and Co build from your vibe.
                    </div>
                  </div>
                  <div className="store-card-soft interactive-panel glow-outline rounded-[1.4rem] p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <BadgeCheck className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Approve with confidence
                    </div>
                    <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                      Review the draft before production so the final piece lands the way it should.
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:justify-self-end">
                <div className="interactive-panel glow-outline rounded-[2rem] lg:w-[30rem]">
                  <ShopHeroSlideshow className="lg:w-[30rem]" images={heroImages} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="store-card-soft interactive-panel glow-outline rounded-[1.5rem] p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Layers3 className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                      Made to stand out
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                      Shop original drops, birthday shirts, event pieces, and custom looks that turn everyday wear into a statement.
                    </p>
                  </div>
                  <div className="store-card-soft interactive-panel glow-outline relative overflow-hidden rounded-[1.5rem] p-5">
                    <div className="pointer-events-none absolute inset-0 opacity-90">
                      <HeroSignalArt />
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <ArrowRight className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                        Start with a spark
                      </div>
                      <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-zinc-300">
                        Use the gallery, your own inspiration, or a quick brief to start something wearable, memorable, and fully yours.
                      </p>
                    </div>
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
                Fresh styles worth wearing on repeat
              </h2>
              <p className="store-copy mt-2 text-sm">
                Start with what&apos;s live now, then personalize the piece that feels closest to your style.
              </p>
            </div>
            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
              Shop all styles
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
            <div className="store-card-soft interactive-panel glow-outline rounded-[1.75rem] p-6 xl:col-span-2">
              <p className="store-eyebrow">Why Jah and Co</p>
              <h2 className="store-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Clothing should say something before you say a word.
              </h2>
              <p className="store-copy mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
                Jah and Co blends ready-to-wear pieces with custom design work so you can shop what&apos;s already hitting or build something that feels made for your exact energy, occasion, and color story.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
                  Shop originals
                </Link>
                <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
                  Start a custom request
                </Link>
              </div>
            </div>

            {[
              {
                icon: Sparkles,
                title: "Original energy",
                body: "Every piece is built to feel intentional, expressive, and worth reaching for again.",
              },
              {
                icon: BadgeCheck,
                title: "Custom without guesswork",
                body: "Clear requests, draft approval, and direct communication keep your order moving with confidence.",
              },
            ].map((item) => (
              <div key={item.title} className="store-card-soft interactive-panel glow-outline rounded-[1.75rem] p-6">
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
          <div className="store-card glow-outline relative overflow-hidden px-8 py-8 sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(45,91,255,0.18),transparent_62%)]" />
            <div className="relative max-w-3xl">
              <p className="store-eyebrow">Ready when you are</p>
              <h2 className="store-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to wear something no one else is walking around in?
              </h2>
              <p className="store-copy mt-3 text-sm leading-relaxed sm:text-base">
                Start with the gallery for inspiration, go straight to custom apparel, or send your request now and let Jah and Co shape the look with you.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
                  Start with custom apparel
                </Link>
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
                  Send your request
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="store-section py-10 sm:py-14">
        <div className="store-container">
          <div className="store-card-soft glow-outline interactive-panel rounded-[2rem] px-8 py-8 sm:px-10 sm:py-10">
            <h2 className="store-title text-2xl font-semibold tracking-tight sm:text-3xl">Join the Club!</h2>
            <p className="store-copy mt-3 text-sm">
              Be first in line for new drops, restocks, special offers, and custom apparel updates.
            </p>
            <HomeEmailSignup store={store} />
          </div>
        </div>
      </section>
    </div>
  );
}
