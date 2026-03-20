import Stripe from "stripe";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export const runtime = "nodejs";

type Body = {
  store?: string;
  items?: Array<{ productId?: string; quantity?: number }>;
};

function getBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim()) return env.trim().replace(/\/$/, "");
  return new URL(req.url).origin;
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
    .map((i) => ({
      productId: i.productId as string,
      quantity: Math.max(1, Math.floor(i.quantity as number)),
    }))
    .filter((i) => i.productId.trim().length > 0);

  if (normalized.length === 0) {
    return new NextResponse("Cart is empty", { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return new NextResponse("Missing STRIPE_SECRET_KEY", { status: 500 });
  }

  const currency = (process.env.STRIPE_CURRENCY ?? "usd").toLowerCase();

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

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const item of normalized) {
    const p = productById.get(item.productId);
    if (!p) {
      return new NextResponse(`Unknown product: ${item.productId}`, { status: 400 });
    }

    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency,
        unit_amount: Math.max(0, Math.round(p.price * 100)),
        product_data: {
          name: p.title,
          metadata: { productId: p.id, shopId },
        },
      },
    });
  }

  const stripe = new Stripe(stripeSecretKey);
  const baseUrl = getBaseUrl(req);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${baseUrl}/${store}/cart?success=1`,
    cancel_url: `${baseUrl}/${store}/cart?canceled=1`,
    metadata: {
      store,
      shopId,
    },
  });

  if (!session.url) {
    return new NextResponse("Stripe session missing URL", { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
