import Image from "next/image";
import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";

import { CartNavLink } from "@/components/CartNavLink";
import { resolveStorefrontHref } from "@/lib/storefront/routing";

type SessionUser = {
  email?: string | null;
  role?: string | null;
};

export function SiteHeader({
  store,
  publicBasePath,
  shopName,
  sessionUser,
  navLinks = [],
}: {
  store: string;
  publicBasePath: string;
  shopName: string | null;
  sessionUser?: SessionUser | null;
  navLinks?: Array<{ href: string; label: string }>;
}) {
  const isDev = store === "dev";
  const isAdmin = sessionUser?.role === "ADMIN";
  const adminUrl = (process.env.ADMIN_APP_URL || "/admin").replace(/\/$/, "");
  const shopLinks = [
    { href: "/custom-apparel", label: "Shop" },
    { href: "/design-gallery", label: "Design Factory" },
    ...navLinks,
    { href: "/search", label: "Search" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header
      className={
        isDev
          ? "sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(180deg,rgba(4,12,24,0.96),rgba(4,12,24,0.88))] backdrop-blur-xl"
          : "sticky top-0 z-40 border-b border-[color:var(--shell-border)] bg-[color:rgba(4,7,13,0.76)] backdrop-blur-2xl"
      }
    >
      {!isDev ? (
        <div className="border-b border-white/6 bg-white/[0.02]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-zinc-400 sm:px-6 lg:px-8">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--color-brand-royal)]" />
              This is Jah and Co.
            </span>
            <span className="hidden sm:inline">Where style meets soul.</span>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={resolveStorefrontHref(publicBasePath, "/")}
            className="flex items-center gap-3 text-sm font-semibold tracking-wide text-zinc-100 transition-colors hover:text-white"
          >
            <Image
              src="/jahandco-logo.svg"
              alt="JahandCo"
              width={240}
              height={70}
              className="h-9 w-auto"
              priority={isDev}
            />
          </Link>
          {!isDev ? (
            <div className="hidden min-w-0 md:block">
              <div className="text-sm font-semibold text-white">{shopName || "Jah and Co"}</div>
              <div className="truncate text-xs uppercase tracking-[0.24em] text-zinc-500">Black, white, royal blue custom apparel</div>
            </div>
          ) : (
            <span className="hidden text-xs uppercase tracking-[0.28em] text-cyan-100/70 sm:inline">
              {shopName || "Jah and Co"}
            </span>
          )}
        </div>

        {isDev ? (
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3" aria-label="Main">
            <Link className="nav-link rounded-full px-3 py-2 hover:bg-white/8" href={resolveStorefrontHref(publicBasePath, "/services")}>
              Services
            </Link>
            <Link className="nav-link rounded-full px-3 py-2 hover:bg-white/8" href={resolveStorefrontHref(publicBasePath, "/pricing")}>
              Pricing
            </Link>
            <Link className="nav-link rounded-full px-3 py-2 hover:bg-white/8" href={resolveStorefrontHref(publicBasePath, "/portfolio")}>
              Portfolio
            </Link>
            <Link className="nav-link rounded-full px-3 py-2 hover:bg-white/8" href={resolveStorefrontHref(publicBasePath, "/portal")}>
              Portal
            </Link>
            <Link className="btn btn-secondary hidden sm:inline-flex" href={resolveStorefrontHref(publicBasePath, "/")}>
              Home
            </Link>
            <Link className="btn btn-primary shadow-[0_10px_30px_rgba(34,211,238,0.2)]" href={resolveStorefrontHref(publicBasePath, "/quote")}>
              Get a Quote
            </Link>
          </nav>
        ) : (
          <>
            <nav className="hidden items-center justify-end gap-2 lg:flex" aria-label="Main">
              {shopLinks.map((link) => (
                <Link
                  key={link.href}
                  className="nav-link rounded-full border px-4 py-2 hover:bg-[color:var(--nav-pill-hover)]"
                  style={{ borderColor: "var(--nav-pill-border)" }}
                  href={resolveStorefrontHref(publicBasePath, link.href)}
                >
                  {link.label}
                </Link>
              ))}
              <CartNavLink store={store} href={resolveStorefrontHref(publicBasePath, "/cart")} />
              <Link className="btn btn-secondary" href={resolveStorefrontHref(publicBasePath, "/account")}>
                Account
              </Link>
              {isAdmin ? (
                <a className="btn btn-primary" href={adminUrl}>
                  Admin
                </a>
              ) : null}
            </nav>

            <details className="group relative lg:hidden">
              <summary className="btn btn-secondary list-none cursor-pointer px-4 py-2 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  Menu
                </span>
              </summary>
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[1.5rem] border border-[color:var(--panel-border)] bg-[rgba(5,8,15,0.94)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
                <div className="grid gap-2">
                  {shopLinks.map((link) => (
                    <Link
                      key={link.href}
                      className="nav-link rounded-2xl border px-4 py-3 hover:bg-[color:var(--nav-pill-hover)]"
                      style={{ borderColor: "var(--nav-pill-border)" }}
                      href={resolveStorefrontHref(publicBasePath, link.href)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <CartNavLink store={store} href={resolveStorefrontHref(publicBasePath, "/cart")} />
                  <Link className="btn btn-secondary w-full" href={resolveStorefrontHref(publicBasePath, "/account")}>
                    Account
                  </Link>
                  {isAdmin ? (
                    <a className="btn btn-primary w-full" href={adminUrl}>
                      Admin
                    </a>
                  ) : null}
                </div>
              </div>
            </details>
          </>
        )}
      </div>
    </header>
  );
}
