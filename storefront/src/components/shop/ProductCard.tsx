import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

export type ProductCardModel = {
  id: string;
  handle: string | null;
  title: string;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  outOfStock?: boolean;
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
      className="group block overflow-hidden rounded-[1.65rem] border border-[rgba(112,135,187,0.18)] bg-[linear-gradient(180deg,rgba(10,15,28,0.78),rgba(6,10,19,0.72))] shadow-[0_20px_50px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-[rgba(112,135,187,0.32)] hover:shadow-[0_24px_70px_rgba(0,0,0,0.32)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[rgba(255,255,255,0.03)]">
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(2,5,10,0.45))]" />
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            No image
          </div>
        )}
        {product.outOfStock ? (
          <div className="absolute left-3 top-3 z-20 rounded-full border border-white/12 bg-black/70 px-2.5 py-1 text-xs font-semibold text-zinc-300 backdrop-blur-sm">
            Out of stock
          </div>
        ) : null}
      </div>

      <div className="p-5">
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

          <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(112,135,187,0.2)] bg-[rgba(11,18,33,0.72)] px-3 py-1 text-xs text-zinc-300 transition group-hover:border-[rgba(112,135,187,0.34)] group-hover:text-white">
            {actionLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
