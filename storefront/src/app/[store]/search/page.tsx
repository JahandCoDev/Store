import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductCard } from "@/components/shop/ProductCard";
import prisma from "@/lib/prisma";
import { getStorefrontMediaUrl } from "@/lib/storefront/media";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ store: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) notFound();
  const { publicBasePath } = await getStorefrontRequestContext(store);

  if (store === "dev") {
    redirect(resolveStorefrontHref(publicBasePath, "/"));
  }

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const products = query
    ? await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          title: { contains: query, mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
        take: 24,
        include: {
          variants: { select: { price: true, compareAtPrice: true, inventory: true, trackInventory: true }, take: 1 },
          media: { select: { asset: { select: { storageKey: true } } }, orderBy: { position: "asc" }, take: 1 },
        },
      })
    : [];

  return (
    <div className="store-section py-8 sm:py-10">
      <div className="store-container">
      <div className="max-w-2xl">
        <h1 className="store-title text-3xl font-semibold tracking-tight sm:text-4xl">Search</h1>
        <p className="store-copy mt-3 text-sm">Find products by name.</p>
      </div>

      <form action={resolveStorefrontHref(publicBasePath, "/search")} method="get" className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search products"
          className="w-full sm:w-80 rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <button className="btn btn-primary" type="submit">
          Search
        </button>
      </form>

      {query ? (
        <>
          <p className="store-copy mt-6 text-sm">
            {products.length} result{products.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
                  imageUrl: p.media[0]?.asset?.storageKey ? getStorefrontMediaUrl(p.media[0].asset.storageKey) : null,
                  outOfStock: Boolean(p.variants[0]?.trackInventory && (p.variants[0]?.inventory ?? 0) <= 0),
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="store-copy mt-6 text-sm">Enter a query to search products.</p>
      )}
      </div>
    </div>
  );
}
