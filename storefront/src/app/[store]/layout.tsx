import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getStoreDisplayName, isValidStore } from "@/lib/storefront/store";

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

  return (
    <>
      <SiteHeader store={store} shopName={shopName} />
      <main id="MainContent" className="content-for-layout" role="main">
        {children}
      </main>
      <SiteFooter shopName={shopName} footerCopy={null} />
    </>
  );
}
