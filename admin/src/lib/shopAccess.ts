import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { resolveCoreShopIdFromCookie, resolveDatadogAppAuth } from "@/lib/serviceAuth";

export type ShopAccessResult =
  | {
      ok: true;
      shopId: string;
      principal: "admin" | "datadog-app";
      userId: string | null;
    }
  | {
      ok: false;
      status: 400 | 401 | 403;
      error: string;
    };

export async function requireAdminShopAccess() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string } | null | undefined)?.id;
  const role = (session?.user as { id?: string; role?: string } | null | undefined)?.role;

  if (!session || !userId || role !== "ADMIN") {
    return null;
  }

  const shopId = await resolveCoreShopIdFromCookie();
  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });

  if (!membership) {
    return null;
  }

  return { shopId, userId };
}

function hasBearerAuth(req: Request): boolean {
  return (req.headers.get("authorization") ?? "").startsWith("Bearer ");
}

export async function resolveShopAccessForRequest(req: Request): Promise<ShopAccessResult> {
  if (hasBearerAuth(req)) {
    const dd = await resolveDatadogAppAuth(req);
    if (!dd.ok) return { ok: false, status: dd.status, error: dd.error };
    return { ok: true, shopId: dd.shopId, principal: "datadog-app", userId: null };
  }

  const access = await requireAdminShopAccess();
  if (!access) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, shopId: access.shopId, principal: "admin", userId: access.userId };
}