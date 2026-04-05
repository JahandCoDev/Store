import type { ManualEmailTemplateOptions } from "@/lib/email/manualEmailTemplate";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(amount: number, currency: string) {
  const safeCurrency = currency && currency.trim() ? currency.trim().toUpperCase() : "USD";
  const normalized = Number.isFinite(amount) ? amount : 0;
  return `${safeCurrency} ${normalized.toFixed(2)}`;
}

export function buildOrderConfirmationEmail(input: {
  orderNumber: number;
  currency: string;
  items: Array<{ title: string; quantity: number; unitPrice: number; lineTotal: number }>;
  totals: { subtotal: number; shipping: number; tax: number; total: number };
  shipping: { name: string; line1: string; line2?: string; city: string; state: string; zip: string; country: string };
}): ManualEmailTemplateOptions {
  const itemsHtml = input.items
    .map((item) => {
      const title = escapeHtml(item.title);
      const qty = escapeHtml(String(item.quantity));
      const unit = escapeHtml(formatMoney(item.unitPrice, input.currency));
      const line = escapeHtml(formatMoney(item.lineTotal, input.currency));
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid rgba(148,163,184,0.18);">${title}<div style="color:#94a3b8;font-size:12px;">${qty} × ${unit}</div></td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(148,163,184,0.18);text-align:right;white-space:nowrap;">${line}</td>
        </tr>
      `;
    })
    .join("");

  const shippingLines = [
    input.shipping.name,
    input.shipping.line1,
    input.shipping.line2 || "",
    `${input.shipping.city}, ${input.shipping.state} ${input.shipping.zip}`,
    input.shipping.country,
  ]
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");

  const bodyHtml = `
    <p style="margin:0 0 12px;">Thanks for your order. We’re getting it ready now.</p>

    <div style="margin:18px 0 0;padding:14px 16px;border-radius:16px;border:1px solid rgba(148,163,184,0.16);background:rgba(2,6,23,0.45);">
      <div style="font-weight:700;color:#f1f5f9;">Order #${escapeHtml(String(input.orderNumber))}</div>
      <div style="margin-top:8px;color:#cbd5e1;font-size:13px;line-height:1.6;">${shippingLines}</div>
    </div>

    <h2 style="margin:22px 0 10px;font-size:16px;color:#f8fafc;">Items</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(148,163,184,0.18);">
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          <tr>
            <td style="padding:6px 0;color:#cbd5e1;">Subtotal</td>
            <td style="padding:6px 0;text-align:right;white-space:nowrap;">${escapeHtml(formatMoney(input.totals.subtotal, input.currency))}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#cbd5e1;">Shipping</td>
            <td style="padding:6px 0;text-align:right;white-space:nowrap;">${escapeHtml(formatMoney(input.totals.shipping, input.currency))}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#cbd5e1;">Tax</td>
            <td style="padding:6px 0;text-align:right;white-space:nowrap;">${escapeHtml(formatMoney(input.totals.tax, input.currency))}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-weight:700;color:#f8fafc;">Total</td>
            <td style="padding:10px 0;text-align:right;font-weight:700;white-space:nowrap;">${escapeHtml(formatMoney(input.totals.total, input.currency))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  return {
    title: `Order #${input.orderNumber} confirmed`,
    previewText: `Your order #${input.orderNumber} is confirmed.`,
    intro: "Payment received — we’ll email you when it ships.",
    bodyHtml,
    footerNote: "If you have any questions about your order, reply to this email.",
  };
}
