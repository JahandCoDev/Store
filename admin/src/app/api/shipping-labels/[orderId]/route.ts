// admin/src/app/api/shipping-labels/[orderId]/route.ts
// Returns a printable HTML shipping label (4x6-ish) for the given order.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";
import { APPAREL_SHOP_ID, isCoreShopId } from "@/lib/coreShops";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

async function resolveShopAndAuth(req: Request): Promise<{ shopId: string } | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();

    const ddToken = process.env.DD_ADMIN_APP_TOKEN;
    if (ddToken && token === ddToken) {
      const dd = await resolveDatadogAppAuth(req);
      return dd.ok ? { shopId: dd.shopId } : null;
    }

    const agentToken = process.env.PRINT_AGENT_TOKEN;
    if (!agentToken || token !== agentToken) return null;

    const headerShopId = req.headers.get("x-shop-id");
    if (!isCoreShopId(headerShopId)) return null;

    return { shopId: headerShopId };
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("shopId")?.value ?? "";
  const shopId = isCoreShopId(cookieShopId) ? cookieShopId : APPAREL_SHOP_ID;

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) return null;

  return { shopId };
}

export async function GET(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const auth = await resolveShopAndAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId } = await ctx.params;

    const [order, shop] = await Promise.all([
      prisma.order.findFirst({
        where: { id: orderId, shopId: auth.shopId },
        include: {
          orderItems: { include: { product: { select: { title: true } } } },
        },
      }),
      prisma.shop.findUnique({ where: { id: auth.shopId } }),
    ]);

    if (!order || !shop) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Prisma types can lag schema changes in editor diagnostics; this keeps compilation unblocked.
    const orderWithShipping = order as unknown as typeof order & {
      shippingName?: string | null;
      shippingLine1?: string | null;
      shippingLine2?: string | null;
      shippingCity?: string | null;
      shippingState?: string | null;
      shippingZip?: string | null;
      shippingCountry?: string | null;
      shippingPhone?: string | null;
    };

    const accent = shop.accentColor ?? "#1a1a2e";

    const toLines = [
      orderWithShipping.shippingName,
      orderWithShipping.shippingLine1,
      orderWithShipping.shippingLine2,
      orderWithShipping.shippingCity && orderWithShipping.shippingState
        ? `${orderWithShipping.shippingCity}, ${orderWithShipping.shippingState} ${orderWithShipping.shippingZip ?? ""}`.trim()
        : null,
      orderWithShipping.shippingCountry ?? null,
      orderWithShipping.shippingPhone ?? null,
    ].filter(Boolean);

    const fromLines = [
      shop.name,
      shop.addressLine1,
      shop.addressLine2,
      shop.city && shop.state ? `${shop.city}, ${shop.state} ${shop.zip ?? ""}`.trim() : shop.city ?? shop.state ?? null,
      shop.country ?? null,
      shop.phone ?? null,
    ].filter(Boolean);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shipping Label — ${escHtml(shop.name)}</title>
  <style>
    @page { size: 4in 6in; margin: 0.15in; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
    .wrap { padding: 10px; }
    .row { display: flex; gap: 12px; }
    .box { border: 2px solid #111; border-radius: 10px; padding: 10px; }
    .from { width: 42%; }
    .to { flex: 1; }
    .label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #444; }
    .lines { margin-top: 6px; font-size: 14px; line-height: 1.25; color: #111; }
    .to .lines { font-size: 18px; font-weight: 700; }
    .meta { margin-top: 10px; display: flex; justify-content: space-between; font-size: 12px; color: #444; }
    .pill { border: 1px solid ${accent}; color: ${accent}; background: ${accent}15; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
    .hint { margin-top: 10px; font-size: 11px; color: #666; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="row">
      <div class="box from">
        <div class="label">From</div>
        <div class="lines">${fromLines.map((l) => escHtml(String(l))).join("<br>")}</div>
      </div>
      <div class="box to">
        <div class="label">Ship To</div>
        <div class="lines">${toLines.length ? toLines.map((l) => escHtml(String(l))).join("<br>") : "<span style=\"font-weight:600;color:#b00\">Missing shipping address</span>"}</div>
      </div>
    </div>

    <div class="meta">
      <div>Order <span class="pill">#${escHtml(order.id.slice(-6))}</span></div>
      <div>${new Date(order.createdAt).toLocaleDateString()}</div>
    </div>

    <div class="no-print" style="margin-top:12px;text-align:center">
      <button onclick="window.print()" style="padding:8px 14px;background:${accent};color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px">
        Print
      </button>
      <div class="hint">Tip: print on 4x6 label stock.</div>
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Shipping label generation failed:", error);
    return NextResponse.json({ error: "Failed to generate shipping label" }, { status: 500 });
  }
}

function escHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
