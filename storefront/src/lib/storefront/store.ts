export const STORES = ["shop", "dev"] as const;
export type StoreKey = (typeof STORES)[number];

const DEFAULT_SHOP_IDS: Record<StoreKey, string> = {
  shop: "jahandco-apparel",
  dev: "jahandco-dev",
};

export function isValidStore(store: string): store is StoreKey {
  return (STORES as readonly string[]).includes(store);
}

export function getStoreDisplayName(store: StoreKey): string {
  switch (store) {
    case "shop":
      return "Jah and Co Apparel";
    case "dev":
      return "Jah and Co Dev";
  }
}

/**
 * Map the URL store segment to a Shop.id in Postgres.
 *
 * Configure via env:
 * - STOREFRONT_SHOP_ID_SHOP
 * - STOREFRONT_SHOP_ID_DEV
 */
export function resolveShopIdForStore(store: StoreKey): string | null {
  const envKey = store === "shop" ? "STOREFRONT_SHOP_ID_SHOP" : "STOREFRONT_SHOP_ID_DEV";
  const value = process.env[envKey];
  return value && value.trim() ? value.trim() : DEFAULT_SHOP_IDS[store];
}
