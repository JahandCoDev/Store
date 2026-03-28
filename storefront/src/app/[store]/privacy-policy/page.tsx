import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { isValidStore } from "@/lib/storefront/store";

export default async function PrivacyPolicyPage({
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
          <p className="store-eyebrow">Privacy Policy</p>
          <h1 className="store-title mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How Jah and Co handles your information</h1>
          <div className="store-copy mt-6 space-y-4 text-sm leading-relaxed">
            <p>We collect the information you provide when you create an account, place an order, complete the Style Survey, join the mailing list, or submit a custom design request.</p>
            <p>That information may include your name, email address, shipping and billing details, product preferences, survey responses, and design request notes.</p>
            <p>We use this information to operate the storefront, process orders, personalize your experience, communicate about your requests, and send marketing messages when you have opted in.</p>
            <p>We do not sell your personal information. We may share required information with service providers that help us run payments, email delivery, hosting, fulfillment, analytics, and customer support.</p>
            <p>You can contact us at info@jahandco.net if you need help updating or deleting your information, or if you want to unsubscribe from marketing communication.</p>
          </div>
        </div>
      </div>
    </div>
  );
}