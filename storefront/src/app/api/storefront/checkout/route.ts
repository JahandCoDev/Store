import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

import prisma from "@/lib/prisma";
import { buildCartItemKey } from "@/lib/cart/itemKey";
import type { CartItem } from "@/lib/cart/types";
import { cartOptionLines } from "@/lib/cart/optionsSummary";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

type Body = {
  store?: string;
  items?: Array<{ key?: string; productId?: string; variantId?: string | null; quantity?: number; options?: CartItem["options"] }>;
  shipping?: {
    email?: string;
    name?: string;
    phone?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const store = body.store ?? "shop";

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
    return new NextResponse("Cart is empty", { status: 400 });
  }

  const shipping = body.shipping ?? {};
  const email = normalizeString(shipping.email).toLowerCase();
  const shippingName = normalizeString(shipping.name);
  const shippingPhone = normalizeString(shipping.phone) || null;
  const shippingLine1 = normalizeString(shipping.line1);
  const shippingLine2 = normalizeString(shipping.line2) || null;
  const shippingCity = normalizeString(shipping.city);
  const shippingState = normalizeString(shipping.state);
  const shippingZip = normalizeString(shipping.zip);
  const shippingCountry = normalizeString(shipping.country) || "US";

  if (!email || !shippingName || !shippingLine1 || !shippingCity || !shippingState || !shippingZip) {
    return new NextResponse("Missing shipping/contact fields", { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) return new NextResponse("Missing STRIPE_SECRET_KEY", { status: 500 });
  const currency = (process.env.STRIPE_CURRENCY ?? "usd").toLowerCase();
  const currencyUpper = currency.toUpperCase();

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

  const orderItems = [] as Array<{
    variantId: string;
    title: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;

  let subtotalCents = 0;
  for (const item of normalized) {
    const p = productById.get(item.productId);
    if (!p) {
      return new NextResponse(`Unknown product: ${item.productId}`, { status: 400 });
    }

    const variant = item.variantId ? p.variants.find((candidate) => candidate.id === item.variantId) ?? null : (p.variants[0] ?? null);
    if (!variant) {
      return new NextResponse(`Unknown variant for product: ${item.productId}`, { status: 400 });
    }
    if (variant.trackInventory && variant.inventory < item.quantity) {
      return new NextResponse(`Insufficient inventory for ${p.title}`, { status: 409 });
    }

    const baseCents = Math.max(0, Math.round(Number(variant.price ?? 0) * 100));
    const optionLines = cartOptionLines(item.options);
    const optionSummary = optionLines.join(" | ");

    const title = variant.title?.trim() ? `${p.title} - ${variant.title}` : p.title;
    const titleWithOptions = optionSummary ? `${title} (${optionSummary})` : title;
    const unitPrice = baseCents / 100;
    const lineTotalCents = baseCents * item.quantity;
    subtotalCents += lineTotalCents;

    orderItems.push({
      variantId: variant.id,
      title: titleWithOptions,
      sku: null,
      quantity: item.quantity,
      unitPrice,
      lineTotal: lineTotalCents / 100,
    });
  }

  const subtotal = subtotalCents / 100;
  const total = subtotal;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? null;

  const stripe = new Stripe(stripeSecretKey);

  const existingCustomer = await stripe.customers.list({ email, limit: 1 });
  const stripeCustomerId = existingCustomer.data[0]?.id
    ? existingCustomer.data[0].id
    : (
        await stripe.customers.create({
          email,
          name: shippingName,
          phone: shippingPhone ?? undefined,
          address: {
            line1: shippingLine1,
            line2: shippingLine2 ?? undefined,
            city: shippingCity,
            state: shippingState,
            postal_code: shippingZip,
            country: shippingCountry,
          },
          metadata: {
            store,
          },
        })
      ).id;

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        email,
        currency: currencyUpper,
        subtotal: subtotal.toFixed(2),
        taxAmount: "0.00",
        shippingAmount: "0.00",
        total: total.toFixed(2),

        shippingName,
        shippingPhone,
        shippingLine1,
        shippingLine2,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry,

        orderItems: {
          create: orderItems.map((i) => ({
            variantId: i.variantId,
            title: i.title,
            sku: i.sku,
            quantity: i.quantity,
            price: i.unitPrice.toFixed(2),
            lineTotal: i.lineTotal.toFixed(2),
          })),
        },
      },
      select: { id: true, orderNumber: true },
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: subtotalCents,
      currency,
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      customer: stripeCustomerId,
      shipping: {
        name: shippingName,
        phone: shippingPhone ?? undefined,
        address: {
          line1: shippingLine1,
          line2: shippingLine2 ?? undefined,
          city: shippingCity,
          state: shippingState,
          postal_code: shippingZip,
          country: shippingCountry,
        },
      },
      metadata: {
        store,
        orderId: order.id,
      },
    });

    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: "stripe",
        status: "REQUIRES_PAYMENT_METHOD",
        amount: subtotal.toFixed(2),
        currency: currencyUpper,
        stripeCustomerId: stripeCustomerId,
        stripePaymentIntentId: paymentIntent.id,
      },
      select: { id: true },
    });

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientSecret: paymentIntent.client_secret,
      currency: currencyUpper,
      subtotal,
    };
  });

  if (!result.clientSecret) {
    return new NextResponse("Stripe PaymentIntent missing client_secret", { status: 500 });
  }

  return NextResponse.json(result);
}
