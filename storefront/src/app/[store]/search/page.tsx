import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";
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
    <div className="section section--page-width" style={{ padding: "48px 0" }}>
      <h1>Search</h1>

      <form action={`/${store}/search`} method="get" style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          name="q"
          defaultValue={query}
          placeholder="Search products"
          style={{
            minWidth: 260,
            padding: "10px 12px",
          }}
        />
        <button className="button" type="submit">
          Search
        </button>
      </form>

      {!shopId ? (
        <p style={{ marginTop: 16, maxWidth: 720, lineHeight: 1.6 }}>
          Store not configured. Set
          <code style={{ padding: "0 6px" }}>
            {store === "shop" ? "STOREFRONT_SHOP_ID_SHOP" : "STOREFRONT_SHOP_ID_DEV"}
          </code>
          to a valid <code style={{ padding: "0 6px" }}>Shop.id</code>.
        </p>
      ) : query ? (
        <>
          <p style={{ marginTop: 16, opacity: 0.8 }}>
            {products.length} result{products.length === 1 ? "" : "s"} for “{query}”
          </p>
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/${store}/products/${p.handle ?? p.id}`}
                style={{ padding: 16 }}
              >
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div style={{ marginTop: 6, opacity: 0.8 }}>${p.price.toFixed(2)}</div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p style={{ marginTop: 16, opacity: 0.8 }}>Enter a query to search this shop.</p>
      )}
    </div>
  );
}
