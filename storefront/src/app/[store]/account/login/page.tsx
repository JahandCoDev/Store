import { redirect } from "next/navigation";

import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

import LoginForm from "@/components/auth/LoginForm";

export default async function AccountLoginPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  const { publicBasePath } = await getStorefrontRequestContext(store);

  if (store === "dev") {
    redirect(resolveStorefrontHref(publicBasePath, "/portal/login"));
  }

  return (
    <LoginForm
      store={store}
      basePath="/account"
      title="Sign in"
      subtitle="Access your storefront account."
    />
  );
}
