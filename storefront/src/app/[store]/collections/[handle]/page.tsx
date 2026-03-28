import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductCard } from "@/components/shop/ProductCard";
import { getPublishedCollectionByHandle } from "@/lib/storefront/content";
import prisma from "@/lib/prisma";
import { getStorefrontMediaUrl } from "@/lib/storefront/media";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

const productCardSelect = {
  id: true,
  handle: true,
  title: true,
  variants: {
    select: { price: true, compareAtPrice: true, inventory: true, trackInventory: true },
    orderBy: { createdAt: "asc" as const },
  },
  media: { select: { asset: { select: { storageKey: true } } }, orderBy: { position: "asc" as const }, take: 1 },
} as const;

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ store: string; handle: string }>;
}) {
  const { store, handle } = await params;
  if (!isValidStore(store)) notFound();
  const { publicBasePath } = await getStorefrontRequestContext(store);

  if (store === "dev") {
    redirect(resolveStorefrontHref(publicBasePath, "/"));
  }

  if (handle !== "all") {
    const collection = await getPublishedCollectionByHandle(store, handle);
    if (!collection) notFound();

    return (
      <div className="store-section py-8 sm:py-10">
        <div className="store-container">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="store-eyebrow">Collection</p>
            <h1 className="store-title mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{collection.title}</h1>
            {collection.description ? <p className="store-copy mt-4 max-w-2xl text-sm leading-relaxed">{collection.description}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/search")}>Search</Link>
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>All products</Link>
            </div>
          </div>

          <div className="store-card overflow-hidden rounded-[2rem]">
            {collection.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collection.imageUrl} alt={collection.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex min-h-[260px] items-center justify-center text-sm text-zinc-500">Add a collection image in Admin.</div>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.products.map((product: (typeof collection.products)[number]) => (
            <ProductCard key={product.id} publicBasePath={publicBasePath} product={product} />
          ))}
        </div>
        </div>
      </div>
    );
  }

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 48,
    select: productCardSelect,
  });

  return (
    <div className="store-section py-8 sm:py-10">
      <div className="store-container">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="store-eyebrow">Collection</p>
          <h1 className="store-title mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            All Products
          </h1>
          <p className="store-copy mt-3 text-sm">
            Fresh drops, timeless staples.
          </p>
        </div>
        <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/search")}>
          Search
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => {
          const trackedVariants = p.variants.filter((v) => v.trackInventory);
          const outOfStock = trackedVariants.length > 0 && trackedVariants.every((v) => v.inventory <= 0);
          return (
            <ProductCard
              key={p.id}
              publicBasePath={publicBasePath}
              product={{
                id: p.id,
                handle: p.handle,
                title: p.title,
                price: Number(p.variants[0]?.price ?? 0),
                compareAtPrice: p.variants[0]?.compareAtPrice ? Number(p.variants[0].compareAtPrice) : null,
                imageUrl: p.media[0]?.asset?.storageKey ? getStorefrontMediaUrl(p.media[0].asset.storageKey) : null,
                outOfStock,
              }}
            />
          );
        })}
      </div>
      </div>
    </div>
  );
}
