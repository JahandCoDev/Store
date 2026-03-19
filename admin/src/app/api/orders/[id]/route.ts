// admin/src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";

const VALID_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

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

  return { userId, shopUserId: membership.id };
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const order = await prisma.order.findFirst({
      where: { id, shopId },
      include: {
        user: { select: { name: true, email: true } },
        orderItems: {
          include: { product: { select: { id: true, title: true, price: true } } },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    console.error("Failed to fetch order:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const status = body?.status as string | undefined;
    if (!status || !VALID_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findFirst({ where: { id, shopId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
