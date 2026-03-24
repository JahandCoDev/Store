import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/shop/ProductCard";
import { getPublishedCollectionByHandle } from "@/lib/storefront/content";
import prisma from "@/lib/prisma";
import { getProductImageUrls } from "@/lib/storefront/productImages";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ store: string; handle: string }>;
}) {
  const { store, handle } = await params;
  if (!isValidStore(store)) notFound();

  const shopId = resolveShopIdForStore(store);
  if (!shopId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-white">Store not configured</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">
          Missing env var for this storefront. Set
          <code className="mx-1 rounded bg-white/5 px-2 py-0.5 text-zinc-200">
            {store === "shop" ? "STOREFRONT_SHOP_ID_SHOP" : "STOREFRONT_SHOP_ID_DEV"}
          </code>
          to a valid <code className="mx-1 rounded bg-white/5 px-2 py-0.5 text-zinc-200">Shop.id</code>.
        </p>
      </div>
    );
  }

  if (handle !== "all") {
    const collection = await getPublishedCollectionByHandle(store, handle);
    if (!collection) notFound();

    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{collection.title}</h1>
            {collection.description ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">{collection.description}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="btn btn-secondary" href={`/${store}/search`}>Search</Link>
              <Link className="btn btn-secondary" href={`/${store}/collections/all`}>All products</Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            {collection.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collection.imageUrl} alt={collection.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex min-h-[260px] items-center justify-center text-sm text-zinc-500">Add a collection image in Admin.</div>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.products.map((product) => (
            <ProductCard key={product.id} store={store} product={product} />
          ))}
        </div>
      </div>
    );
  }

  const products = await prisma.product.findMany({
    where: { shopId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 48,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            All Products
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Fresh drops, timeless staples.
          </p>
        </div>
        <Link className="btn btn-secondary" href={`/${store}/search`}>
          Search
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
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
    </div>
  );
}
