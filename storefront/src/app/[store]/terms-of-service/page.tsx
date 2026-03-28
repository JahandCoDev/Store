import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { isValidStore } from "@/lib/storefront/store";

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;
  await getStorefrontRequestContext(store);

  return (
    <div className="store-section py-8 sm:py-10">
      <div className="store-container max-w-4xl animate-fade-in">
        <div className="store-card px-6 py-8 sm:px-8 sm:py-10">
          <p className="store-eyebrow">Terms of Service</p>
          <h1 className="store-title mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Terms for shopping and custom work</h1>
          <div className="store-copy mt-6 space-y-4 text-sm leading-relaxed">
            <p>By using the Jah and Co, you agree to provide accurate information, use the site lawfully, and respect the creative process behind custom apparel work.</p>
            <p>Custom requests may require review, revision, approval, and direct communication before production. Timelines can vary depending on order complexity and response times.</p>
            <p>Product availability, pricing, and design options can change without notice. Orders may be limited or canceled if inventory is unavailable or if a design request cannot be fulfilled as submitted.</p>
            <p>Approved custom work may move into invoicing, production, or fulfillment according to the terms communicated during the project. Unauthorized copying or resale of Jah and Co artwork is prohibited.</p>
            <p>If you have a question about these terms, contact info@jahandco.net before placing your order.</p>
          </div>
        </div>
      </div>
    </div>
  );
}