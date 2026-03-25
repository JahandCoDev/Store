import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

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

  const shopId = resolveShopIdForStore(store);
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const products =
    shopId && query
      ? await prisma.product.findMany({
          where: {
            shopId,
            status: "ACTIVE",
            title: { contains: query, mode: "insensitive" },
          },
          orderBy: { createdAt: "desc" },
          take: 24,
        })
      : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Search</h1>
        <p className="mt-3 text-sm text-zinc-400">Find products by name.</p>
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

      {!shopId ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-300">
          Store not configured. Set
          <code className="mx-1 rounded bg-white/5 px-2 py-0.5 text-zinc-200">
            {store === "shop" ? "STOREFRONT_SHOP_ID_SHOP" : "STOREFRONT_SHOP_ID_DEV"}
          </code>
          to a valid <code className="mx-1 rounded bg-white/5 px-2 py-0.5 text-zinc-200">Shop.id</code>.
        </p>
      ) : query ? (
        <>
          <p className="mt-6 text-sm text-zinc-400">
            {products.length} result{products.length === 1 ? "" : "s"} for “{query}”
          </p>
          <div className="mt-5 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <Link
                key={p.id}
                href={resolveStorefrontHref(publicBasePath, `/products/${p.handle ?? p.id}`)}
                className="group rounded-xl border border-white/10 bg-zinc-950/40 p-4 transition hover:border-white/20 hover:bg-zinc-950/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <div className="text-sm font-semibold text-white">{p.title}</div>
                <div className="mt-2 text-sm text-zinc-400">${p.price.toFixed(2)}</div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-zinc-400">Enter a query to search this shop.</p>
      )}
    </div>
  );
}
