export const APPAREL_SHOP_ID = "jahandco-apparel";
export const DEV_SHOP_ID = "jahandco-dev";
export const LEGACY_APPAREL_SHOP_ID = "jahandco-shop";

export const CORE_SHOPS = [
  { id: APPAREL_SHOP_ID, name: "Jah and Co Apparel" },
  { id: DEV_SHOP_ID, name: "Jah and Co Dev" },
] as const;

export type CoreShopId = (typeof CORE_SHOPS)[number]["id"];

export const CORE_SHOP_IDS = new Set<string>(CORE_SHOPS.map((shop) => shop.id));

export function isCoreShopId(value: string | null | undefined): value is CoreShopId {
  return typeof value === "string" && CORE_SHOP_IDS.has(value);
}

export function resolveCoreShopId(value: string | null | undefined): CoreShopId {
  return isCoreShopId(value) ? value : APPAREL_SHOP_ID;
}