import Link from "next/link";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

export function SurveyThankYouPage({ publicBasePath }: { publicBasePath: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl animate-fade-in">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Thank you for your submission!
        </h1>
        <p className="mt-5 text-sm sm:text-base leading-relaxed text-zinc-300">
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
  );
}
