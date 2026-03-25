import Link from "next/link";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

export type ProductCardModel = {
  id: string;
  handle: string | null;
  title: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
};

export function ProductCard({
  product,
  publicBasePath,
  hrefOverride,
  actionLabel = "View",
}: {
  product: ProductCardModel;
  publicBasePath: string;
  hrefOverride?: string;
  actionLabel?: string;
}) {
  const href =
    hrefOverride ??
    resolveStorefrontHref(publicBasePath, `/products/${product.handle ?? product.id}`);

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/0 transition hover:border-white/20 hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <div className="aspect-square w-full bg-white/[0.03]">
        {product.imageUrl ? (
          // Intentionally using <img> to avoid remote domain config friction.
          // We can switch to next/image once image hosting domains are finalized.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            No image
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {product.title}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm font-medium text-zinc-200">
                ${product.price.toFixed(2)}
              </span>
              {product.compareAtPrice ? (
                <span className="text-xs text-zinc-500 line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-xs text-zinc-500 transition group-hover:text-zinc-300">
            {actionLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}
