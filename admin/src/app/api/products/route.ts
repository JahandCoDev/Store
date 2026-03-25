import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveCoreShopIdFromCookie, resolveDatadogAppAuth } from "@/lib/serviceAuth";

import { ensureUniqueProductHandle, normalizeProductHandle } from "@/lib/productHandle";

function normalizeImagesInput(images: unknown): Array<string | { url?: string; src?: string }> {
  if (images == null) return [];

  if (Array.isArray(images)) {
    return images
      .map((img) => {
        if (typeof img === "string") return img.trim();
        if (img && typeof img === "object") {
          const maybeUrl = (img as { url?: unknown }).url;
          const maybeSrc = (img as { src?: unknown }).src;
          const value = typeof maybeUrl === "string" ? maybeUrl : typeof maybeSrc === "string" ? maybeSrc : "";
          return value.trim() ? { url: value.trim() } : null;
        }
        return null;
      })
      .filter(Boolean) as Array<string | { url?: string; src?: string }>;
  }

  if (typeof images === "string") {
    return images
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

async function getSelectedShopId(): Promise<string> {
  return resolveCoreShopIdFromCookie();
}

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
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

export async function GET(req: Request) {
  try {
    let shopId: string;
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
      shopId = dd.shopId;
    } else {
      shopId = await getSelectedShopId();
      const auth = await requireShopAccess(shopId);
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const products = await prisma.product.findMany({ where: { shopId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    let shopId: string;
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });
      shopId = dd.shopId;
    } else {
      shopId = await getSelectedShopId();
      const auth = await requireShopAccess(shopId);
      if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const backDesignUpcharge =
      typeof body?.backDesignUpcharge === "number" && Number.isFinite(body.backDesignUpcharge) && body.backDesignUpcharge >= 0
        ? body.backDesignUpcharge
        : 0;
    const specialTextUpcharge =
      typeof body?.specialTextUpcharge === "number" && Number.isFinite(body.specialTextUpcharge) && body.specialTextUpcharge >= 0
        ? body.specialTextUpcharge
        : 0;

    const VALID_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
    const status = VALID_STATUSES.includes(body?.status) ? body.status : "DRAFT";

    const normalizedHandle = normalizeProductHandle(body?.handle);
    const handle = await ensureUniqueProductHandle({
      shopId,
      base: normalizedHandle ?? String(body.title ?? ""),
    });

    const product = await prisma.product.create({
      data: {
        shopId,
        handle,
        title: body.title,
        description: body.description ?? "",
        status,
        images: normalizeImagesInput(body?.images),
        price: body.price,
        backDesignUpcharge,
        specialTextUpcharge,
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
