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
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
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

    const products = await prisma.product.findMany({ where: { shopId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
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

    const VALID_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
    const status = VALID_STATUSES.includes(body?.status) ? body.status : "DRAFT";

    const product = await prisma.product.create({
      data: {
        shopId,
        title: body.title,
        description: body.description ?? "",
        status,
        price: body.price,
        compareAtPrice: body.compareAtPrice ?? null,
        cost: body.cost ?? null,
        inventory: body.inventory ?? 0,
        sku: body.sku ?? null,
        barcode: body.barcode ?? null,
        weight: body.weight ?? null,
        vendor: body.vendor ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
