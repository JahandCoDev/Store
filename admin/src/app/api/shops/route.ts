import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";

function getSelectedShopIdFromCookie(): string | null {
  return cookies().get("shopId")?.value ?? null;
}

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;

  if (!session || !userId || role !== "ADMIN") {
    return null;
  }
  return { userId };
}

export async function GET() {
  try {
    const auth = await requireAdminSession();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // If the user has no shops yet, create a default shop and attach them as OWNER.
    const existingCount = await prisma.shopUser.count({ where: { userId: auth.userId } });
    if (existingCount === 0) {
      await prisma.shop.create({
        data: {
          name: "Default Shop",
          users: {
            create: {
              userId: auth.userId,
              role: "OWNER",
            },
          },
        },
      });
    }

    const shops = await prisma.shop.findMany({
      where: { users: { some: { userId: auth.userId } } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });

    const cookieShopId = getSelectedShopIdFromCookie();
    const hasValidCookie = cookieShopId && shops.some((s) => s.id === cookieShopId);
    const selectedShopId = hasValidCookie ? cookieShopId : shops[0]?.id ?? null;

    const res = NextResponse.json({ shops, selectedShopId });
    if (selectedShopId && selectedShopId !== cookieShopId) {
      res.cookies.set("shopId", selectedShopId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }
    return res;
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    return NextResponse.json({ error: "Failed to fetch shops" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminSession();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
    }

    const shop = await prisma.shop.create({
      data: {
        name,
        users: {
          create: {
            userId: auth.userId,
            role: "OWNER",
          },
        },
      },
      select: { id: true, name: true },
    });

    return NextResponse.json(shop, { status: 201 });
  } catch (error) {
    console.error("Failed to create shop:", error);
    return NextResponse.json({ error: "Failed to create shop" }, { status: 500 });
  }
}
