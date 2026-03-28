import Link from "next/link";

import { ProductCard } from "@/components/shop/ProductCard";
import { resolveStorefrontHref } from "@/lib/storefront/routing";

type PageSection =
  | {
      type: "richText";
      title?: string;
      body?: string;
    }
  | {
      type: "featureGrid";
      title?: string;
      items?: Array<{ title?: string; body?: string }>;
    }
  | {
      type: "cta";
      eyebrow?: string;
      title?: string;
      body?: string;
      label?: string;
      href?: string;
    }
  | {
      type: "split";
      eyebrow?: string;
      title?: string;
      body?: string;
      imageUrl?: string;
      label?: string;
      href?: string;
    };

function normalizeSections(value: unknown) {
  if (!Array.isArray(value)) return [] as PageSection[];
  return value.filter((section): section is PageSection => typeof section === "object" && section !== null && "type" in section);
}

type StorefrontPageModel = {
  title: string;
  excerpt: string;
  body: string;
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroBody: string | null;
  heroCtaLabel: string | null;
  heroCtaHref: string | null;
  heroImageUrl: string | null;
  sections: unknown;
  featuredCollection: {
    id: string;
    handle: string;
    title: string;
    description: string;
    imageUrl: string | null;
    products: Array<{
      id: string;
      handle: string | null;
      title: string;
      price: number;
      compareAtPrice: number | null;
      imageUrl: string | null;
    }>;
  } | null;
};

type StorefrontPageViewProps = {
  page: StorefrontPageModel;
  publicBasePath: string;
};

export function StorefrontPageView({
  page,
  publicBasePath,
}: StorefrontPageViewProps) {
  const sections = normalizeSections(page.sections);

  return (
    <div className="animate-fade-in">
      <section className="store-section pt-8 sm:pt-10">
        <div className="store-container grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            {page.heroEyebrow ? (
              <p className="store-eyebrow">{page.heroEyebrow}</p>
            ) : null}
            <h1 className="store-title mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {page.heroTitle || page.title}
            </h1>
            {page.heroBody || page.excerpt ? (
              <p className="store-copy mt-5 max-w-xl whitespace-pre-wrap text-base leading-relaxed">
                {page.heroBody || page.excerpt}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {page.heroCtaLabel && page.heroCtaHref ? (
                <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, page.heroCtaHref)}>
                  {page.heroCtaLabel}
                </Link>
              ) : null}
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
                Shop all
              </Link>
            </div>
          </div>

          <div className="store-card overflow-hidden rounded-[2rem]">
            {page.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={page.heroImageUrl} alt={page.heroTitle || page.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.06),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8 text-center text-sm text-zinc-400">
                Add a hero image in Admin to replace this placeholder.
              </div>
            )}
          </div>
        </div>
      </section>

      {page.body ? (
        <section className="store-section pt-10 sm:pt-14">
          <div className="store-container max-w-4xl">
            <div className="store-card-soft rounded-[2rem] p-8 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap sm:p-10">
              {page.body}
            </div>
          </div>
        </section>
      ) : null}

      {page.featuredCollection ? (
        <section className="store-section pt-10 sm:pt-14">
          <div className="store-container">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="store-eyebrow">Featured Collection</p>
                <h2 className="store-title mt-3 text-3xl font-semibold tracking-tight">{page.featuredCollection.title}</h2>
                {page.featuredCollection.description ? (
                  <p className="store-copy mt-3 max-w-2xl text-sm leading-relaxed">{page.featuredCollection.description}</p>
                ) : null}
              </div>
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, `/collections/${page.featuredCollection.handle}`)}>
                View collection
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {page.featuredCollection.products.map((product) => (
                <ProductCard key={product.id} publicBasePath={publicBasePath} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {sections.map((section, index) => {
        if (section.type === "richText") {
          return (
            <section key={`${section.type}-${index}`} className="store-section pt-10 sm:pt-14">
              <div className="store-container max-w-4xl">
                {section.title ? <h2 className="store-title text-2xl font-semibold tracking-tight">{section.title}</h2> : null}
                {section.body ? <div className="store-copy mt-4 whitespace-pre-wrap text-sm leading-relaxed">{section.body}</div> : null}
              </div>
            </section>
          );
        }

        if (section.type === "featureGrid") {
          return (
            <section key={`${section.type}-${index}`} className="store-section pt-10 sm:pt-14">
              <div className="store-container">
                {section.title ? <h2 className="store-title text-2xl font-semibold tracking-tight">{section.title}</h2> : null}
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(section.items ?? []).map((item, itemIndex) => (
                    <div key={`${section.type}-${index}-${itemIndex}`} className="store-card-soft rounded-[1.5rem] p-6">
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                      <div className="mt-2 text-sm leading-relaxed text-zinc-300">{item.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "cta") {
          return (
            <section key={`${section.type}-${index}`} className="store-section pt-10 sm:pt-14">
              <div className="store-container max-w-5xl">
                <div className="store-card px-8 py-8 sm:px-10 sm:py-10">
                  {section.eyebrow ? <div className="store-eyebrow">{section.eyebrow}</div> : null}
                  {section.title ? <h2 className="store-title mt-4 text-3xl font-semibold tracking-tight">{section.title}</h2> : null}
                  {section.body ? <p className="store-copy mt-4 max-w-2xl text-sm leading-relaxed">{section.body}</p> : null}
                  {section.label && section.href ? (
                    <Link className="btn btn-primary mt-8" href={resolveStorefrontHref(publicBasePath, section.href)}>{section.label}</Link>
                  ) : null}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "split") {
          return (
            <section key={`${section.type}-${index}`} className="store-section pt-10 sm:pt-14">
              <div className="store-container grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  {section.eyebrow ? <div className="store-eyebrow">{section.eyebrow}</div> : null}
                  {section.title ? <h2 className="store-title mt-4 text-3xl font-semibold tracking-tight">{section.title}</h2> : null}
                  {section.body ? <p className="store-copy mt-4 text-sm leading-relaxed">{section.body}</p> : null}
                  {section.label && section.href ? <Link className="btn btn-secondary mt-8" href={resolveStorefrontHref(publicBasePath, section.href)}>{section.label}</Link> : null}
                </div>
                <div className="store-card overflow-hidden rounded-[2rem]">
                  {section.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={section.imageUrl} alt={section.title || "Section image"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex min-h-[280px] items-center justify-center text-sm text-zinc-500">Add an imageUrl to this section JSON to show media here.</div>
                  )}
                </div>
              </div>
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}