import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { buildCartItemKey } from "@/lib/cart/itemKey";
import type { CartItem } from "@/lib/cart/types";
import { cartOptionLines } from "@/lib/cart/optionsSummary";

export const runtime = "nodejs";

type Body = {
  items?: Array<{ key?: string; productId?: string; variantId?: string | null; quantity?: number; options?: CartItem["options"] }>;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const normalized = items
    .filter((i) => i && typeof i.productId === "string" && typeof i.quantity === "number")
    .map((i) => {
      const productId = (i.productId as string).trim();
      const quantity = Math.max(1, Math.floor(i.quantity as number));
      const options = typeof i.options === "object" && i.options ? (i.options as CartItem["options"]) : undefined;
      const variantId = typeof i.variantId === "string" && i.variantId.trim() ? i.variantId : null;
      const key = typeof i.key === "string" && i.key.trim() ? (i.key as string) : buildCartItemKey(productId, options, variantId);
      return { key, productId, variantId, quantity, options };
    })
    .filter((i) => i.productId.length > 0);

  if (normalized.length === 0) {
    return NextResponse.json({ currency: "USD", subtotal: 0, items: [] });
  }

  const uniqueIds = Array.from(new Set(normalized.map((i) => i.productId)));

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { in: uniqueIds },
    },
    select: {
      id: true,
      title: true,
      variants: {
        select: {
          id: true,
          title: true,
          price: true,
          inventory: true,
          trackInventory: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const productById = new Map(products.map((p) => [p.id, p] as const));

  const responseItems = normalized
    .map((i) => {
      const p = productById.get(i.productId);
      if (!p) return null;
      const variant = i.variantId ? p.variants.find((item) => item.id === i.variantId) ?? null : (p.variants[0] ?? null);
      if (!variant) return null;

      const baseCents = Math.max(0, Math.round(Number(variant.price ?? 0) * 100));
      const unitPrice = baseCents / 100;
      const lineTotal = unitPrice * i.quantity;
      const canCheckout = !variant.trackInventory || variant.inventory >= i.quantity;
      const stockMessage = variant.trackInventory
        ? variant.inventory <= 0
          ? "Out of stock"
          : variant.inventory < i.quantity
            ? `Only ${variant.inventory} available`
            : variant.inventory <= 3
              ? `Only ${variant.inventory} left`
              : null
        : "Inventory not tracked";

      return {
        key: i.key,
        productId: p.id,
        variantId: variant.id,
        title: p.title,
        variantTitle: variant.title,
        price: unitPrice,
        quantity: i.quantity,
        lineTotal,
        optionLines: cartOptionLines(i.options),
        trackInventory: variant.trackInventory,
        availableQuantity: variant.trackInventory ? variant.inventory : null,
        canCheckout,
        stockMessage,
      };
    })
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  const subtotal = responseItems.reduce((sum, i) => sum + i.lineTotal, 0);

  return NextResponse.json({ currency: "USD", subtotal, items: responseItems });
}
