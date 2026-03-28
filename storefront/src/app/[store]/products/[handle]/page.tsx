import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductOrderPanel } from "@/components/shop/ProductOrderPanel";
import prisma from "@/lib/prisma";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

function getMediaUrl(storageKey: string) {
  return `/${storageKey.replace(/^\/+/, "")}`;
}

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

  const product = await prisma.product.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ handle }, { id: handle }],
    },
    include: {
      variants: {
        select: {
          id: true,
          title: true,
          price: true,
          compareAtPrice: true,
          sku: true,
          inventory: true,
          trackInventory: true,
          size: true,
          color: true,
        },
        orderBy: { createdAt: "asc" },
      },
      media: { select: { asset: { select: { storageKey: true } } }, orderBy: { position: "asc" } },
    },
  });
  if (!product) notFound();

  const variant = product.variants[0];
  const trackedVariants = product.variants.filter((item) => item.trackInventory);
  const totalTrackedInventory = trackedVariants.reduce((sum, item) => sum + item.inventory, 0);
  const images = product.media.map((m) => getMediaUrl(m.asset.storageKey));

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
              ${Number(variant?.price ?? 0).toFixed(2)}
            </div>
            {variant?.compareAtPrice ? (
              <div className="text-sm text-zinc-500 line-through">
                ${Number(variant.compareAtPrice).toFixed(2)}
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

          <ProductOrderPanel
            store={store}
            productId={product.id}
            previewImageUrl={images[0] ?? null}
            variants={product.variants.map((item) => ({
              id: item.id,
              title: item.title,
              price: Number(item.price),
              compareAtPrice: item.compareAtPrice ? Number(item.compareAtPrice) : null,
              sku: item.sku,
              inventory: item.inventory,
              trackInventory: item.trackInventory,
              size: item.size,
              color: item.color,
            }))}
          />

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
              {trackedVariants.length === 0 ? (
                <span className="text-zinc-300">Inventory not tracked</span>
              ) : totalTrackedInventory > 0 ? (
                <span className="text-zinc-300">
                  Tracked inventory: <span className="text-white font-semibold">{totalTrackedInventory}</span>
                </span>
              ) : (
                <span className="text-zinc-400">Out of stock</span>
              )}
              {variant?.sku ? (
                <span className="text-zinc-500">SKU: {variant.sku}</span>
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
