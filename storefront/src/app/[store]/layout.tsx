import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import DatadogRumInit from "@/components/DatadogRumInit";
import { authOptions } from "@/lib/auth";
import { getStoreDisplayName, isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) notFound();
  const shopName = getStoreDisplayName(store);
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;
  const shopId = resolveShopIdForStore(store);

  return (
    <div className="min-h-svh bg-black text-zinc-100 flex flex-col">
      <DatadogRumInit
        store={store}
        shopId={shopId}
        userId={sessionUser?.id}
        userEmail={sessionUser?.email ?? null}
        userRole={sessionUser?.role ?? null}
      />
      <SiteHeader store={store} shopName={shopName} sessionUser={sessionUser ?? null} />
      <main id="MainContent" role="main" className="flex-1">
        {children}
      </main>
      <SiteFooter shopName={shopName} footerCopy={null} store={store} />
    </div>
  );
}
