// admin/src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";

function getSelectedShopId(): string | null {
  return cookies().get("shopId")?.value ?? null;
}

async function requireShopAccess(shopId: string) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;
  if (!session || !userId || role !== "ADMIN") return null;

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) return null;
  return { userId };
}

export async function GET() {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) {
      return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    }
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Fetch orders with their associated items and customer details
    const orders = await prisma.order.findMany({
      where: { shopId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: {
          select: { name: true, email: true }
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
    const shopId = getSelectedShopId();
    if (!shopId) {
      return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    }
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { customerId, items } = body; 

    // items array expects objects like: { productId: string, quantity: number, price: number }
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid order data provided" }, { status: 400 });
    }

    // Calculate total on the server to prevent client-side manipulation
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Create the Order and its nested OrderItems
      const order = await tx.order.create({
        data: {
          shopId,
          customerId,
          total,
          orderItems: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price, // Lock in the price at time of purchase
            })),
          },
        },
        include: {
          orderItems: true,
        },
      });

      // 2. Safely decrement inventory for each purchased product
      for (const item of items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, shopId },
          data: {
            inventory: {
              decrement: item.quantity,
            },
          },
        });
        if (updated.count !== 1) {
          throw new Error(`Product not found in shop: ${item.productId}`);
        }
      }

      return order;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Transaction failed:", error);
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}