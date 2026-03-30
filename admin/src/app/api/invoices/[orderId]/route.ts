// admin/src/app/api/invoices/[orderId]/route.ts
// Returns a shop-branded HTML invoice for the given order.
// Respond with Content-Type: text/html so browsers can render or print it.

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveDatadogAppAuth } from "@/lib/serviceAuth";

type MoneyLike = number | string | { toString(): string };

function resolveBrand() {
  return {
    name: process.env.BRAND_NAME ?? "Store",
    logoUrl: process.env.BRAND_LOGO_URL ?? null,
    addressLine1: process.env.BRAND_ADDRESS_LINE1 ?? null,
    addressLine2: process.env.BRAND_ADDRESS_LINE2 ?? null,
    city: process.env.BRAND_CITY ?? null,
    state: process.env.BRAND_STATE ?? null,
    zip: process.env.BRAND_ZIP ?? null,
    country: process.env.BRAND_COUNTRY ?? "US",
    phone: process.env.BRAND_PHONE ?? null,
    email: process.env.BRAND_EMAIL ?? null,
    accentColor: process.env.BRAND_ACCENT_COLOR ?? "#1a1a2e",
    footerCopy: process.env.BRAND_FOOTER_COPY ?? null,
    invoiceNotes: process.env.BRAND_INVOICE_NOTES ?? null,
  };
}

async function resolveAuth(req: Request): Promise<true | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();

    const ddToken = process.env.DD_ADMIN_APP_TOKEN;
    if (ddToken && token === ddToken) {
      const dd = await resolveDatadogAppAuth(req);
      return dd.ok ? true : null;
    }

    const agentToken = process.env.PRINT_AGENT_TOKEN;
    if (!agentToken || token !== agentToken) return null;
    return true;
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string; role?: string })?.id;
  const role = (session?.user as { id?: string; role?: string })?.role;
  if (!session || !userId || role !== "ADMIN") return null;

  return true;
}

export async function GET(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const auth = await resolveAuth(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId } = await ctx.params;

    const order = await prisma.order.findFirst({
      where: { id: orderId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        orderItems: { include: { variant: { include: { product: { select: { title: true } } } } } },
        fulfillment: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const shop = resolveBrand();

    const accent = shop.accentColor;
    const invoiceNumber = `INV-${order.id.slice(-8).toUpperCase()}`;
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    // Build line items rows
    const lineRows = order.orderItems
      .map((item: { price: MoneyLike; quantity: number; variant?: { product: { title: string } | null } | null }) => {
        const lineTotal = (Number(item.price) * item.quantity).toFixed(2);
        return `
        <tr>
          <td class="item-name">${escHtml(item.variant?.product?.title ?? "Deleted product")}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">$${Number(item.price).toFixed(2)}</td>
          <td class="num">$${lineTotal}</td>
        </tr>`;
      })
      .join("");

    const subtotal = Number(order.subtotal) > 0 ? Number(order.subtotal) : Number(order.total);
    const taxAmt = Number(order.taxAmount) ?? 0;
    const shipAmt = Number(order.shippingAmount) ?? 0;

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

    const shipToLines = [
      order.shippingName || (order.user ? [order.user.firstName, order.user.lastName].filter(Boolean).join(" ").trim() : null) || null,
      order.shippingLine1 || null,
      order.shippingLine2 || null,
      order.shippingCity && order.shippingState
        ? `${order.shippingCity}, ${order.shippingState} ${order.shippingZip ?? ""}`.trim()
        : null,
      order.shippingCountry && order.shippingCountry !== "US" ? order.shippingCountry : null,
      order.shippingPhone || null,
    ].filter(Boolean);

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
      ${order.user ? `<strong>${escHtml([order.user.firstName, order.user.lastName].filter(Boolean).join(" ").trim())}</strong><br>` : ""}
      ${order.user?.email ? escHtml(order.user.email) : "—"}
    </p>
  </div>

  ${shipToLines.length ? `
  <div class="bill-to" style="margin-top:-10px">
    <h2>Ship To</h2>
    <p>${shipToLines.map((l) => escHtml(String(l))).join("<br>")}</p>
  </div>` : ""}

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
      ${subtotal !== Number(order.total) ? `<tr><td>Subtotal</td><td>$${subtotal.toFixed(2)}</td></tr>` : ""}
      ${taxAmt ? `<tr><td>Tax</td><td>$${taxAmt.toFixed(2)}</td></tr>` : ""}
      ${shipAmt ? `<tr><td>Shipping</td><td>$${shipAmt.toFixed(2)}</td></tr>` : ""}
      <tr class="total-row"><td>Total</td><td>$${Number(order.total).toFixed(2)} ${escHtml(order.currency ?? "USD")}</td></tr>
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
