import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, Layers3, NotebookPen, Palette, Shirt, Sparkles } from "lucide-react";

import { ProductCard } from "@/components/shop/ProductCard";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStorefrontMediaUrl } from "@/lib/storefront/media";
import { isDbConnectivityError } from "@/lib/storefront/isDbConnectivityError";
import { resolveStorefrontHref } from "@/lib/storefront/routing";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

const productCardSelect = {
  id: true,
  handle: true,
  title: true,
  variants: { select: { price: true, compareAtPrice: true }, take: 1 },
  media: { select: { asset: { select: { storageKey: true } } }, orderBy: { position: "asc" as const }, take: 1 },
} as const;

export async function CustomApparelPage({ store: _store, publicBasePath }: { store: string; publicBasePath: string }) {
  const session = await getServerSession(authOptions);
  const email = normalizeEmail(session?.user?.email);

  let styleSurvey: { answers: unknown; submittedAt: Date } | null = null;
  try {
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { styleSurvey: { select: { answers: true, submittedAt: true } } },
      });
      styleSurvey = user?.styleSurvey ?? null;
    }
  } catch (err) {
    if (process.env.NODE_ENV === "production" && !isDbConnectivityError(err)) throw err;
    console.error("Failed to load style survey for custom apparel:", err);
  }

  const surveyAnswers =
    styleSurvey?.answers && typeof styleSurvey.answers === "object" && styleSurvey.answers !== null
      ? (styleSurvey.answers as Record<string, unknown>)
      : null;

  const favoriteColor = typeof surveyAnswers?.favoriteColor === "string" ? surveyAnswers.favoriteColor : null;
  const horoscope = typeof surveyAnswers?.horoscope === "string" ? surveyAnswers.horoscope : null;
  const specificInterests = Array.isArray(surveyAnswers?.specificInterests)
    ? surveyAnswers.specificInterests.filter((value): value is string => typeof value === "string")
    : [];

  let products: Awaited<ReturnType<typeof prisma.product.findMany<{ select: typeof productCardSelect }>>> = [];
  try {
    products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: productCardSelect,
    });
  } catch (err) {
    if (process.env.NODE_ENV === "production" && !isDbConnectivityError(err)) throw err;
    console.error("Failed to load custom apparel products:", err);
    products = [];
  }

  return (
    <div className="animate-fade-in">
      <section className="store-section pt-4">
        <div className="store-container rounded-full border border-[rgba(112,135,187,0.16)] bg-[rgba(8,13,25,0.64)] px-5 py-3 text-center text-sm text-zinc-300 backdrop-blur-xl">
          Please read our Custom Apparel Guides before making a personalized purchase!
        </div>
      </section>

      <section className="store-section py-8 sm:py-10">
        <div className="store-container space-y-10">
          <div className="store-card glow-outline relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute right-[-4rem] top-[-4rem] h-48 w-48 rounded-full bg-[rgba(45,91,255,0.2)] blur-3xl" />
              <div className="absolute bottom-[-4rem] left-[-3rem] h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="relative grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
              <div className="max-w-3xl">
                <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.24em] text-zinc-100">
                  <Sparkles className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                  Custom Apparel
                </div>
                <h1 className="store-title mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                  Build the piece, then shape the details.
                </h1>
                <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-white/60">
                  Where style meets soul.
                </p>
                <p className="store-copy mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
                  {styleSurvey
                    ? `Welcome back${horoscope ? `, ${horoscope}` : ""}. ${favoriteColor ? `We’ll keep “${favoriteColor}” in mind while shaping a piece that feels like you.` : "We’re ready to turn your next idea into something people ask you about."}`
                    : "Start with the gallery, the guide, or your own inspiration and we’ll help turn it into custom apparel that feels personal, polished, and worth wearing on repeat."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  {
                    icon: Shirt,
                    title: "Choose the piece",
                    body: "Start with the garment, fit, and color direction that matches how you want to show up.",
                  },
                  {
                    icon: Layers3,
                    title: "Pull your inspiration",
                    body: "Use the gallery, your style profile, or your own references to shape the direction.",
                  },
                  {
                    icon: NotebookPen,
                    title: "Send the request",
                    body: "Share the details once, then review your draft before the piece moves into production.",
                  },
                ].map((item) => (
                  <div key={item.title} className="store-card-soft interactive-panel glow-outline rounded-[1.4rem] p-4">
                    <item.icon className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                    <div className="mt-3 text-sm font-semibold text-white">{item.title}</div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="store-card-soft interactive-panel glow-outline rounded-[1.7rem] p-6 text-center">
              <Shirt className="mx-auto h-5 w-5 text-[color:var(--color-brand-royal)]" />
              <div className="mt-4 text-sm font-semibold text-white">Custom Apparel Guide</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Learn what to expect, how approvals work, and how to get the strongest result from your request.
              </p>
              <div className="mt-5">
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel-guide")}>
                  Learn more
                </Link>
              </div>
            </div>

            <div className="store-card-soft interactive-panel glow-outline rounded-[1.7rem] p-6 text-center">
              <Palette className="mx-auto h-5 w-5 text-[color:var(--color-brand-royal)]" />
              <div className="mt-4 text-sm font-semibold text-white">Design Gallery</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Explore artwork, layouts, and mood references you can pull into your next shirt.
              </p>
              <div className="mt-5">
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                  Explore the gallery
                </Link>
              </div>
            </div>

            <div className="store-card-soft interactive-panel glow-outline rounded-[1.7rem] p-6 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-[color:var(--color-brand-royal)]" />
              {styleSurvey ? (
                <>
                  <div className="mt-4 text-sm font-semibold text-white">Your Style Profile</div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    View your personalized profile based on your Style Survey.
                    {favoriteColor ? ` Favorite color: “${favoriteColor}”.` : ""}
                    {specificInterests.length ? ` Interests: ${specificInterests.join(", ")}.` : ""}
                  </p>
                  <div className="mt-5">
                    <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/account/style-profile")}>
                      View style profile
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-4 text-sm font-semibold text-white">Take the Style Survey</div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                    Tell us about your style and we&apos;ll tailor the experience around it.
                  </p>
                  <div className="mt-5">
                    <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/customer-questionnaire")}>
                      Take the survey
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="store-eyebrow">Shop the blanks</p>
              <h2 className="store-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Mix, match, and style your way
              </h2>
              <p className="store-copy mt-2 text-sm">Shop the styles you can wear as-is or use as the base for something more personal.</p>
            </div>
            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                publicBasePath={publicBasePath}
                product={{
                  id: product.id,
                  handle: product.handle,
                  title: product.title,
                  price: Number(product.variants[0]?.price ?? 0),
                  compareAtPrice: product.variants[0]?.compareAtPrice ? Number(product.variants[0].compareAtPrice) : null,
                  imageUrl: product.media[0]?.asset?.storageKey ? getStorefrontMediaUrl(product.media[0].asset.storageKey) : null,
                }}
              />
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="store-card glow-outline relative overflow-hidden px-8 py-8 sm:px-10 sm:py-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,91,255,0.18),transparent_42%)]" />
              <div className="relative">
                <p className="store-eyebrow">Custom request</p>
                <h2 className="store-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Need a fresh build from scratch?</h2>
                <p className="store-copy mt-3 text-sm leading-relaxed sm:text-base">
                  Tell us what you want the piece to feel like, where you plan to wear it, and the visual direction you want to chase. We&apos;ll use that to shape a custom design that actually fits your style instead of forcing you into a generic template.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
                    Get started
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {[
                "Choose the garment and color direction.",
                "Reference a gallery design or base it on your profile.",
                "Review the draft in the portal before production.",
              ].map((step, index) => (
                <div key={step} className="store-card-soft interactive-panel glow-outline flex items-start gap-4 rounded-[1.5rem] p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(77,113,255,0.28)] bg-[rgba(45,91,255,0.16)] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Step {index + 1}</div>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-300">{step}</p>
                  </div>
                </div>
              ))}
              <Link
                className="inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-[color:var(--color-brand-cloud)]"
                href={resolveStorefrontHref(publicBasePath, "/design-gallery")}
              >
                Browse the gallery
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}