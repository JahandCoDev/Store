// admin/src/app/api/stripe/webhook/route.ts
// POST /api/stripe/webhook
// Receives Stripe events and keeps the local database in sync.
// Stripe must be configured to send webhooks to this endpoint.
//
// Handled events:
//   customer.updated / customer.deleted
//   product.updated / product.deleted
//   price.updated   / price.deleted
//   invoice.paid    / invoice.payment_failed
//   payment_intent.succeeded / payment_intent.canceled / payment_intent.payment_failed

import { NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSignature(value: string | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractPaymentIntentId(invoice: Stripe.Invoice): string | null {
  return typeof invoice.payment_intent === "string"
    ? invoice.payment_intent
    : (invoice.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;
}

function extractChargeId(pi: Stripe.PaymentIntent): string | undefined {
  return typeof pi.latest_charge === "string" ? pi.latest_charge : undefined;
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripeSecretKey) return new NextResponse("Missing STRIPE_SECRET_KEY", { status: 500 });
  if (!webhookSecret) return new NextResponse("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });

  const signature = normalizeSignature(req.headers.get("stripe-signature"));
  if (!signature) return new NextResponse("Missing Stripe signature", { status: 400 });

  const rawBody = await req.text();
  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return new NextResponse(message, { status: 400 });
  }

  try {
    // ── Customer events ───────────────────────────────────────────────────────
    if (event.type === "customer.updated") {
      const customer = event.data.object as Stripe.Customer;
      const localUserId = customer.metadata?.localUserId;

      if (localUserId) {
        await prisma.user.updateMany({
          where: { id: localUserId },
          data: {
            // Keep phone in sync if set on the Stripe customer
            phone: customer.phone ?? undefined,
          },
        });
      } else if (customer.email) {
        // Fall back to email match
        await prisma.user.updateMany({
          where: { email: customer.email },
          data: { stripeCustomerId: customer.id },
        });
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "customer.deleted") {
      const customer = event.data.object as Stripe.Customer;

      await prisma.user.updateMany({
        where: { stripeCustomerId: customer.id },
        data: { stripeCustomerId: null },
      });

      return NextResponse.json({ received: true });
    }

    // ── Product events ────────────────────────────────────────────────────────
    if (event.type === "product.updated") {
      const product = event.data.object as Stripe.Product;
      const localProductId = product.metadata?.localProductId;

      if (localProductId) {
        await prisma.product.updateMany({
          where: { id: localProductId },
          data: {
            stripeProductId: product.id,
            status: product.active ? "ACTIVE" : "ARCHIVED",
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "product.deleted") {
      const product = event.data.object as Stripe.Product;

      await prisma.product.updateMany({
        where: { stripeProductId: product.id },
        data: { stripeProductId: null, status: "ARCHIVED" },
      });

      return NextResponse.json({ received: true });
    }

    // ── Price events ──────────────────────────────────────────────────────────
    if (event.type === "price.updated" || event.type === "price.deleted") {
      const price = event.data.object as Stripe.Price;
      const localVariantId = price.metadata?.localVariantId;

      if (event.type === "price.deleted" && localVariantId) {
        await prisma.productVariant.updateMany({
          where: { id: localVariantId },
          data: { stripePriceId: null },
        });
      }

      return NextResponse.json({ received: true });
    }

    // ── Invoice events ────────────────────────────────────────────────────────
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const paymentIntentId = extractPaymentIntentId(invoice);

      if (paymentIntentId) {
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: paymentIntentId },
          data: { status: "SUCCEEDED" },
        });
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const paymentIntentId = extractPaymentIntentId(invoice);

      if (paymentIntentId) {
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: paymentIntentId },
          data: { status: "REQUIRES_PAYMENT_METHOD" },
        });
      }

      return NextResponse.json({ received: true });
    }

    // ── PaymentIntent events ──────────────────────────────────────────────────
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { stripePaymentIntentId: pi.id },
          include: { order: true },
        });

        if (!payment?.order) return;
        if (payment.status === "SUCCEEDED") return; // idempotent

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            stripeChargeId: extractChargeId(pi),
          },
        });

        if (payment.order.financialStatus !== "PAID") {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { financialStatus: "PAID", status: "PROCESSING" },
          });
        }
      });

      return NextResponse.json({ received: true });
    }

    if (
      event.type === "payment_intent.canceled" ||
      event.type === "payment_intent.payment_failed"
    ) {
      const pi = event.data.object as Stripe.PaymentIntent;
      const newStatus =
        event.type === "payment_intent.canceled" ? "CANCELED" : "REQUIRES_PAYMENT_METHOD";

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { stripePaymentIntentId: pi.id },
          include: { order: true },
        });

        if (!payment?.order) return;

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: newStatus },
        });

        if (payment.order.financialStatus !== "PAID") {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: "CANCELLED", financialStatus: "VOIDED" },
          });
        }
      });

      return NextResponse.json({ received: true });
    }

    // Unknown / unhandled event type
    return NextResponse.json({ received: true, ignored: true });
  } catch (error) {
    console.error("Admin Stripe webhook error", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
