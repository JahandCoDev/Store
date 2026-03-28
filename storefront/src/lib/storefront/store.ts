export const STORES = ["shop", "dev"] as const;
export type StoreKey = (typeof STORES)[number];

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

