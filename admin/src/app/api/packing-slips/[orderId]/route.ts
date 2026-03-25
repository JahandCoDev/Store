// admin/src/app/api/packing-slips/[orderId]/route.ts
// Returns a shop-branded HTML packing slip for the given order.

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
    const shopId = auth.shopId;

    const { orderId } = await ctx.params;

    const [order, shop] = await Promise.all([
      prisma.order.findFirst({
        where: { id: orderId, shopId },
        include: {
          user: { select: { name: true, email: true } },
          orderItems: { include: { product: { select: { title: true } } } },
          fulfillment: true,
        },
      }),
      prisma.shop.findUnique({ where: { id: shopId } }),
    ]);

    if (!order || !shop) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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
      shippingEmail?: string | null;
    };

    const accent = shop.accentColor ?? "#1a1a2e";
    const slipNumber = `PS-${order.id.slice(-8).toUpperCase()}`;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const itemsRows = order.orderItems
      .map((item: { quantity: number; product: { title: string } | null }) => {
        return `
        <tr>
          <td class="item-name">${escHtml(item.product?.title ?? "Deleted product")}</td>
          <td class="num">${item.quantity}</td>
        </tr>`;
      })
      .join("");

    const fulfillmentInfo = order.fulfillment
      ? `<p><strong>Tracking:</strong> ${escHtml(order.fulfillment.carrier ?? "")} ${escHtml(order.fulfillment.trackingNumber ?? "")}
         ${order.fulfillment.shippedAt ? `— shipped ${new Date(order.fulfillment.shippedAt).toLocaleDateString()}` : ""}</p>`
      : "";

    const shipToLines = [
      orderWithShipping.shippingName || order.user?.name || null,
      orderWithShipping.shippingLine1 || null,
      orderWithShipping.shippingLine2 || null,
      orderWithShipping.shippingCity && orderWithShipping.shippingState
        ? `${orderWithShipping.shippingCity}, ${orderWithShipping.shippingState} ${orderWithShipping.shippingZip ?? ""}`.trim()
        : null,
      orderWithShipping.shippingCountry && orderWithShipping.shippingCountry !== "US" ? orderWithShipping.shippingCountry : null,
      orderWithShipping.shippingPhone || null,
      orderWithShipping.shippingEmail || null,
    ].filter(Boolean);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Packing Slip ${slipNumber} — ${escHtml(shop.name)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 860px;
      margin: 0 auto;
    }
    header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 26px; }
    .brand-name { font-size: 22px; font-weight: 700; color: ${accent}; }
    .muted { font-size: 12px; color: #666; line-height: 1.6; }
    .doc-meta { text-align: right; font-size: 13px; color: #555; line-height: 1.8; }
    .doc-meta .doc-number { font-size: 18px; font-weight: 700; color: ${accent}; }
    .divider { border: none; border-top: 2px solid ${accent}; margin: 18px 0 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    thead tr { background: ${accent}; color: #fff; }
    thead th { padding: 10px 14px; font-size: 12px; text-align: left; font-weight: 600; letter-spacing: .04em; }
    thead th.num { text-align: right; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    tbody td { padding: 10px 14px; font-size: 13px; vertical-align: top; }
    td.num { text-align: right; }
    td.item-name { max-width: 520px; }
    footer { margin-top: 48px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #e5e5e5; padding-top: 16px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <header>
    <div>
      ${shop.logoUrl ? `<img src="${escHtml(shop.logoUrl)}" alt="${escHtml(shop.name)}" style="max-height:60px;max-width:200px;margin-bottom:8px" />` : ""}
      <div class="brand-name">${escHtml(shop.name)}</div>
      <div class="muted">Order: #${escHtml(order.id.slice(-6))}</div>
      <div class="muted">Customer: ${escHtml(order.user?.email ?? "Guest")}</div>
    </div>
    <div class="doc-meta">
      <div class="doc-number">${slipNumber}</div>
      <div>Date: ${orderDate}</div>
      <div>Status: ${escHtml(order.status)}</div>
    </div>
  </header>

  <hr class="divider" />

  ${shipToLines.length ? `
  <div class="muted" style="margin-bottom: 12px;">
    <div style="font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #888; margin-bottom: 6px;">Ship To</div>
    <div style="font-size: 14px; line-height: 1.5; color: #111;">${shipToLines.map((l) => escHtml(String(l))).join("<br>")}</div>
  </div>` : ""}

  <div class="muted" style="margin-bottom: 10px;">
    ${fulfillmentInfo}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="num">Qty</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <footer>
    <p>${escHtml(shop.footerCopy ?? shop.name)}</p>
  </footer>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Packing slip generation failed:", error);
    return NextResponse.json({ error: "Failed to generate packing slip" }, { status: 500 });
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
