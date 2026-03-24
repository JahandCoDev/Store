import "server-only";

import prisma from "@/lib/prisma";
import { logServerEvent } from "@/lib/observability/serverLogger";

import { getStoreDisplayName, resolveShopIdForStore, type StoreKey } from "./store";

const CORE_STORE_IDS: Record<StoreKey, string> = {
  shop: "jahandco-shop",
  dev: "jahandco-dev",
};

export async function ensurePersistedShopIdForStore(store: StoreKey): Promise<string> {
  const configuredShopId = resolveShopIdForStore(store);
  const coreShopId = CORE_STORE_IDS[store];
  const coreShopName = getStoreDisplayName(store);

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