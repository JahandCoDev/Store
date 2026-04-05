import { notFound, redirect } from "next/navigation";

import { CheckoutConfirmationClient } from "@/components/CheckoutConfirmationClient";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

export default async function CheckoutConfirmationPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) notFound();

  const { publicBasePath } = await getStorefrontRequestContext(store);
  if (store === "dev") {
    redirect(resolveStorefrontHref(publicBasePath, "/"));
  }

  return <CheckoutConfirmationClient store={store} />;
}
