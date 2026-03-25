import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductOrderPanel } from "@/components/shop/ProductOrderPanel";
import prisma from "@/lib/prisma";
import { getProductImageUrls } from "@/lib/storefront/productImages";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export default async function ProductPage({
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

  const product = await prisma.product.findFirst({
    where: {
      shopId,
      status: "ACTIVE",
      OR: [{ handle }, { id: handle }],
    },
  });
  if (!product) notFound();

  const images = getProductImageUrls(product.images);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
        <ProductGallery images={images} title={product.title} />

        <div className="animate-fade-in">
          <p className="text-xs tracking-[0.2em] uppercase text-zinc-500">Product</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {product.title}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <div className="text-xl font-semibold text-white">
              ${product.price.toFixed(2)}
            </div>
            {product.compareAtPrice ? (
              <div className="text-sm text-zinc-500 line-through">
                ${product.compareAtPrice.toFixed(2)}
              </div>
            ) : null}
          </div>

          {product.vendor ? (
            <div className="mt-2 text-sm text-zinc-400">By {product.vendor}</div>
          ) : null}

          {product.description ? (
            <p className="mt-6 max-w-prose text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {product.description}
            </p>
          ) : null}

          <ProductOrderPanel store={store} productId={product.id} previewImageUrl={images[0] ?? null} />

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex flex-wrap gap-3">
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/cart")}>
                Go to cart
              </Link>
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>
                Continue shopping
              </Link>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-300">
            <div className="flex flex-wrap gap-3">
              {product.inventory > 0 ? (
                <span className="text-zinc-300">
                  In stock: <span className="text-white font-semibold">{product.inventory}</span>
                </span>
              ) : (
                <span className="text-zinc-400">Out of stock</span>
              )}
              {product.sku ? (
                <span className="text-zinc-500">SKU: {product.sku}</span>
              ) : null}
            </div>

            {product.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {product.tags.slice(0, 10).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
