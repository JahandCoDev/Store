import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

const CORE_SHOPS = [
  { id: "jahandco-shop", name: "Jah and Co Apparel" },
  { id: "jahandco-dev", name: "Jah and Co Dev" },
] as const;

async function getSelectedShopIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("shopId")?.value ?? null;
}

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null | undefined)?.id;
  const role = (session?.user as { role?: string } | null | undefined)?.role;

  if (!session || !userId || role !== "ADMIN") {
    return null;
  }
  return { userId };
}

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
}

export async function GET(req: Request) {
  try {
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });

      await prisma.$transaction(async (tx) => {
        for (const s of CORE_SHOPS) {
          await tx.shop.upsert({
            where: { id: s.id },
            create: { id: s.id, name: s.name },
            update: {},
          });
        }
      });

      const shops = CORE_SHOPS.map((s) => ({ id: s.id, name: s.name }));
      return NextResponse.json({ shops, selectedShopId: dd.shopId });
    }

    const auth = await requireAdminSession();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure the two core shops always exist (and the admin has access).
    // This keeps the storefront stable without manual seeding.
    await prisma.$transaction(async (tx) => {
      for (const s of CORE_SHOPS) {
        await tx.shop.upsert({
          where: { id: s.id },
          create: { id: s.id, name: s.name },
          update: {},
        });

        await tx.shopUser.upsert({
          where: { shopId_userId: { shopId: s.id, userId: auth.userId } },
          create: { shopId: s.id, userId: auth.userId, role: "OWNER" },
          update: {},
        });
      }
    });

    // Only expose the two core shops to the UI.
    // (This hides any legacy shops like "Default Shop" without needing to delete data.)
    const shops = CORE_SHOPS.map((s) => ({ id: s.id, name: s.name }));

    const cookieShopId = await getSelectedShopIdFromCookie();
    const hasValidCookie = cookieShopId && CORE_SHOPS.some((s) => s.id === cookieShopId);
    const selectedShopId = hasValidCookie ? cookieShopId : CORE_SHOPS[0]?.id ?? null;

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
  // Shops are hardcoded to two cores for now.
  // Keeping the endpoint but disabling it prevents accidental "Default Shop" creation.
  void req;
  return NextResponse.json({ error: "Shop creation is disabled" }, { status: 405 });
}
