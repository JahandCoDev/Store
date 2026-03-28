import Link from "next/link";
import { Mail, MapPin } from "lucide-react";

import { resolveStorefrontHref } from "@/lib/storefront/routing";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SiteFooter({
  shopName,
  footerCopy,
  publicBasePath,
  store,
}: {
  shopName: string | null;
  footerCopy: string | null;
  publicBasePath: string;
  store?: string;
}) {
  const isDev = store === "dev";

  return (
    <footer className={isDev ? "border-t border-white/10 bg-zinc-950" : "border-t border-[color:var(--shell-border)] bg-[rgba(2,4,8,0.86)] backdrop-blur-2xl"}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.7fr_0.7fr] lg:px-8">
        <div className="space-y-4">
          <div className="text-lg font-semibold text-white">{shopName || "Jah and Co"}</div>
          <p className="max-w-md text-sm leading-relaxed text-zinc-400">
            Where style meets soul. Custom apparel, design-led drops, and one-on-one creative work built around your vibe.
          </p>
          <div className="grid gap-2 text-sm text-zinc-400">
            <a className="inline-flex items-center gap-2 hover:text-white transition-colors" href="mailto:info@jahandco.net">
              <Mail className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
              info@jahandco.net
            </a>
            <a className="inline-flex items-center gap-2 hover:text-white transition-colors" href="https://www.instagram.com/jahandcoorl" target="_blank" rel="noreferrer">
              <InstagramGlyph className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
              @jahandcoorl
            </a>
            <div className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[color:var(--color-brand-royal)]" />
              Orlando, Florida
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Browse</div>
          <div className="mt-4 grid gap-3 text-sm text-zinc-400">
            <Link className="hover:text-white transition-colors" href={resolveStorefrontHref(publicBasePath, "/custom-apparel")}>Custom Apparel</Link>
            <Link className="hover:text-white transition-colors" href={resolveStorefrontHref(publicBasePath, "/design-gallery")}>Design Factory</Link>
            <Link className="hover:text-white transition-colors" href={resolveStorefrontHref(publicBasePath, "/collections/all")}>All Products</Link>
            <Link className="hover:text-white transition-colors" href={resolveStorefrontHref(publicBasePath, "/portal")}>Design Portal</Link>
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Company</div>
          <div className="mt-4 grid gap-3 text-sm text-zinc-400">
            <Link className="hover:text-white transition-colors" href={resolveStorefrontHref(publicBasePath, "/contact")}>Contact</Link>
            <Link className="hover:text-white transition-colors" href={resolveStorefrontHref(publicBasePath, "/privacy-policy")}>Privacy Policy</Link>
            <Link className="hover:text-white transition-colors" href={resolveStorefrontHref(publicBasePath, "/terms-of-service")}>Terms of Service</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>{footerCopy || `© ${new Date().getFullYear()} ${shopName || "Jah and Co"}`}</div>
          <div>Designed for a cleaner, sharper storefront experience.</div>
        </div>
      </div>
    </footer>
  );
}
