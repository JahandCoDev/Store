"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { usePublicBasePath } from "@/lib/storefront/usePublicBasePath";

export default function LogoutClient({
  store,
  callbackPath,
}: {
  store: string;
  callbackPath: "/" | "/portal";
}) {
  const publicBasePath = usePublicBasePath(store);

  useEffect(() => {
    signOut({ callbackUrl: resolveStorefrontHref(publicBasePath, callbackPath) });
  }, [callbackPath, publicBasePath]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm text-zinc-400">Signing out…</p>
    </div>
  );
}
