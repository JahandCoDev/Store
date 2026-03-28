import Link from "next/link";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

export function SurveyThankYouPage({ publicBasePath }: { publicBasePath: string }) {
  return (
    <div className="store-section py-10 sm:py-12">
      <div className="store-container max-w-3xl animate-fade-in">
        <div className="store-card px-6 py-8 sm:px-8 sm:py-10">
        <h1 className="store-title text-3xl font-semibold tracking-tight sm:text-4xl">
          Thank you for your submission!
        </h1>
        <p className="store-copy mt-5 text-sm leading-relaxed sm:text-base">
          You should receive an email from us within the next day to discuss your submission and start the
          creative process. Thank you for giving Jah and Co the opportunity to create something great!
        </p>
        <div className="mt-8">
          <Link className="btn btn-primary" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>
            Shop Custom
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
