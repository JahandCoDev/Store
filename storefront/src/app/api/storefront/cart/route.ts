import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export const runtime = "nodejs";

type Body = {
  store?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
};

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
    .map((i) => ({
      productId: i.productId as string,
      quantity: Math.max(1, Math.floor(i.quantity as number)),
    }))
    .filter((i) => i.productId.trim().length > 0);

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
    select: { id: true, title: true, price: true },
  });

  const productById = new Map(products.map((p) => [p.id, p] as const));

  const responseItems = normalized
    .map((i) => {
      const p = productById.get(i.productId);
      if (!p) return null;
      const lineTotal = p.price * i.quantity;
      return {
        productId: p.id,
        title: p.title,
        price: p.price,
        quantity: i.quantity,
        lineTotal,
      };
    })
    .filter((i): i is NonNullable<typeof i> => Boolean(i));

  const subtotal = responseItems.reduce((sum, i) => sum + i.lineTotal, 0);

  return NextResponse.json({ currency: "USD", subtotal, items: responseItems });
}
