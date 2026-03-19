// admin/src/app/api/invoices/[orderId]/route.ts
// Returns a shop-branded HTML invoice for the given order.
// Respond with Content-Type: text/html so browsers can render or print it.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { cookies } from "next/headers";

function getSelectedShopId(): string | null {
  return cookies().get("shopId")?.value ?? null;
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

export async function GET(_: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const shopId = getSelectedShopId();
    if (!shopId) return NextResponse.json({ error: "Shop not selected" }, { status: 400 });
    const auth = await requireShopAccess(shopId);
    if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    const accent = shop.accentColor ?? "#1a1a2e";
    const invoiceNumber = `INV-${order.id.slice(-8).toUpperCase()}`;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    // Build line items rows
    const lineRows = order.orderItems
      .map((item: { price: number; quantity: number; product: { title: string } | null }) => {
        const lineTotal = (item.price * item.quantity).toFixed(2);
        return `
        <tr>
          <td class="item-name">${escHtml(item.product?.title ?? "Deleted product")}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">$${item.price.toFixed(2)}</td>
          <td class="num">$${lineTotal}</td>
        </tr>`;
      })
      .join("");

    const subtotal = order.subtotal > 0 ? order.subtotal : order.total;
    const taxAmt = order.taxAmount ?? 0;
    const shipAmt = order.shippingAmount ?? 0;

    const shopAddress = [
      shop.addressLine1,
      shop.addressLine2,
      shop.city && shop.state
        ? `${shop.city}, ${shop.state} ${shop.zip ?? ""}`.trim()
        : shop.city ?? shop.state ?? "",
      shop.country !== "US" ? shop.country : null,
    ]
      .filter(Boolean)
      .join("<br>");

    const fulfillmentInfo = order.fulfillment
      ? `<p><strong>Tracking:</strong> ${escHtml(order.fulfillment.carrier ?? "")} ${escHtml(order.fulfillment.trackingNumber ?? "")}
         ${order.fulfillment.shippedAt ? `— shipped ${new Date(order.fulfillment.shippedAt).toLocaleDateString()}` : ""}</p>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${invoiceNumber} — ${escHtml(shop.name)}</title>
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
    header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .brand { display: flex; flex-direction: column; gap: 4px; }
    .brand-name { font-size: 22px; font-weight: 700; color: ${accent}; }
    .brand-address { font-size: 12px; color: #555; line-height: 1.6; }
    .invoice-meta { text-align: right; font-size: 13px; color: #555; line-height: 1.8; }
    .invoice-meta .invoice-number { font-size: 18px; font-weight: 700; color: ${accent}; }
    .divider { border: none; border-top: 2px solid ${accent}; margin: 24px 0; }
    .bill-to { margin-bottom: 32px; }
    .bill-to h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 8px; }
    .bill-to p { font-size: 14px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: ${accent}; color: #fff; }
    thead th { padding: 10px 14px; font-size: 12px; text-align: left; font-weight: 600; letter-spacing: .04em; }
    thead th.num { text-align: right; }
    tbody tr:nth-child(even) { background: #f8f8f8; }
    tbody td { padding: 10px 14px; font-size: 13px; vertical-align: top; }
    td.num { text-align: right; }
    td.item-name { max-width: 320px; }
    .totals { margin-left: auto; width: 260px; font-size: 13px; }
    .totals tr td { padding: 4px 8px; }
    .totals tr td:last-child { text-align: right; }
    .totals .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid ${accent}; padding-top: 8px; color: ${accent}; }
    .notes { margin-top: 32px; font-size: 12px; color: #666; line-height: 1.7; }
    .notes h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #999; margin-bottom: 6px; }
    footer { margin-top: 48px; text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #e5e5e5; padding-top: 16px; }
    .status-badge {
      display: inline-block; padding: 3px 10px; border-radius: 999px;
      font-size: 11px; font-weight: 600; letter-spacing: .06em;
      background: ${accent}22; color: ${accent}; border: 1px solid ${accent}44;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      ${shop.logoUrl ? `<img src="${escHtml(shop.logoUrl)}" alt="${escHtml(shop.name)}" style="max-height:60px;max-width:200px;margin-bottom:8px" />` : ""}
      <div class="brand-name">${escHtml(shop.name)}</div>
      ${shopAddress ? `<div class="brand-address">${shopAddress}</div>` : ""}
      ${shop.phone ? `<div class="brand-address">${escHtml(shop.phone)}</div>` : ""}
      ${shop.email ? `<div class="brand-address">${escHtml(shop.email)}</div>` : ""}
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">${invoiceNumber}</div>
      <div>Date: ${orderDate}</div>
      <div>Status: <span class="status-badge">${escHtml(order.status)}</span></div>
      <div>Currency: ${escHtml(order.currency ?? "USD")}</div>
    </div>
  </header>

  <hr class="divider" />

  <div class="bill-to">
    <h2>Bill To</h2>
    <p>
      ${order.user?.name ? `<strong>${escHtml(order.user.name)}</strong><br>` : ""}
      ${order.user?.email ? escHtml(order.user.email) : "—"}
    </p>
  </div>

  ${fulfillmentInfo ? `<div class="notes">${fulfillmentInfo}</div>` : ""}

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Unit Price</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineRows}
    </tbody>
  </table>

  <table class="totals">
    <tbody>
      ${subtotal !== order.total ? `<tr><td>Subtotal</td><td>$${subtotal.toFixed(2)}</td></tr>` : ""}
      ${taxAmt ? `<tr><td>Tax</td><td>$${taxAmt.toFixed(2)}</td></tr>` : ""}
      ${shipAmt ? `<tr><td>Shipping</td><td>$${shipAmt.toFixed(2)}</td></tr>` : ""}
      <tr class="total-row"><td>Total</td><td>$${order.total.toFixed(2)} ${escHtml(order.currency ?? "USD")}</td></tr>
    </tbody>
  </table>

  ${order.note ? `<div class="notes"><h3>Order Note</h3><p>${escHtml(order.note)}</p></div>` : ""}
  ${shop.invoiceNotes ? `<div class="notes"><h3>Notes</h3><p>${escHtml(shop.invoiceNotes)}</p></div>` : ""}

  <footer>
    ${shop.footerCopy ? `<p>${escHtml(shop.footerCopy)}</p>` : `<p>Thank you for your order!</p>`}
    <p style="margin-top:4px">${escHtml(shop.name)} &bull; ${invoiceNumber}</p>
  </footer>

  <div class="no-print" style="margin-top:32px;text-align:center">
    <button onclick="window.print()" style="padding:10px 24px;background:${accent};color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Invoice generation failed:", error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}

/** Minimal HTML entity escaping to prevent XSS in invoice output. */
function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
