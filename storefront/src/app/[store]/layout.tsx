import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import DatadogRumInit from "@/components/DatadogRumInit";
import { authOptions } from "@/lib/auth";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { getStoreShellContent } from "@/lib/storefront/content";
import { isValidStore } from "@/lib/storefront/store";

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
  const { publicBasePath } = await getStorefrontRequestContext(store);
  const shell = await getStoreShellContent(store);

  return (
    <div className="storefront-shell relative flex min-h-svh flex-col overflow-hidden bg-black text-zinc-100" data-store={store}>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-6rem] h-[28rem] w-[28rem] rounded-full bg-[color:var(--color-brand-royal-soft)] blur-3xl animate-pulse-soft" />
        <div className="absolute right-[-9rem] top-[10rem] h-[24rem] w-[24rem] rounded-full bg-[rgba(255,255,255,0.08)] blur-3xl animate-float-slow" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-[rgba(11,23,48,0.9)] blur-3xl" />
        <div className="store-grid-lines absolute inset-0 opacity-40" />
      </div>
      <DatadogRumInit
        store={store}
        userId={sessionUser?.id}
        userEmail={sessionUser?.email ?? null}
        userRole={sessionUser?.role ?? null}
      />
      <SiteHeader
        store={store}
        publicBasePath={publicBasePath}
        shopName={shell.shopName}
        sessionUser={sessionUser ?? null}
        navLinks={shell.navLinks}
      />
      <main id="MainContent" role="main" className="flex-1">
        {children}
      </main>
      <SiteFooter shopName={shell.shopName} footerCopy={shell.footerCopy} publicBasePath={publicBasePath} store={store} />
    </div>
  );
}
