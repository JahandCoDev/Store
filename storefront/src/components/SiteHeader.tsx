import Link from "next/link";

export function SiteHeader({
  store,
  shopName,
}: {
  store: string;
  shopName: string | null;
}) {
  const isDev = store === "dev";

  return (
    <header
      className="section section--page-width"
      style={{
        padding: "16px 0",
        background: isDev ? "#202219" : undefined,
        borderBottom: isDev ? "1px solid rgba(246,237,221,0.15)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href={`/${store}`}
          style={{ fontWeight: 700, color: isDev ? "#f6eddd" : undefined }}
        >
          {shopName || "Jah and Co"}
        </Link>

        {isDev ? (
          <nav
            style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
            aria-label="Main"
          >
            <Link
              href={`/${store}/pages/services`}
              style={{ color: "#f6eddd", opacity: 0.85, fontSize: 14 }}
            >
              Services
            </Link>
            <Link
              href={`/${store}/pages/pricing`}
              style={{ color: "#f6eddd", opacity: 0.85, fontSize: 14 }}
            >
              Pricing
            </Link>
            <Link
              href={`/${store}/pages/portfolio`}
              style={{ color: "#f6eddd", opacity: 0.85, fontSize: 14 }}
            >
              Portfolio
            </Link>
            <Link
              href={`/${store}/pages/contact`}
              style={{ color: "#f6eddd", opacity: 0.85, fontSize: 14 }}
            >
              Contact
            </Link>
            <Link
              href={`/${store}/pages/quote`}
              style={{
                color: "#202219",
                background: "#f6eddd",
                padding: "6px 16px",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Get a Quote
            </Link>
          </nav>
        ) : (
          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }} aria-label="Main">
            <Link href={`/${store}/collections/all`}>Shop</Link>
            <Link href={`/${store}/pages/contact`}>Contact</Link>
            <Link href={`/${store}/search`}>Search</Link>
            <Link href={`/${store}/cart`}>Cart</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
