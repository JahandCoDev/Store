import { redirect } from "next/navigation";

import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

import RegisterForm from "@/components/auth/RegisterForm";

export default async function AccountRegisterPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  const { publicBasePath } = await getStorefrontRequestContext(store);

  if (store === "dev") {
    redirect(resolveStorefrontHref(publicBasePath, "/portal/register"));
  }

  return (
    <RegisterForm
      store={store}
      basePath="/account"
      title="Create account"
      subtitle="Create a customer account for this store."
    />
  );
}
