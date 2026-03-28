import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { buildCartItemKey } from "@/lib/cart/itemKey";
import type { CartItem } from "@/lib/cart/types";
import { cartOptionLines } from "@/lib/cart/optionsSummary";

export const runtime = "nodejs";

type Body = {
  items?: Array<{ key?: string; productId?: string; quantity?: number; options?: CartItem["options"] }>;
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
      status: "ACTIVE",
      id: { in: uniqueIds },
    },
    select: {
      id: true,
      title: true,
      variants: { select: { price: true }, take: 1 },
    },
  });

  const productById = new Map(products.map((p) => [p.id, p] as const));

  const responseItems = normalized
    .map((i) => {
      const p = productById.get(i.productId);
      if (!p) return null;
      const baseCents = Math.max(0, Math.round(Number(p.variants[0]?.price ?? 0) * 100));
      const unitPrice = baseCents / 100;
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
