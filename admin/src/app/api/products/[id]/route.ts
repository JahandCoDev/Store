// admin/src/app/api/products/[id]/route.ts
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

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, shopId } });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
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

    const existing = await prisma.product.findFirst({ where: { id, shopId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: any = {};
    if (typeof body?.title === "string" && body.title.trim()) data.title = body.title.trim();
    if (typeof body?.description === "string") data.description = body.description.trim();
    if (typeof body?.price === "number" && Number.isFinite(body.price)) data.price = body.price;
    if (typeof body?.inventory === "number" && Number.isInteger(body.inventory)) data.inventory = body.inventory;

    const updated = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const deleted = await prisma.product.deleteMany({ where: { id, shopId } });
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete product:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
