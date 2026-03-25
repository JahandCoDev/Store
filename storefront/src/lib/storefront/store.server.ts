import "server-only";

import prisma from "@/lib/prisma";
import { logServerEvent } from "@/lib/observability/serverLogger";

import { getStoreDisplayName, resolveShopIdForStore, type StoreKey } from "./store";

const CORE_STORE_IDS: Record<StoreKey, string> = {
  shop: "jahandco-apparel",
  dev: "jahandco-dev",
};
const LEGACY_APPAREL_SHOP_ID = "jahandco-shop";

export async function ensurePersistedShopIdForStore(store: StoreKey): Promise<string> {
  const configuredShopId = resolveShopIdForStore(store);
  const coreShopId = CORE_STORE_IDS[store];
  const coreShopName = getStoreDisplayName(store);

  if (store === "shop") {
    const [legacyShop, apparelShop] = await Promise.all([
      prisma.shop.findUnique({ where: { id: LEGACY_APPAREL_SHOP_ID }, select: { id: true } }),
      prisma.shop.findUnique({ where: { id: coreShopId }, select: { id: true } }),
    ]);

    if (legacyShop && !apparelShop) {
      await prisma.shop.update({
        where: { id: LEGACY_APPAREL_SHOP_ID },
        data: { id: coreShopId, name: coreShopName },
      });
      return coreShopId;
    }
  }

  // Treat store slugs like "dev" / "shop" as shorthand aliases, not broken config.
  if (configuredShopId === store || configuredShopId === coreShopId) {
    const shop = await prisma.shop.upsert({
      where: { id: coreShopId },
      create: { id: coreShopId, name: coreShopName },
      update: { name: coreShopName },
      select: { id: true },
    });

    return shop.id;
  }

  if (configuredShopId && configuredShopId !== coreShopId) {
    const existingConfiguredShop = await prisma.shop.findUnique({
      where: { id: configuredShopId },
      select: { id: true },
    });

    if (existingConfiguredShop) return existingConfiguredShop.id;

    logServerEvent("info", "Configured shop id missing; falling back to core shop", {
      configuredShopId,
      fallbackShopId: coreShopId,
      store,
    });
  }

  const shop = await prisma.shop.upsert({
    where: { id: coreShopId },
    create: { id: coreShopId, name: coreShopName },
    update: { name: coreShopName },
    select: { id: true },
  });

  return shop.id;
}