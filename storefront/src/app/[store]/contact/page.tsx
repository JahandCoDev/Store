import Link from "next/link";

import { getStorefrontRequestContext } from "@/lib/storefront/requestContext";
import { resolveStorefrontHref } from "@/lib/storefront/routing";
import { isValidStore } from "@/lib/storefront/store";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!isValidStore(store)) return null;
  const { publicBasePath } = await getStorefrontRequestContext(store);

  return (
    <div className="store-section py-8 sm:py-10">
      <div className="store-container max-w-4xl animate-fade-in">
        <div className="store-card px-6 py-8 sm:px-8 sm:py-10">
          <p className="store-eyebrow">Contact</p>
          <h1 className="store-title mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Reach Jah and Co.</h1>
          <p className="store-copy mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
            For custom orders, design questions, large group requests, or general support, use the channels below and include as much detail as you can.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="store-card-soft rounded-[1.5rem] p-5">
              <div className="text-sm font-semibold text-white">Email</div>
              <p className="mt-2 text-sm text-zinc-300">info@jahandco.net</p>
            </div>
            <div className="store-card-soft rounded-[1.5rem] p-5">
              <div className="text-sm font-semibold text-white">Instagram</div>
              <p className="mt-2 text-sm text-zinc-300">@jahandcoorl</p>
            </div>
            <div className="store-card-soft rounded-[1.5rem] p-5">
              <div className="text-sm font-semibold text-white">Location</div>
              <p className="mt-2 text-sm text-zinc-300">Orlando, Florida</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a className="btn btn-primary" href="mailto:info@jahandco.net">Email us</a>
            <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/portal/request-custom-design")}>Request a custom design</Link>
          </div>
        </div>
      </div>
    </div>
  );
}