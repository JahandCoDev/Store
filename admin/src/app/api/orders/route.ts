// admin/src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

type PrismaTx = Parameters<typeof prisma.$transaction>[0] extends (tx: infer T) => unknown ? T : never;

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
}

async function requireAdminAccess() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
  if (!session || !userId || role !== "ADMIN") return null;
  return { userId };
}

export async function GET(req: Request) {
  try {
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
    } else {
      const auth = await requireAdminAccess();
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch orders with their associated items and customer details
    const orders = await prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            variant: true,
          },
        },
        user: {
          select: { firstName: true, lastName: true, email: true }
        },
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
    } else {
      const auth = await requireAdminAccess();
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { customerId, items, shippingAddress } = body;

    // items array expects objects like: { productId: string, quantity: number, price: number }
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid order data provided" }, { status: 400 });
    }

    // Calculate total on the server to prevent client-side manipulation
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx: PrismaTx) => {
      
      // 1. Create the Order and its nested OrderItems
      const order = await tx.order.create({
        data: {
          userId: customerId,
          email: typeof shippingAddress?.email === "string" ? shippingAddress.email.trim() : "guest@example.com",
          currency: "USD",
          subtotal: total,
          taxAmount: 0,
          shippingAmount: 0,
          total,
          ...(shippingAddress && typeof shippingAddress === "object"
            ? {
                shippingName: typeof shippingAddress.name === "string" ? shippingAddress.name.trim() || null : null,
                shippingPhone: typeof shippingAddress.phone === "string" ? shippingAddress.phone.trim() || null : null,
                shippingLine1: typeof shippingAddress.line1 === "string" ? shippingAddress.line1.trim() || null : null,
                shippingLine2: typeof shippingAddress.line2 === "string" ? shippingAddress.line2.trim() || null : null,
                shippingCity: typeof shippingAddress.city === "string" ? shippingAddress.city.trim() || null : null,
                shippingState: typeof shippingAddress.state === "string" ? shippingAddress.state.trim() || null : null,
                shippingZip: typeof shippingAddress.zip === "string" ? shippingAddress.zip.trim() || null : null,
                shippingCountry:
                  typeof shippingAddress.country === "string" ? shippingAddress.country.trim() || "US" : "US",
              }
            : {}),
          orderItems: {
            create: items.map((item: any) => ({
              variantId: item.productId,
              title: item.title || "Custom Item",
              quantity: item.quantity,
              price: item.price, // Lock in the price at time of purchase
            })),
          },
        },
        include: {
          orderItems: true,
        },
      });

      // 3. Auto-queue print jobs for the new order
      const hasShipTo = Boolean(order.shippingLine1 && order.shippingCity && order.shippingState && order.shippingZip);
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

      return order;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Transaction failed:", error);
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}