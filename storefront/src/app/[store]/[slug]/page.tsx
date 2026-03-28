import { notFound } from "next/navigation";

import { StorefrontPageView } from "@/components/shop/StorefrontPageView";
import { getMockPageBySlug } from "@/lib/mock/pages";
import { getPublishedPageBySlug } from "@/lib/storefront/content";
import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { isValidStore } from "@/lib/storefront/store";
import DevServicesPage from "@/components/dev/DevServicesPage";
import DevPricingPage from "@/components/dev/DevPricingPage";
import DevPortfolioPage from "@/components/dev/DevPortfolioPage";
import DevQuotePage from "@/components/dev/DevQuotePage";
import { CustomApparelPage } from "@/components/shop/CustomApparelPage";
import { CustomApparelGuidePage } from "@/components/shop/CustomApparelGuidePage";
import { DesignGalleryPage } from "@/components/shop/DesignGalleryPage";
import { SurveyThankYouPage } from "@/components/shop/SurveyThankYouPage";
import { CustomerQuestionnairePage } from "@/components/shop/CustomerQuestionnairePage";

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
  const { publicBasePath } = await getStorefrontRequestContext(store);

  // Rich dev-store pages
  if (store === "dev" && slug in DEV_PAGES) {
    if (slug === "services") return <DevServicesPage store={store} />;
    if (slug === "pricing") return <DevPricingPage store={store} />;
    if (slug === "portfolio") return <DevPortfolioPage store={store} />;
    if (slug === "quote") return <DevQuotePage store={store} />;
  }

  if (slug === "custom-apparel") {
    return <CustomApparelPage store={store} publicBasePath={publicBasePath} />;
  }

  if (slug === "custom-apparel-guide" || slug === "apparel-guide") {
    return <CustomApparelGuidePage publicBasePath={publicBasePath} />;
  }

  if (slug === "survey-thank-you") {
    return <SurveyThankYouPage publicBasePath={publicBasePath} />;
  }

  if (slug === "customer-questionnaire") {
    return <CustomerQuestionnairePage store={store} />;
  }

  if (slug === "digital-gallery" || slug === "design-gallery") {
    return <DesignGalleryPage publicBasePath={publicBasePath} />;
  }

  const dbPage = await getPublishedPageBySlug(store, slug);
  if (dbPage) {
    return <StorefrontPageView publicBasePath={publicBasePath} page={dbPage} />;
  }

  const page = getMockPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="store-section py-8 sm:py-10">
      <div className="store-container max-w-3xl animate-fade-in">
        <div className="store-card px-6 py-8 sm:px-8 sm:py-10">
        <h1 className="store-title text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.title}
        </h1>
        <div className="store-copy mt-5 whitespace-pre-wrap text-sm leading-relaxed">
          {page.body}
        </div>
        </div>
      </div>
    </div>
  );
}
