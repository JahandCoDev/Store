import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";
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
      <div className="section section--page-width" style={{ padding: "48px 0" }}>
        <h1>Store not configured</h1>
        <p style={{ marginTop: 12, maxWidth: 720, lineHeight: 1.6 }}>
          Missing env var for this storefront. Set
          <code style={{ padding: "0 6px" }}>
            {store === "shop" ? "STOREFRONT_SHOP_ID_SHOP" : "STOREFRONT_SHOP_ID_DEV"}
          </code>
          to a valid <code style={{ padding: "0 6px" }}>Shop.id</code>.
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
    <div className="section section--page-width" style={{ padding: "48px 0" }}>
      <h1>All Products</h1>

      <div
        style={{
          marginTop: 24,
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
    </div>
  );
}
