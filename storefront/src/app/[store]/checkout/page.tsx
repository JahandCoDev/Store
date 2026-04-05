import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CheckoutClient } from "@/components/CheckoutClient";
import { authOptions } from "@/lib/auth";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

export default async function CheckoutPage({
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

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;

  return (
    <CheckoutClient
      store={store}
      user={user?.id && user.email ? { id: user.id, email: user.email, name: user.name ?? null } : null}
    />
  );
}
