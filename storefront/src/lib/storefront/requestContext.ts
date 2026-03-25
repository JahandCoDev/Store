import "server-only";

import { headers } from "next/headers";

import { isValidStore, type StoreKey } from "@/lib/storefront/store";
import { normalizeHostname, resolveStoreFromHostname } from "@/lib/storefront/routing";

export async function getStorefrontRequestContext(fallbackStore?: StoreKey) {
  const requestHeaders = await headers();
  const headerStore = requestHeaders.get("x-storefront-store");
  const host = normalizeHostname(requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"));

  const store =
    (headerStore && isValidStore(headerStore) ? headerStore : null) ??
    resolveStoreFromHostname(host) ??
    fallbackStore ??
    null;

  const publicBasePath = requestHeaders.get("x-storefront-public-base-path") ?? (store && resolveStoreFromHostname(host) !== store ? `/${store}` : "");

  return {
    store,
    hostname: host,
    publicBasePath,
    isDomainStorefront: Boolean(store) && publicBasePath === "",
  };
}
