// admin/src/app/api/stripe/sync-product/route.ts
// POST /api/stripe/sync-product
// Upserts a local Product (and its variants as Stripe Prices) to Stripe,
// then stores stripeProductId and stripePriceId back in the DB.
//
// Body: { productId: string }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const DEFAULT_CURRENCY = "usd";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "ADMIN") return null;
  return session;
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const obj = isRecord(body) ? body : {};
  const productId = typeof obj.productId === "string" ? obj.productId.trim() : null;

  if (!productId) {
    return NextResponse.json({ error: "Provide productId" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: {
        select: {
          id: true,
          title: true,
          price: true,
          stripePriceId: true,
          sku: true,
        },
      },
    },
  });

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const stripe = getStripe();

  let stripeProductId = product.stripeProductId;

  if (stripeProductId) {
    // Update the existing Stripe product
    await stripe.products.update(stripeProductId, {
      name: product.title,
      description: product.description || undefined,
      active: product.status === "ACTIVE",
      metadata: { localProductId: product.id, handle: product.handle },
    });
  } else {
    // Create new Stripe product
    const created = await stripe.products.create({
      name: product.title,
      description: product.description || undefined,
      active: product.status === "ACTIVE",
      metadata: { localProductId: product.id, handle: product.handle },
    });
    stripeProductId = created.id;

    await prisma.product.update({
      where: { id: product.id },
      data: { stripeProductId },
    });
  }

  // Sync each variant as a Stripe Price
  const variantResults: Array<{ variantId: string; stripePriceId: string }> = [];

  for (const variant of product.variants) {
    const unitAmount = Math.round(Number(variant.price) * 100);

    let stripePriceId = variant.stripePriceId;

    if (stripePriceId) {
      // Prices are immutable in Stripe — check if amount changed; if so, archive old and create new.
      try {
        const existingPrice = await stripe.prices.retrieve(stripePriceId);
        if (existingPrice.unit_amount !== unitAmount) {
          // Archive old price and create a new one
          await stripe.prices.update(stripePriceId, { active: false });
          stripePriceId = null;
        }
      } catch {
        stripePriceId = null;
      }
    }

    if (!stripePriceId) {
      const currency = (process.env.STRIPE_CURRENCY ?? DEFAULT_CURRENCY).toLowerCase();
      const newPrice = await stripe.prices.create({
        product: stripeProductId!,
        unit_amount: unitAmount,
        currency,
        metadata: {
          localVariantId: variant.id,
          sku: variant.sku ?? "",
        },
      });
      stripePriceId = newPrice.id;
    }

    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stripePriceId },
    });

    variantResults.push({ variantId: variant.id, stripePriceId });
  }

  return NextResponse.json({ stripeProductId, variants: variantResults });
}
