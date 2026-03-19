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

  return { userId, shopUserId: membership.id };
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const customer = await prisma.customer.findFirst({
      where: { id, shopId },
      include: {
        addresses: { orderBy: { createdAt: "desc" } },
        consent: true,
        notes: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { include: { user: { select: { email: true, name: true } } } } },
        },
      },
    });

    if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
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

    const data: any = {};
    if (typeof body?.phone === "string") data.phone = body.phone.trim() || null;
    if (typeof body?.firstName === "string") data.firstName = body.firstName.trim() || null;
    if (typeof body?.lastName === "string") data.lastName = body.lastName.trim() || null;
    if (Array.isArray(body?.tags)) {
      data.tags = body.tags
        .filter((t: any) => typeof t === "string")
        .map((t: string) => t.trim())
        .filter(Boolean);
    }

    const updated = await prisma.customer.update({
      where: { id },
      data,
      select: { id: true, email: true, phone: true, firstName: true, lastName: true, tags: true, updatedAt: true },
    });

    // Ensure no cross-shop updates silently succeeded
    const belongs = await prisma.customer.count({ where: { id: updated.id, shopId } });
    if (belongs !== 1) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update customer:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const deleted = await prisma.customer.deleteMany({ where: { id, shopId } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
