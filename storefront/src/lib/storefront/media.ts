function encodeStorageKey(storageKey: string) {
  return encodeURIComponent(storageKey.replace(/^\/+/, "")).replace(/%2F/g, "/");
}

export function getStorefrontMediaUrl(storageKey: string): string {
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();
  if (!publicBaseUrl) {
    return `/${storageKey.replace(/^\/+/, "")}`;
  }

  return `${publicBaseUrl.replace(/\/$/, "")}/${encodeStorageKey(storageKey)}`;
}