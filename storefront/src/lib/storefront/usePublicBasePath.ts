"use client";

import { usePathname } from "next/navigation";

export function usePublicBasePath(store: string) {
  const pathname = usePathname();
  const storeBasePath = `/${store}`;

  if (pathname === storeBasePath || pathname.startsWith(`${storeBasePath}/`)) {
    return storeBasePath;
  }

  return "";
}
