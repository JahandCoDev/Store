import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/AddToCartButton";
import prisma from "@/lib/prisma";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export default async function ProductPage({
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

  const product = await prisma.product.findFirst({
    where: {
      shopId,
      status: "ACTIVE",
      OR: [{ handle }, { id: handle }],
    },
  });
  if (!product) notFound();

  return (
    <div className="section section--page-width" style={{ padding: "48px 0" }}>
      <h1>{product.title}</h1>
      <div style={{ marginTop: 8, opacity: 0.8 }}>${product.price.toFixed(2)}</div>
      {product.description ? (
        <p style={{ marginTop: 16, maxWidth: 720, lineHeight: 1.6 }}>{product.description}</p>
      ) : null}

      <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <AddToCartButton store={store} productId={product.id} />
        <Link className="button-secondary" href={`/${store}/cart`}>
          Go to cart
        </Link>
      </div>
    </div>
  );
}
