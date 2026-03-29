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