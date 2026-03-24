import Image from "next/image";
import Link from "next/link";

type SessionUser = {
  email?: string | null;
  role?: string | null;
};

export function SiteHeader({
  store,
  shopName,
  sessionUser,
  navLinks = [],
}: {
  store: string;
  shopName: string | null;
  sessionUser?: SessionUser | null;
  navLinks?: Array<{ href: string; label: string }>;
}) {
  const isDev = store === "dev";
  const isAdmin = sessionUser?.role === "ADMIN";
  const adminUrl = (process.env.ADMIN_APP_URL || "/admin").replace(/\/$/, "");

  return (
    <header
      className={
        isDev
          ? "sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(180deg,rgba(4,12,24,0.96),rgba(4,12,24,0.88))] backdrop-blur-xl"
          : "border-b border-white/10 bg-black"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={`/${store}`}
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
          <span className={isDev ? "hidden text-xs uppercase tracking-[0.28em] text-cyan-100/70 sm:inline" : "hidden sm:inline"}>
            {shopName || "Jah and Co"}
          </span>
        </Link>

        {isDev ? (
          <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3" aria-label="Main">
            <Link className="nav-link rounded-full px-3 py-2 hover:bg-white/8" href={`/${store}/services`}>
              Services
            </Link>
            <Link className="nav-link rounded-full px-3 py-2 hover:bg-white/8" href={`/${store}/pricing`}>
              Pricing
            </Link>
            <Link className="nav-link rounded-full px-3 py-2 hover:bg-white/8" href={`/${store}/portfolio`}>
              Portfolio
            </Link>
            <Link className="btn btn-secondary hidden sm:inline-flex" href={`/${store}`}>
              Home
            </Link>
            <Link className="btn btn-primary shadow-[0_10px_30px_rgba(34,211,238,0.2)]" href={`/${store}/quote`}>
              Get a Quote
            </Link>
          </nav>
        ) : (
          <nav className="flex flex-wrap items-center justify-end gap-3" aria-label="Main">
            <Link className="nav-link" href={`/${store}/collections/all`}>
              Shop
            </Link>
            {navLinks.map((link) => (
              <Link key={link.href} className="nav-link" href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link className="nav-link" href={`/${store}/search`}>
              Search
            </Link>
            <Link className="nav-link" href={`/${store}/cart`}>
              Cart
            </Link>
            <Link className="nav-link" href={`/${store}/account`}>
              Account
            </Link>
            {isAdmin ? (
              <a className="nav-link" href={adminUrl}>
                Admin
              </a>
            ) : null}
          </nav>
        )}
      </div>
    </header>
  );
}
