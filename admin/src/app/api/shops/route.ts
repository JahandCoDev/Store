import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";
import { APPAREL_SHOP_ID, CORE_SHOPS, LEGACY_APPAREL_SHOP_ID } from "@/lib/coreShops";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

const CORE_SHOP_OWNER_EMAIL = (process.env.CORE_SHOP_OWNER_EMAIL ?? process.env.ADMIN_EMAIL ?? "").trim();

async function getSelectedShopIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("shopId")?.value ?? null;
}

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null | undefined)?.id;
  const role = (session?.user as { role?: string } | null | undefined)?.role;
  const email = (session?.user as { email?: string | null } | null | undefined)?.email ?? null;

  if (!session || !userId || role !== "ADMIN") {
    return null;
  }
  return { userId, email };
}

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
}

async function migrateLegacyApparelShopId(tx: Prisma.TransactionClient) {
  const legacyShop = await tx.shop.findUnique({
    where: { id: LEGACY_APPAREL_SHOP_ID },
    select: { id: true },
  });

  const apparelShop = await tx.shop.findUnique({
    where: { id: APPAREL_SHOP_ID },
    select: { id: true },
  });

  if (legacyShop && !apparelShop) {
    await tx.shop.update({
      where: { id: LEGACY_APPAREL_SHOP_ID },
      data: { id: APPAREL_SHOP_ID, name: "Jah and Co Apparel" },
    });
  }
}

export async function GET(req: Request) {
  try {
    if (hasBearerAuth(req)) {
      const dd = await resolveDatadogAppAuth(req);
      if (!dd.ok) return NextResponse.json({ error: dd.error }, { status: dd.status });

      await prisma.$transaction(async (tx) => {
        await migrateLegacyApparelShopId(tx);
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
      await migrateLegacyApparelShopId(tx);

      const ownerEmail = CORE_SHOP_OWNER_EMAIL;
      const normalizedOwnerEmail = ownerEmail ? ownerEmail.toLowerCase() : "";
      const normalizedSessionEmail = auth.email ? auth.email.toLowerCase() : "";
      const sessionIsOwner = Boolean(normalizedOwnerEmail && normalizedSessionEmail === normalizedOwnerEmail);

      const configuredOwnerUserId = normalizedOwnerEmail
        ? (await tx.user.findUnique({ where: { email: ownerEmail }, select: { id: true } }))?.id ?? null
        : null;

      for (const s of CORE_SHOPS) {
        await tx.shop.upsert({
          where: { id: s.id },
          create: { id: s.id, name: s.name },
          update: {},
        });

        // Enforce: at most one OWNER per core shop (the configured owner account).
        if (configuredOwnerUserId) {
          await tx.shopUser.updateMany({
            where: {
              shopId: s.id,
              role: "OWNER",
              userId: { not: configuredOwnerUserId },
            },
            data: { role: "ADMIN" },
          });
        }

        const desiredRole = sessionIsOwner ? "OWNER" : "ADMIN";
        await tx.shopUser.upsert({
          where: { shopId_userId: { shopId: s.id, userId: auth.userId } },
          create: { shopId: s.id, userId: auth.userId, role: desiredRole },
          update: { role: desiredRole },
        });
      }
    });

    // Only expose the two core shops to the UI.
    // (This hides any legacy shops like "Default Shop" without needing to delete data.)
    const shops = CORE_SHOPS.map((s) => ({ id: s.id, name: s.name }));

    const cookieShopId = await getSelectedShopIdFromCookie();
    const hasValidCookie = cookieShopId && CORE_SHOPS.some((s) => s.id === cookieShopId);
    const selectedShopId = hasValidCookie ? cookieShopId : CORE_SHOPS[0]?.id ?? APPAREL_SHOP_ID;

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
