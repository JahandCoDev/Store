import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, Palette, Shirt, Sparkles } from "lucide-react";

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

  const customRequestHandle = "inspired-by-you-custom-shirt-mockup";

  return (
    <div className="animate-fade-in">
      <section className="store-section pt-4">
        <div className="store-container rounded-full border border-[rgba(112,135,187,0.16)] bg-[rgba(8,13,25,0.64)] px-5 py-3 text-center text-sm text-zinc-300 backdrop-blur-xl">
          Please read our Custom Apparel Guides before making a personalized purchase!
        </div>
      </section>

      <section className="store-section py-8 sm:py-10">
        <div className="store-container space-y-10">
          <div className="store-card relative overflow-hidden px-6 py-8 text-center sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-[rgba(45,91,255,0.16)] blur-3xl" />
            </div>
            <div className="relative mx-auto max-w-3xl">
              <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.24em] text-zinc-100">
                <Sparkles className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
                Custom Apparel
              </div>
              <h1 className="store-title mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">Build the piece, then shape the details.</h1>
              <p className="store-copy mt-4 text-sm leading-relaxed sm:text-base">
                {styleSurvey
                  ? `Welcome back${horoscope ? `, ${horoscope}` : ""}. ${favoriteColor ? `We’ll keep “${favoriteColor}” in mind.` : ""}`
                  : "Explore the design gallery, learn how custom works, and start your own request."}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="store-card-soft rounded-[1.7rem] p-6 text-center">
              <Shirt className="mx-auto h-5 w-5 text-[color:var(--color-brand-royal)]" />
              <div className="mt-4 text-sm font-semibold text-white">Custom Apparel Guide</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Learn how the Jah and Co custom process works from order to approval.
              </p>
              <div className="mt-5">
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel-guide")}>
                  Learn more
                </Link>
              </div>
            </div>

            <div className="store-card-soft rounded-[1.7rem] p-6 text-center">
              <Palette className="mx-auto h-5 w-5 text-[color:var(--color-brand-royal)]" />
              <div className="mt-4 text-sm font-semibold text-white">Design Factory</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Explore designs, note references, and move straight into a custom request.
              </p>
              <div className="mt-5">
                <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                  Explore the gallery
                </Link>
              </div>
            </div>

            <div className="store-card-soft rounded-[1.7rem] p-6 text-center">
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
              <p className="store-copy mt-2 text-sm">Browse what&apos;s active right now.</p>
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
            <div className="store-card relative overflow-hidden px-8 py-8 sm:px-10 sm:py-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,91,255,0.18),transparent_42%)]" />
              <div className="relative">
                <p className="store-eyebrow">Custom request</p>
                <h2 className="store-title mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Need a fresh build from scratch?</h2>
                <p className="store-copy mt-3 text-sm leading-relaxed sm:text-base">
                  Start with a Custom Shirt Request, then move through portal review until the draft is right. The whole flow now feels like a connected design system instead of separate pages.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, `/products/${customRequestHandle}`)}>
                    Order custom
                  </Link>
                  <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>
                    Open request form
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
                <div key={step} className="store-card-soft flex items-start gap-4 rounded-[1.5rem] p-5">
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
                Browse the design factory
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}