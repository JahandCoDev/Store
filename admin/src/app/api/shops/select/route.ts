import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CORE_SHOP_IDS } from "@/lib/coreShops";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | null | undefined)?.id;
    const role = (session?.user as { role?: string } | null | undefined)?.role;

    if (!session || !userId || role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json().catch(() => ({}));
    const shopId = isRecord(body) && typeof body.shopId === "string" ? body.shopId : "";
    if (!shopId) {
      return NextResponse.json({ error: "shopId is required" }, { status: 400 });
    }

    if (!CORE_SHOP_IDS.has(shopId)) {
      return NextResponse.json({ error: "Invalid shop" }, { status: 400 });
    }

    const membership = await prisma.shopUser.findUnique({
      where: { shopId_userId: { shopId, userId } },
      select: { id: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("shopId", shopId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Failed to select shop:", error);
    return NextResponse.json({ error: "Failed to select shop" }, { status: 500 });
  }
}
