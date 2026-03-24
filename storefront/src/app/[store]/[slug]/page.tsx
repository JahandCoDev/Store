import { notFound } from "next/navigation";

import { StorefrontPageView } from "@/components/shop/StorefrontPageView";
import { getMockPageBySlug } from "@/lib/mock/pages";
import { getPublishedPageBySlug } from "@/lib/storefront/content";
import { isValidStore } from "@/lib/storefront/store";
import DevServicesPage from "@/components/dev/DevServicesPage";
import DevPricingPage from "@/components/dev/DevPricingPage";
import DevPortfolioPage from "@/components/dev/DevPortfolioPage";
import DevQuotePage from "@/components/dev/DevQuotePage";
import { CustomApparelPage } from "@/components/shop/CustomApparelPage";
import { CustomApparelGuidePage } from "@/components/shop/CustomApparelGuidePage";
import { DesignGalleryPage } from "@/components/shop/DesignGalleryPage";
import { SurveyThankYouPage } from "@/components/shop/SurveyThankYouPage";

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

  if (slug === "custom-apparel") {
    return <CustomApparelPage store={store} />;
  }

  if (slug === "custom-apparel-guide" || slug === "apparel-guide") {
    return <CustomApparelGuidePage store={store} />;
  }

  if (slug === "survey-thank-you") {
    return <SurveyThankYouPage store={store} />;
  }

  if (slug === "digital-gallery" || slug === "design-gallery") {
    return <DesignGalleryPage />;
  }

  const dbPage = await getPublishedPageBySlug(store, slug);
  if (dbPage) {
    return <StorefrontPageView store={store} page={dbPage} />;
  }

  const page = getMockPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {page.title}
        </h1>
        <div className="mt-5 text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {page.body}
        </div>
      </div>
    </div>
  );
}
