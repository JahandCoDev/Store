import { isValidStore } from "@/lib/storefront/store";

import LogoutClient from "@/components/auth/LogoutClient";

export default async function PortalLogoutPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  return <LogoutClient store={store} callbackPath="/portal" />;
}
