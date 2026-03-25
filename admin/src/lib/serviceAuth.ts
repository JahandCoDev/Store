import { cookies } from "next/headers";

import { APPAREL_SHOP_ID, CORE_SHOP_IDS } from "@/lib/coreShops";

export type ServiceAuthResult =
  | {
      ok: true;
      shopId: string;
      principal: "datadog-app";
    }
  | {
      ok: false;
      status: 400 | 401;
      error: string;
    };

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
}

function getShopIdFromHeader(req: Request): string | null {
  const shopId = (req.headers.get("x-shop-id") ?? "").trim();
  return shopId || null;
}

export async function resolveDatadogAppAuth(req: Request): Promise<ServiceAuthResult> {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const expected = process.env.DD_ADMIN_APP_TOKEN;
  if (!expected || token !== expected) return { ok: false, status: 401, error: "Unauthorized" };

  const shopId = getShopIdFromHeader(req);
  if (!shopId) return { ok: false, status: 400, error: "x-shop-id header is required" };
  if (!CORE_SHOP_IDS.has(shopId)) return { ok: false, status: 400, error: "Invalid shop" };

  return { ok: true, shopId, principal: "datadog-app" };
}

export async function resolveCoreShopIdFromCookie(): Promise<string> {
  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("shopId")?.value ?? "";
  return CORE_SHOP_IDS.has(cookieShopId) ? cookieShopId : APPAREL_SHOP_ID;
}
