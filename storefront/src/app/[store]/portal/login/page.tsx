import { isValidStore } from "@/lib/storefront/store";

import LoginForm from "@/components/auth/LoginForm";

export default async function PortalLoginPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;

  return (
    <LoginForm
      store={store}
      basePath="/portal"
      title={store === "dev" ? "Client Portal sign in" : "Design Portal sign in"}
      subtitle={
        store === "dev"
          ? "Sign in to access client-only tools."
          : "Sign in to access design drafts and collaboration."
      }
    />
  );
}
