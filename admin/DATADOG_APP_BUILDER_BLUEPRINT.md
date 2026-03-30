# Datadog App Builder Blueprint

This document defines a practical first version of a Datadog App Builder admin app for the store admin backend.

The goal is not to clone the full web admin. The goal is to expose the operational workflows that fit Datadog best:

- order triage
- customer lookup and edits
- catalog updates
- collection curation
- print queue operations
- document generation shortcuts

## Recommended V1 Scope

Build the Datadog app around the REST routes that already support bearer-token access via `DD_ADMIN_APP_TOKEN`.

Use these features first:

1. Orders workspace
2. Customers workspace
3. Catalog workspace
4. Collections workspace
5. Print queue workspace

Do not build V1 around GraphQL. The GraphQL endpoint is session-gated through NextAuth and is not currently suited for PAR-style service access.

## Auth Model

The Datadog app should call the admin app through your PAR or direct HTTP integration using:

- `Authorization: Bearer <DD_ADMIN_APP_TOKEN>`
- `X-Shop-Id: jahandco-shop`

`X-Shop-Id` is documented in the admin README and should be kept for forward compatibility, even though the current bearer-auth helper only validates the token.

Base URL:

- `https://admin.jahandco.dev`

## App Builder Resource Setup

Create one reusable HTTP resource for the admin API.

Suggested resource name:

- `storeAdminApi`

Suggested defaults:

- Base URL: `https://admin.jahandco.dev`
- Default headers:
  - `Authorization: Bearer {{ DD_ADMIN_APP_TOKEN }}`
  - `X-Shop-Id: jahandco-shop`
  - `Content-Type: application/json`

If your PAR is the only network path Datadog can use, point the App Builder resource at the PAR and have the PAR forward requests to the admin backend with those headers.

If you use a Datadog private action runner HTTP connection, the credential file on the runner must be a Datadog credential JSON file, not a file that only contains the token string.

Example runner credential file:

- Path: `/etc/dd-action-runner/config/credentials/http_token.json`

```json
{
  "auth_type": "Token Auth",
  "credentials": [
    {
      "tokenName": "DD_ADMIN_APP_TOKEN",
      "tokenValue": "<your-admin-service-token>"
    },
    {
      "tokenName": "X_SHOP_ID",
      "tokenValue": "jahandco-shop"
    }
  ]
}
```

Then reference those values in the Datadog connection or request headers, for example:

- `Authorization: Bearer {{ DD_ADMIN_APP_TOKEN }}`
- `X-Shop-Id: {{ X_SHOP_ID }}`

## Screen Model

Recommended layout:

1. `Overview`
2. `Orders`
3. `Customers`
4. `Catalog`
5. `Collections`
6. `Print Queue`

The app should use a left navigation with the screen content on the right. Use drawers or side panels for record detail and edit forms instead of heavy route switching.

## Overview Screen

Purpose:

- give operators fast visibility into recent orders and queued print work
- provide one-click jump actions into the work queues

Widgets:

1. Recent orders table
   - Query: `GET /api/orders`
   - Columns: order id, customer email, status, total, createdAt
   - Sort client-side by `createdAt desc`

2. Queued print jobs table
   - Query: `GET /api/print-jobs?status=QUEUED`
   - Columns: id, type, printerName, createdAt

3. Quick actions
   - `New Customer`
   - `New Product`
   - `Create Print Job`

4. Document shortcuts
   - input for order id
   - buttons:
     - `Open Invoice`
     - `Open Packing Slip`
     - `Open Shipping Label`

## Orders Screen

Purpose:

- operational order review
- status changes
- shipping details correction
- printable document access

### Data Queries

Primary list:

- `GET /api/orders`

Detail query:

- `GET /api/orders/:id`

### Table Columns

- `id`
- `status`
- `user.email`
- `total`
- `shippingCity`
- `shippingState`
- `createdAt`

### Detail Drawer

Show:

- order summary
- shipping fields
- order items
- fulfillment info if present

### Actions

Update status:

- `PATCH /api/orders/:id`
- body:

```json
{
  "status": "PROCESSING"
}
```

Update shipping info:

- `PATCH /api/orders/:id`
- body:

```json
{
  "shippingAddress": {
    "name": "Jane Doe",
    "phone": "555-111-2222",
    "line1": "123 Main St",
    "line2": "Suite 4",
    "city": "Miami",
    "state": "FL",
    "zip": "33101",
    "country": "US"
  }
}
```

Open related documents:

- `GET /api/invoices/:orderId`
- `GET /api/packing-slips/:orderId`
- `GET /api/shipping-labels/:orderId`

App Builder behavior:

- open these in a new browser tab or iframe-style preview if App Builder supports it cleanly

### UX Recommendation

Use status action buttons instead of a free text field.

Recommended status buttons:

- `PROCESSING`
- `COMPLETED`
- `CANCELLED`

## Customers Screen

Purpose:

- look up a customer quickly
- review notes and addresses
- edit contact details
- create or delete a customer

### Data Queries

Search/list query:

- `GET /api/customers?q={{searchTerm}}`

Detail query:

- `GET /api/customers/:displayId`

### Important Identifier Rule

The customer detail route expects `displayId`, not the raw internal user id.

### Table Columns

- `displayId`
- `email`
- `firstName`
- `lastName`
- `phone`
- `role`
- `createdAt`

### Detail Drawer

Show:

- profile details
- `addresses`
- `notes`

### Actions

Create customer:

- `POST /api/customers`

```json
{
  "email": "customer@example.com",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

Update customer:

- `PATCH /api/customers/:displayId`

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "555-111-2222",
  "dateOfBirth": "1991-08-15"
}
```

Delete customer:

- `DELETE /api/customers/:displayId`

### UX Recommendation

Use a detail drawer with inline editable fields and a guarded delete button that requires explicit confirmation.

## Catalog Screen

Purpose:

- lightweight product management from Datadog
- price, inventory, and status updates
- variant maintenance

### Data Queries

Product list:

- `GET /api/products`

Product detail:

- `GET /api/products/:id`

Product variants:

- `GET /api/products/:id/variants`

### Table Columns

- `title`
- `handle`
- `status`
- `price`
- `inventory`
- `sku`
- `vendor`
- `updatedAt`

### Actions

Create product:

- `POST /api/products`

```json
{
  "title": "New Product",
  "description": "Description",
  "status": "ACTIVE",
  "vendor": "Jah & Co",
  "tags": ["featured"],
  "images": ["https://cdn.example.com/image.jpg"],
  "price": 49.99,
  "compareAtPrice": 59.99,
  "cost": 20,
  "inventory": 12,
  "sku": "SKU-001",
  "barcode": "123456789",
  "weight": 1.2
}
```

Update product:

- `PATCH /api/products/:id`

```json
{
  "title": "Updated Product",
  "status": "ACTIVE",
  "price": 54.99,
  "inventory": 8,
  "tags": ["featured", "sale"]
}
```

Delete product:

- `DELETE /api/products/:id`

Create variant:

- `POST /api/products/:id/variants`

```json
{
  "title": "Large / Black",
  "size": "Large",
  "color": "Black",
  "sku": "SKU-001-L-BLK",
  "barcode": "987654321",
  "price": 54.99,
  "inventory": 4,
  "trackInventory": true
}
```

Update variant:

- `PATCH /api/products/:id/variants/:variantId`

```json
{
  "price": 57.99,
  "inventory": 6,
  "trackInventory": true
}
```

Delete variant:

- `DELETE /api/products/:id/variants/:variantId`

### UX Recommendation

Do not try to replicate the full product form from the admin web app in V1.

Use:

- product table
- product detail drawer
- simple product edit modal
- variant subtable inside product detail

That keeps the App Builder app fast and operator-friendly.

## Collections Screen

Purpose:

- manage merch groupings and publish state
- assign products to collections

### Data Queries

Collection list:

- `GET /api/collections`

Collection detail:

- `GET /api/collections/:id`

### Response Shape

Collections return an object wrapper:

- list: `{ "collections": [...] }`
- detail: `{ "collection": {...} }`

### Table Columns

- `title`
- `handle`
- `isPublished`
- `sortOrder`
- `productCount`
- `updatedAt`

### Actions

Create collection:

- `POST /api/collections`

```json
{
  "title": "Spring Drops",
  "handle": "spring-drops",
  "description": "Seasonal collection",
  "isPublished": true,
  "sortOrder": 10,
  "productIds": ["prod_1", "prod_2"]
}
```

Update collection:

- `PATCH /api/collections/:id`

```json
{
  "title": "Spring Drops",
  "isPublished": false,
  "sortOrder": 20,
  "productIds": ["prod_1", "prod_3"]
}
```

Delete collection:

- `DELETE /api/collections/:id`

### UX Recommendation

Use a multiselect product picker populated from `GET /api/products` for assigning `productIds`.

## Print Queue Screen

Purpose:

- manage the operational printing queue
- reissue documents
- mark print outcomes

### Data Queries

Queue list:

- `GET /api/print-jobs`
- `GET /api/print-jobs?status=QUEUED`

Job detail:

- `GET /api/print-jobs/:id`

### Table Columns

- `id`
- `type`
- `status`
- `printerName`
- `assetUrl`
- `createdAt`
- `reportedAt`

### Actions

Create print job:

- `POST /api/print-jobs`

```json
{
  "type": "INVOICE",
  "assetUrl": "/api/invoices/order_id_here",
  "printerName": "Front Desk Printer",
  "metadata": {
    "orderId": "order_id_here"
  }
}
```

Update print job status:

- `PATCH /api/print-jobs/:id`

```json
{
  "status": "DONE"
}
```

Failure update:

```json
{
  "status": "FAILED",
  "errorText": "Printer offline"
}
```

### UX Recommendation

Use segmented controls for:

- `QUEUED`
- `PRINTING`
- `DONE`
- `FAILED`

If `assetUrl` is present, provide an `Open Asset` action that prefixes the admin base URL.

## App-Level Variables

Define these state values in App Builder:

- `selectedOrderId`
- `selectedCustomerDisplayId`
- `selectedProductId`
- `selectedCollectionId`
- `selectedPrintJobId`
- `customerSearchTerm`
- `productSearchTerm`
- `collectionSearchTerm`
- `printStatusFilter`

## Query Refresh Rules

After each mutation, refresh only the affected datasets.

Examples:

- order patch -> refresh orders list and order detail
- customer update -> refresh customer list and customer detail
- product variant change -> refresh product detail and variant list
- collection update -> refresh collection list and selected collection detail
- print job mutation -> refresh print jobs list and selected print job detail

## Recommended V1 Components

Use the simplest components available in App Builder:

- table
- drawer or side panel
- form modal
- button group
- text input
- select
- text area
- markdown or rich text block for operator notes

Avoid advanced custom logic in V1. Keep the app request-driven.

## React Renderer Snippet

If you want a richer App Builder screen than the stock table and card widgets allow, use a React renderer for the `Overview` screen and keep it presentational.

Bind these props from App Builder:

- `orders` -> result of `GET /api/orders`
- `printJobs` -> result of `GET /api/print-jobs?status=QUEUED`
- `onSelectOrder(orderId)` -> opens or updates the selected order drawer
- `onOpenInvoice(orderId)` -> opens `GET /api/invoices/:orderId`
- `onOpenPackingSlip(orderId)` -> opens `GET /api/packing-slips/:orderId`
- `onOpenShippingLabel(orderId)` -> opens `GET /api/shipping-labels/:orderId`

Example snippet:

```tsx
import * as React from "react";

type Order = {
  id: string;
  status?: string | null;
  total?: number | string | null;
  createdAt?: string | null;
  user?: {
    email?: string | null;
  } | null;
  shippingCity?: string | null;
  shippingState?: string | null;
};

type PrintJob = {
  id: string;
  type?: string | null;
  status?: string | null;
  printerName?: string | null;
  createdAt?: string | null;
};

type Props = {
  orders?: Order[];
  printJobs?: PrintJob[];
  onSelectOrder?: (orderId: string) => void;
  onOpenInvoice?: (orderId: string) => void;
  onOpenPackingSlip?: (orderId: string) => void;
  onOpenShippingLabel?: (orderId: string) => void;
};

function formatMoney(value: number | string | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusTone(status: string | null | undefined) {
  switch ((status ?? "").toUpperCase()) {
    case "DONE":
    case "COMPLETED":
      return { bg: "#dcfce7", fg: "#166534" };
    case "FAILED":
    case "CANCELLED":
      return { bg: "#fee2e2", fg: "#991b1b" };
    case "PRINTING":
    case "PROCESSING":
      return { bg: "#dbeafe", fg: "#1d4ed8" };
    default:
      return { bg: "#f3f4f6", fg: "#374151" };
  }
}

function StatusBadge({ status }: { status?: string | null }) {
  const tone = statusTone(status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        background: tone.bg,
        color: tone.fg,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {status ?? "UNKNOWN"}
    </span>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#111827" }}>{value}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>{note}</div>
    </div>
  );
}

export default function StoreOpsOverviewRenderer({
  orders = [],
  printJobs = [],
  onSelectOrder,
  onOpenInvoice,
  onOpenPackingSlip,
  onOpenShippingLabel,
}: Props) {
  const recentOrders = orders.slice(0, 5);
  const queuedJobs = printJobs.slice(0, 5);
  const grossSales = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);

  return (
    <div
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        background: "linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)",
        minHeight: "100%",
        padding: 20,
        color: "#111827",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        <StatCard label="Recent orders" value={String(orders.length)} note="Latest orders available to operators" />
        <StatCard label="Queued print jobs" value={String(printJobs.length)} note="Jobs waiting to be printed" />
        <StatCard label="Gross sales" value={formatMoney(grossSales)} note="Computed from the loaded order list" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, marginTop: 16 }}>
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 18,
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Recent Orders</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Click an order to open its detail drawer.</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {recentOrders.map((order) => (
              <div
                key={order.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 14,
                  background: "#fcfcfd",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{order.id}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>{order.user?.email ?? "No customer email"}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#6b7280" }}>
                      {[order.shippingCity, order.shippingState].filter(Boolean).join(", ") || "No shipping location"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <StatusBadge status={order.status} />
                    <div style={{ marginTop: 8, fontSize: 15, fontWeight: 700 }}>{formatMoney(order.total)}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>{formatDate(order.createdAt)}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  <button onClick={() => onSelectOrder?.(order.id)} style={primaryButton}>
                    Open Order
                  </button>
                  <button onClick={() => onOpenInvoice?.(order.id)} style={secondaryButton}>
                    Invoice
                  </button>
                  <button onClick={() => onOpenPackingSlip?.(order.id)} style={secondaryButton}>
                    Packing Slip
                  </button>
                  <button onClick={() => onOpenShippingLabel?.(order.id)} style={secondaryButton}>
                    Shipping Label
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            padding: 18,
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Queued Print Jobs</h2>
          <p style={{ margin: "4px 0 12px", fontSize: 13, color: "#6b7280" }}>Use this block for quick triage.</p>

          <div style={{ display: "grid", gap: 10 }}>
            {queuedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 12,
                  background: "#fcfcfd",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{job.type ?? "PRINT_JOB"}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>{job.printerName ?? "No printer assigned"}</div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>{formatDate(job.createdAt)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "8px 12px",
  background: "#111827",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "8px 12px",
  background: "#ffffff",
  color: "#111827",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
```

This is the right place to use a renderer:

- overview KPI cards
- richer order cards with inline actions
- small status badges and grouped document buttons

This is not the right place to use a renderer yet:

- full product editing flows
- media upload
- marketing email composition
- anything that needs large forms or heavy client state

## Explicitly Out of Scope for V1

Do not build these first unless there is a strong operational need:

- GraphQL admin surface
- media upload workflow
- marketing composer
- custom design proposal flow
- submission workflows
- NextAuth-backed browser flows

Those features are either session-oriented, UI-heavy, or awkward fits for App Builder.

## Best First Build Order

Implement in this order:

1. Orders
2. Customers
3. Print Queue
4. Catalog
5. Collections

That order gives you operational value early and keeps the first App Builder version simple.

## Notes For Future Hardening

If this Datadog app becomes important operationally, the next backend improvements should be:

1. add stable list filters to `/api/orders` and `/api/products`
2. add explicit pagination to large list endpoints
3. add a small App Builder facade layer for aggregated dashboard stats
4. tighten service auth beyond a single shared bearer token if needed
5. make `X-Shop-Id` actually enforced if multi-shop separation matters