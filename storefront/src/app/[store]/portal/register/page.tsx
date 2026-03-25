import { isValidStore } from "@/lib/storefront/store";

import RegisterForm from "@/components/auth/RegisterForm";

export default async function PortalRegisterPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  return (
    <RegisterForm
      store={store}
      basePath="/portal"
      title={store === "dev" ? "Client Portal signup" : "Design Portal signup"}
      subtitle={
        store === "dev"
          ? "Create your account to access the client portal."
          : "Create your account to access the design portal."
      }
    />
  );
}
