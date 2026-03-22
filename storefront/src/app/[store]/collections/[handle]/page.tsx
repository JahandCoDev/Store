import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";
import { ProductCard } from "@/components/shop/ProductCard";
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

  // Until we model collections in Postgres, treat /collections/all as a product listing.
  if (handle !== "all") notFound();

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
