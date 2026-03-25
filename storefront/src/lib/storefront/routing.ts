import { isValidStore, type StoreKey } from "@/lib/storefront/store";

const DEFAULT_STOREFRONT_HOSTS: Record<StoreKey, string> = {
  shop: "shop.jahandco.net",
  dev: "dev.jahandco.net",
};

function getStorefrontDomainEnvKey(store: StoreKey) {
  return store === "shop" ? "STOREFRONT_DOMAIN_SHOP" : "STOREFRONT_DOMAIN_DEV";
}

export function normalizeHostname(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//i, "")
    .split("/")[0]
    .replace(/:80$/, "")
    .replace(/:443$/, "")
    .replace(/\.$/, "");

  return normalized || null;
}

export function getDomainForStore(store: StoreKey): string {
  const configured = normalizeHostname(process.env[getStorefrontDomainEnvKey(store)]);
  return configured || DEFAULT_STOREFRONT_HOSTS[store];
}

export function getOriginForStore(store: StoreKey): string {
  const domain = getDomainForStore(store);
  const protocol = domain.startsWith("localhost:") || domain.startsWith("127.0.0.1:") ? "http" : "https";
  return `${protocol}://${domain}`;
}

export function resolveStoreFromHostname(hostname: string | null | undefined): StoreKey | null {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return null;

  if (normalized === getDomainForStore("shop")) return "shop";
  if (normalized === getDomainForStore("dev")) return "dev";

  return null;
}

export function getStoreFromPathname(pathname: string): StoreKey | null {
  const segment = pathname.split("/")[1];
  return segment && isValidStore(segment) ? segment : null;
}

export function buildStorePath(publicBasePath: string, path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!publicBasePath) return normalizedPath;
  if (normalizedPath === "/") return publicBasePath;

  return `${publicBasePath}${normalizedPath}`;
}

export function resolveStorefrontHref(publicBasePath: string, href: string): string {
  if (!href) return buildStorePath(publicBasePath);

  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    /^[a-z]+:\/\//i.test(href)
  ) {
    return href;
  }

  if (!href.startsWith("/")) return href;

  const prefixedStore = getStoreFromPathname(href);
  if (!prefixedStore) {
    return buildStorePath(publicBasePath, href);
  }

  if (!publicBasePath) {
    const stripped = href.replace(new RegExp(`^/${prefixedStore}`), "") || "/";
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }

  return href;
}
