import Stripe from "stripe";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { sendStorefrontTemplateEmail } from "@/lib/email/storefrontMailer";
import { buildOrderConfirmationEmail } from "@/lib/email/orderConfirmationEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeStripeSignature(value: string | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripeSecretKey) return new NextResponse("Missing STRIPE_SECRET_KEY", { status: 500 });
  if (!webhookSecret) return new NextResponse("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });

  const signature = normalizeStripeSignature(req.headers.get("stripe-signature"));
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
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = paymentIntent.id;

      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        include: {
          order: {
            include: {
              orderItems: {
                include: {
                  variant: {
                    select: {
                      id: true,
                      inventory: true,
                      trackInventory: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return NextResponse.json({ received: true, ignored: true });
      }

      const order = payment.order;
      if (!order) return NextResponse.json({ received: true, ignored: true });

      const alreadyFinalized = payment.status === "SUCCEEDED" && order.financialStatus === "PAID";
      if (alreadyFinalized) {
        return NextResponse.json({ received: true, deduped: true });
      }

      const hasShipTo = Boolean(order.shippingLine1 && order.shippingCity && order.shippingState && order.shippingZip);

      const transition = await prisma.$transaction(async (tx) => {
        const freshPayment = await tx.payment.findUnique({
          where: { id: payment.id },
          include: { order: true },
        });
        if (!freshPayment?.order) {
          return { shouldEmail: false, orderId: order.id, orderNumber: order.orderNumber, email: order.email };
        }

        if (freshPayment.status === "SUCCEEDED" && freshPayment.order.financialStatus === "PAID") {
          return { shouldEmail: false, orderId: order.id, orderNumber: order.orderNumber, email: order.email };
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCEEDED",
            stripeChargeId: typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : undefined,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            financialStatus: "PAID",
            status: "PROCESSING",
          },
        });

        // Decrement inventory (best-effort; if inventory is already low we still keep the order paid).
        for (const item of order.orderItems) {
          const variant = item.variant;
          if (!variant?.trackInventory) continue;
          if (!item.variantId) continue;

          await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              inventory: { gte: item.quantity },
            },
            data: {
              inventory: { decrement: item.quantity },
            },
          });
        }

        await tx.printJob.createMany({
          data: [
            {
              type: "INVOICE",
              assetUrl: `/api/invoices/${order.id}`,
              metadata: { orderId: order.id },
            },
            {
              type: "PACKING_SLIP",
              assetUrl: `/api/packing-slips/${order.id}`,
              metadata: { orderId: order.id },
            },
            ...(hasShipTo
              ? [
                  {
                    type: "SHIPPING_LABEL",
                    assetUrl: `/api/shipping-labels/${order.id}`,
                    metadata: { orderId: order.id },
                  },
                ]
              : []),
          ],
        });

        return { shouldEmail: true, orderId: order.id, orderNumber: order.orderNumber, email: order.email };
      });

      if (transition.shouldEmail) {
        const template = buildOrderConfirmationEmail({
          orderNumber: transition.orderNumber,
          currency: order.currency,
          items: order.orderItems.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            unitPrice: Number(i.price.toString()),
            lineTotal: i.lineTotal ? Number(i.lineTotal.toString()) : Number(i.price.toString()) * i.quantity,
          })),
          totals: {
            subtotal: Number(order.subtotal.toString()),
            shipping: Number(order.shippingAmount.toString()),
            tax: Number(order.taxAmount.toString()),
            total: Number(order.total.toString()),
          },
          shipping: {
            name: order.shippingName ?? "",
            line1: order.shippingLine1 ?? "",
            line2: order.shippingLine2 ?? "",
            city: order.shippingCity ?? "",
            state: order.shippingState ?? "",
            zip: order.shippingZip ?? "",
            country: order.shippingCountry ?? "",
          },
        });

        await sendStorefrontTemplateEmail({
          to: transition.email,
          subject: `Order #${transition.orderNumber} confirmed`,
          template,
        });
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === "payment_intent.canceled" || event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = paymentIntent.id;

      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
        include: { order: true },
      });

      if (!payment?.order) {
        return NextResponse.json({ received: true, ignored: true });
      }

      const newStatus = event.type === "payment_intent.canceled" ? "CANCELED" : "REQUIRES_PAYMENT_METHOD";

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: newStatus },
        });

        if (payment.order.financialStatus !== "PAID") {
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              status: "CANCELLED",
              financialStatus: "VOIDED",
            },
          });
        }
      });

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch (error) {
    console.error("Stripe webhook error", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
