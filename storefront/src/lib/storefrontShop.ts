export function getStorefrontShopId(): string | null {
  // Simplest MVP: a single configured shop.
  // Later: derive from host header (multi-tenant domains).
  return process.env.STOREFRONT_SHOP_ID?.trim() || null;
}
