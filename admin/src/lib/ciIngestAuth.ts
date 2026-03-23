export type CiIngestAuthResult =
  | {
      ok: true;
      shopId: string;
      principal: "ci-hook";
    }
  | {
      ok: false;
      status: 400 | 401;
      error: string;
    };

const CORE_SHOP_IDS = new Set(["jahandco-shop", "jahandco-dev"]);

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

export async function resolveCiIngestAuth(req: Request): Promise<CiIngestAuthResult> {
  const token = getBearerToken(req);
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const expected = process.env.CI_DASHBOARD_TOKEN;
  if (!expected || token !== expected) return { ok: false, status: 401, error: "Unauthorized" };

  const shopId = getShopIdFromHeader(req);
  if (!shopId) return { ok: false, status: 400, error: "x-shop-id header is required" };
  if (!CORE_SHOP_IDS.has(shopId)) return { ok: false, status: 400, error: "Invalid shop" };

  return { ok: true, shopId, principal: "ci-hook" };
}
