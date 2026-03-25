import { redirect } from "next/navigation";

import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

import LogoutClient from "@/components/auth/LogoutClient";

export default async function AccountLogoutPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  const { publicBasePath } = await getStorefrontRequestContext(store);

  if (store === "dev") {
    redirect(resolveStorefrontHref(publicBasePath, "/portal/logout"));
  }

  return <LogoutClient store={store} callbackPath="/" />;
}
