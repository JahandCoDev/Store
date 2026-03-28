import Link from "next/link";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isDbConnectivityError } from "@/lib/storefront/isDbConnectivityError";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { ProductCard } from "@/components/shop/ProductCard";

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

function getMediaUrl(storageKey: string) {
  return `/${storageKey.replace(/^\/+/, "")}`;
}

export async function CustomApparelPage({ store, publicBasePath }: { store: string; publicBasePath: string }) {
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

  const surveyAnswers = styleSurvey?.answers && typeof styleSurvey.answers === "object" && styleSurvey.answers !== null
    ? (styleSurvey.answers as Record<string, unknown>)
    : null;

  const favoriteColor = typeof surveyAnswers?.favoriteColor === "string" ? surveyAnswers.favoriteColor : null;
  const horoscope = typeof surveyAnswers?.horoscope === "string" ? surveyAnswers.horoscope : null;
  const specificInterests = Array.isArray(surveyAnswers?.specificInterests)
    ? (surveyAnswers!.specificInterests.filter((v): v is string => typeof v === "string") as string[])
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
      <section className="px-4 sm:px-6 lg:px-8" style={{ background: "var(--color-surface-1)" }}>
        <div className="mx-auto max-w-6xl py-4 text-center text-sm text-zinc-300">
          Please read our Custom Apparel Guides before making a personalized purchase!
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Custom Apparel</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            {styleSurvey
              ? `Welcome back${horoscope ? `, ${horoscope}` : ""}. ${favoriteColor ? `We’ll keep “${favoriteColor}” in mind.` : ""}`
              : "Explore our design gallery, learn how custom works, and start your own request."}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <div className="text-sm font-semibold text-white">Custom Apparel Guide</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Learn how we operate custom clothing at Jah and Co.
            </p>
            <div className="mt-5">
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel-guide")}>
                Learn more
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <div className="text-sm font-semibold text-white">Design Gallery</div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Explore unique designs, or have one designed customized for you!
            </p>
            <div className="mt-5">
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>
                Explore the gallery
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            {styleSurvey ? (
              <>
                <div className="text-sm font-semibold text-white">Your Style Profile</div>
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
                <div className="text-sm font-semibold text-white">Take the Style Survey</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  Tell us about your style — and we&apos;ll tailor your shopping experience.
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

        <div className="mt-14 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Mix, match or style your way
            </h2>
            <p className="mt-2 text-sm text-zinc-400">Browse what&apos;s active right now.</p>
          </div>
          <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
            View all
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              publicBasePath={publicBasePath}
              product={{
                id: p.id,
                handle: p.handle,
                title: p.title,
                price: Number(p.variants[0]?.price ?? 0),
                compareAtPrice: p.variants[0]?.compareAtPrice ? Number(p.variants[0].compareAtPrice) : null,
                imageUrl: p.media[0]?.asset?.storageKey ? getMediaUrl(p.media[0].asset.storageKey) : null,
              }}
            />
          ))}
        </div>

        <div className="mt-14 grid gap-8 rounded-3xl border border-white/10 bg-white/[0.03] p-8 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Custom Shirt Request</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Get started with requesting a custom design.
            </p>
            <div className="mt-6">
              <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, `/products/${customRequestHandle}`)}>
                Order custom
              </Link>
            </div>
          </div>
          <div className="min-h-40 rounded-2xl border border-white/10 bg-zinc-950/40" />
        </div>
      </section>
    </div>
  );
}
