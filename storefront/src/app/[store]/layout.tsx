import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import DatadogRumInit from "@/components/DatadogRumInit";
import { authOptions } from "@/lib/auth";
import { getStoreShellContent } from "@/lib/storefront/content";
import { isValidStore, resolveShopIdForStore } from "@/lib/storefront/store";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) notFound();
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; email?: string | null; role?: string | null } | undefined;
  const shopId = resolveShopIdForStore(store);
  const shell = await getStoreShellContent(store);

  return (
    <div className="min-h-svh bg-black text-zinc-100 flex flex-col">
      <DatadogRumInit
        store={store}
        shopId={shopId}
        userId={sessionUser?.id}
        userEmail={sessionUser?.email ?? null}
        userRole={sessionUser?.role ?? null}
      />
      <SiteHeader store={store} shopName={shell.shopName} sessionUser={sessionUser ?? null} navLinks={shell.navLinks} />
      <main id="MainContent" role="main" className="flex-1">
        {children}
      </main>
      <SiteFooter shopName={shell.shopName} footerCopy={shell.footerCopy} store={store} />
    </div>
  );
}
