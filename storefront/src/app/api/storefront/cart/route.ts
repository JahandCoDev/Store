import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { buildCartItemKey } from "@/lib/cart/itemKey";
import type { CartItem } from "@/lib/cart/types";
import { cartOptionLines } from "@/lib/cart/optionsSummary";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export const runtime = "nodejs";

type Body = {
  store?: string;
  items?: Array<{ key?: string; productId?: string; quantity?: number; options?: CartItem["options"] }>;
};

function upchargeCents(
  product: { backDesignUpcharge: number; specialTextUpcharge: number },
  options: CartItem["options"] | undefined
): number {
  if (!options) return 0;

  const extra =
    (options.backDesign?.enabled ? product.backDesignUpcharge : 0) +
    (options.specialText?.enabled ? product.specialTextUpcharge : 0);

  if (!Number.isFinite(extra) || extra <= 0) return 0;
  return Math.max(0, Math.round(extra * 100));
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const store = body.store;
  if (!store || !isValidStore(store)) return new NextResponse("Invalid store", { status: 400 });

  const shopId = resolveShopIdForStore(store);
  if (!shopId) return new NextResponse("Store not configured", { status: 400 });

  const items = Array.isArray(body.items) ? body.items : [];
  const normalized = items
    .filter((i) => i && typeof i.productId === "string" && typeof i.quantity === "number")
    .map((i) => {
      const productId = (i.productId as string).trim();
      const quantity = Math.max(1, Math.floor(i.quantity as number));
      const options = typeof i.options === "object" && i.options ? (i.options as CartItem["options"]) : undefined;
      const key = typeof i.key === "string" && i.key.trim() ? (i.key as string) : buildCartItemKey(productId, options);
      return { key, productId, quantity, options };
    })
    .filter((i) => i.productId.length > 0);

  if (normalized.length === 0) {
    return NextResponse.json({ currency: "USD", subtotal: 0, items: [] });
  }

  const uniqueIds = Array.from(new Set(normalized.map((i) => i.productId)));

  const products = await prisma.product.findMany({
    where: {
      shopId,
      status: "ACTIVE",
      id: { in: uniqueIds },
    },
    select: { id: true, title: true, price: true, backDesignUpcharge: true, specialTextUpcharge: true },
  });

  const productById = new Map(products.map((p) => [p.id, p] as const));

  const responseItems = normalized
    .map((i) => {
      const p = productById.get(i.productId);
      if (!p) return null;
      const baseCents = Math.max(0, Math.round(p.price * 100));
      const extraCents = upchargeCents(p, i.options);
      const unitCents = baseCents + extraCents;
      const unitPrice = unitCents / 100;
      const lineTotal = unitPrice * i.quantity;
      return {
        key: i.key,
        productId: p.id,
        title: p.title,
        price: unitPrice,
        quantity: i.quantity,
        lineTotal,
        optionLines: cartOptionLines(i.options),
      };
    })
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  const subtotal = responseItems.reduce((sum, i) => sum + i.lineTotal, 0);

  return NextResponse.json({ currency: "USD", subtotal, items: responseItems });
}
