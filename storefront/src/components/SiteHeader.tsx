import Link from "next/link";

type SessionUser = {
  email?: string | null;
  role?: string | null;
};

export function SiteHeader({
  store,
  shopName,
  sessionUser,
}: {
  store: string;
  shopName: string | null;
  sessionUser?: SessionUser | null;
}) {
  const isDev = store === "dev";
  const isAdmin = sessionUser?.role === "ADMIN";
  const adminUrl = (process.env.ADMIN_APP_URL || "/admin").replace(/\/$/, "");

  return (
    <header className={isDev ? "border-b border-white/10 bg-zinc-950" : "border-b border-white/10 bg-black"}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={`/${store}`}
          className="text-sm font-semibold tracking-wide text-zinc-100 hover:text-white transition-colors"
        >
          {shopName || "Jah and Co"}
        </Link>

        {isDev ? (
          <nav className="flex flex-wrap items-center justify-end gap-3" aria-label="Main">
            <Link className="nav-link" href={`/${store}/pages/services`}>
              Services
            </Link>
            <Link className="nav-link" href={`/${store}/pages/pricing`}>
              Pricing
            </Link>
            <Link className="nav-link" href={`/${store}/pages/portfolio`}>
              Portfolio
            </Link>
            <Link className="nav-link" href={`/${store}/pages/contact`}>
              Contact
            </Link>
            <Link className="btn btn-primary" href={`/${store}/pages/quote`}>
              Get a Quote
            </Link>
          </nav>
        ) : (
          <nav className="flex flex-wrap items-center justify-end gap-3" aria-label="Main">
            <Link className="nav-link" href={`/${store}/collections/all`}>
              Shop
            </Link>
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
