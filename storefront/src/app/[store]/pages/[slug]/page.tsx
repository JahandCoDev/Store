import { notFound } from "next/navigation";

import { getMockPageBySlug } from "@/lib/mock/pages";
import { isValidStore } from "@/lib/storefront/store";
import { DevServicesPage } from "@/components/dev/DevServicesPage";
import { DevPricingPage } from "@/components/dev/DevPricingPage";
import { DevPortfolioPage } from "@/components/dev/DevPortfolioPage";
import { DevQuotePage } from "@/components/dev/DevQuotePage";

const DEV_PAGES: Record<string, string> = {
  services: "services",
  pricing: "pricing",
  portfolio: "portfolio",
  quote: "quote",
};

export default async function ContentPage({
  params,
}: {
  params: Promise<{ store: string; slug: string }>;
}) {
  const { store, slug } = await params;
  if (!isValidStore(store)) notFound();

  // Rich dev-store pages
  if (store === "dev" && slug in DEV_PAGES) {
    if (slug === "services") return <DevServicesPage store={store} />;
    if (slug === "pricing") return <DevPricingPage store={store} />;
    if (slug === "portfolio") return <DevPortfolioPage store={store} />;
    if (slug === "quote") return <DevQuotePage store={store} />;
  }

  const page = getMockPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="section section--page-width" style={{ padding: "48px 0" }}>
      <h1>{page.title}</h1>
      <div style={{ marginTop: 12, maxWidth: 820, lineHeight: 1.7 }}>{page.body}</div>
    </div>
  );
}
