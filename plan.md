## JahandCo Ecom Platform — Updated Plan

Updated: 2026-03-19

### North star

Build a Shopify-like, multi-tenant admin platform for managing:

- Shops / teams (multi-tenant)
- Products + inventory
- Customers
- Orders + fulfillment
- Metadata (metafields) for extensibility
- Themed invoices/documents
- Marketing / emailing (minimal transactional first)
- **Design portal** (explicitly mentioned; scope defined later)
- Printing + labeling via **DYMO SDK integration** (via a Windows print agent)

Hard rule: all reads/writes are shop-scoped and membership-authorized.

---

## Phase 0 — Foundation (auth, tenancy, DX)

### Auth

- NextAuth (Credentials) for admin login
- Admin-only gating (middleware + server checks)

### Tenancy primitives

- `Shop` entity
- `ShopUser` join model with roles (OWNER/ADMIN/STAFF)
- `shopId` foreign key on every shop-owned entity (Products, Orders, Customers, etc.)

### Shop context selection

- Active shop stored in an httpOnly cookie (e.g. `shopId`)
- Server-side enforcement: every API handler validates session + membership + shop scope

---

## Phase 1 — Products (catalog + inventory)

### Data

- Product core: title/description/status, images, sku/barcode, price/cost/compare-at
- Inventory: on-hand + adjustments log (start simple)
- Optional (later): variants (size/color) with per-variant SKU + inventory

### Admin UX

- Product list + search
- Create/edit product
- Inventory adjust

---

## Phase 2 — Orders (checkout → fulfillment loop)

### Data

- Order header: customer, totals, taxes/shipping, currency, status
- Line items: product snapshot + qty
- Fulfillment: tracking number/carrier, shipped timestamps

### Admin UX

- Orders list
- Order detail
- Update status + capture fulfillment details

### Events (internal)

- Emit internal events for downstream systems: `order.created`, `order.paid`, `order.fulfilled`

---

## Phase 3 — Customers

### Data

- Customer: name, email, phone, addresses, notes, tags
- Marketing consent flag

### Admin UX

- Search + list
- Customer detail with order history

---

## Phase 4 — Metadata (Shopify-style “metafields”)

### Data

- `MetaDefinition` (namespace/key, type, validation rules, appliesTo)
- `MetaValue` (entityType + entityId + definitionId + typed value)

### UX

- Minimal custom fields UI per entity (product/customer/order)
- Definitions management (admin-only)

---

## Phase 5 — Themed invoices + documents

### Goal

- Generate shop-branded invoices + packing slips

### Approach

- Render HTML → PDF server-side
- Theme per shop: logo, address blocks, footer copy, minimal accent color
- Store generated PDFs (or store inputs and regenerate deterministically)

---

## Phase 6 — Marketing / emailing (minimal first)

### Transactional first

- Order confirmation
- Shipping update
- Invoice sent

### Later

- Segments based on tags/metadata + send logs

---

## Phase 7 — Design portal (mentioned; scoped later)

Intent: customer/client-facing portal for approving designs/mocks before production.

Likely entities (to confirm later):

- `DesignRequest`, `Mockup`, `Approval`, `Message`, file attachments

---

## Phase 8 — Printing + labeling (DYMO SDK integration)

### Key decision

Do **not** print from k8s/Linux directly. Use a **Windows pull-based print agent** to integrate with DYMO reliably.

### Architecture

- Backend creates `PrintJob` records (shipping labels, packing slips, pick lists)
- Windows print agent:
	- Polls backend for queued jobs (pull model)
	- Downloads print assets (PDF/PNG) + printer/size metadata
	- Prints using DYMO SDK
	- Reports success/failure back to backend (with error text)

### Security

- Agent authenticates via scoped token
- Jobs are shop-scoped

---

## Telephony (separate domain)

This repo also contains a telephony service for business phone routing / voice agents / IVR.
Treat it as a parallel system: integrate via events/webhooks rather than coupling core commerce logic to call handling.

